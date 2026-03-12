import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/reports/esg?user_id=X&start_date=Y&end_date=Z
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(req.url)

    const userId = searchParams.get('user_id') || session?.user?.id
    const startDateStr = searchParams.get('start_date')
    const endDateStr = searchParams.get('end_date')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const endDate = endDateStr ? new Date(endDateStr) : new Date()

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, orgName: true, city: true, role: true }
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Get all materials listed by user in date range
    const materials = await prisma.material.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate }
      },
      include: { category: true }
    })

    // Get completed transactions as supplier
    const supplierTxns = await prisma.transaction.findMany({
      where: {
        supplierId: userId,
        status: 'confirmed',
        completedAt: { gte: startDate, lte: endDate }
      },
      include: {
        material: { include: { category: true } },
        receiver: { select: { name: true, city: true, orgName: true } }
      }
    })

    // Get completed transactions as receiver
    const receiverTxns = await prisma.transaction.findMany({
      where: {
        receiverId: userId,
        status: 'confirmed',
        completedAt: { gte: startDate, lte: endDate }
      },
      include: {
        material: { include: { category: true } },
        supplier: { select: { name: true, city: true, orgName: true } }
      }
    })

    const allTxns = [...supplierTxns, ...receiverTxns]

    // Aggregate stats
    const totalMaterialsRedistributed = allTxns.length
    const totalKgDiverted = materials.reduce((acc, m) => acc + (m.weightKg || 0), 0)
    const totalCo2Saved = materials.reduce((acc, m) => acc + (m.co2SavedKg || 0), 0)
    const totalRupeesSaved = materials.reduce((acc, m) => acc + (m.rupeesSaved || 0), 0)

    // Water saved estimate (avg 100 L/kg for mixed materials)
    const waterSaved = materials.reduce((acc, m) =>
      acc + (m.weightKg || 0) * (m.category?.waterFactorLiters || 100), 0
    )

    // Communities impacted — distinct receiver cities
    const communitiesImpacted = [...new Set(
      supplierTxns.map(t => t.receiver?.city).filter(Boolean)
    )].length

    // Organizations served
    const orgsServed = [...new Set(
      supplierTxns.map(t => t.receiver?.orgName).filter(Boolean)
    )].length

    // Category breakdown
    const categoryMap = new Map<string, { name: string; count: number; kgDiverted: number; co2Saved: number; rupeesSaved: number }>()
    for (const m of materials) {
      const catName = m.category?.name || 'Unknown'
      const existing = categoryMap.get(catName)
      if (existing) {
        existing.count++
        existing.kgDiverted += m.weightKg || 0
        existing.co2Saved += m.co2SavedKg || 0
        existing.rupeesSaved += m.rupeesSaved || 0
      } else {
        categoryMap.set(catName, {
          name: catName,
          count: 1,
          kgDiverted: m.weightKg || 0,
          co2Saved: m.co2SavedKg || 0,
          rupeesSaved: m.rupeesSaved || 0
        })
      }
    }
    const categoryBreakdown = Array.from(categoryMap.values())

    // Monthly breakdown (last 12 months)
    const monthlyData: Record<string, { listings: number; transactions: number; co2Saved: number; kgDiverted: number }> = {}
    for (const m of materials) {
      const key = `${new Date(m.createdAt).getFullYear()}-${String(new Date(m.createdAt).getMonth() + 1).padStart(2, '0')}`
      if (!monthlyData[key]) monthlyData[key] = { listings: 0, transactions: 0, co2Saved: 0, kgDiverted: 0 }
      monthlyData[key].listings++
      monthlyData[key].co2Saved += m.co2SavedKg || 0
      monthlyData[key].kgDiverted += m.weightKg || 0
    }
    for (const t of allTxns) {
      if (!t.completedAt) continue
      const key = `${new Date(t.completedAt).getFullYear()}-${String(new Date(t.completedAt).getMonth() + 1).padStart(2, '0')}`
      if (!monthlyData[key]) monthlyData[key] = { listings: 0, transactions: 0, co2Saved: 0, kgDiverted: 0 }
      monthlyData[key].transactions++
    }
    const monthlyBreakdown = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }))

    // Equivalencies
    const treesEquivalent = Math.round(totalCo2Saved / 22)
    const householdsPowered = Math.round(totalCo2Saved / 500)
    const landfillAvoided = Math.round(totalKgDiverted / 1000 * 100) / 100 // tonnes

    // Scope 3 carbon data (simplified)
    const scope3CarbonData = {
      scope3_category_12: `${totalCo2Saved.toFixed(1)} kg CO₂e`,
      description: 'End-of-life treatment of sold products avoided through circular reuse',
      calculation_method: 'CPCB India emission factors, category-specific co2_factor_kg × weight_kg'
    }

    return NextResponse.json({
      reportPeriod: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      organization: {
        name: user.orgName || user.name,
        email: user.email,
        city: user.city,
        role: user.role
      },
      summary: {
        totalMaterialsRedistributed,
        totalKgDiverted: Math.round(totalKgDiverted * 10) / 10,
        totalCo2Saved: Math.round(totalCo2Saved * 10) / 10,
        totalRupeesSaved: Math.round(totalRupeesSaved),
        waterSaved: Math.round(waterSaved),
        communitiesImpacted,
        orgsServed,
        landfillAvoided
      },
      equivalencies: {
        treesEquivalent,
        householdsPowered,
        description: `Your circular economy impact equals planting ${treesEquivalent} trees and powering ${householdsPowered} Indian households for a month`
      },
      categoryBreakdown,
      monthlyBreakdown,
      scope3CarbonData,
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('[ESG Report]', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
