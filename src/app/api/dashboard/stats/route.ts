import { NextRequest, NextResponse } from "next/server"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import prisma from "@/lib/prisma"

/** Retry helper for Neon cold-start connection errors (P1001 / P1002) */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1500): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const isConnErr =
        err instanceof PrismaClientKnownRequestError &&
        (err.code === "P1001" || err.code === "P1002")
      if (isConnErr && attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs * attempt))
        continue
      }
      throw err
    }
  }
  throw new Error("unreachable")
}

export async function GET(_req: NextRequest) {
  try {
    const [
      totalMaterials,
      totalTransactions,
      impactAgg,
      categoryBreakdown,
      recentAgentLogs,
      weeklyUsers,
      weeklyListings,
      // New queries
      cityBreakdown,
      reuseMultipleCount,
      totalReuseCount,
      materialsWithCategories,
      topSuppliers,
      topReceivers,
    ] = await withRetry(() => Promise.all([
      prisma.material.count(),
      prisma.transaction.count({ where: { status: "confirmed" } }),
      prisma.material.aggregate({ _sum: { co2SavedKg: true, rupeesSaved: true, weightKg: true } }),
      prisma.material.groupBy({
        by: ["categoryId"],
        _count: { id: true },
        _sum: { co2SavedKg: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
      prisma.agentLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } }, material: { select: { title: true } } },
      }),
      // Users in last 7 days
      prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      // Listings in last 7 days
      prisma.material.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      // City participation: listings per city
      prisma.material.groupBy({
        by: ["city"],
        _count: { id: true },
        _sum: { co2SavedKg: true, weightKg: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      // Reuse tracking: materials reused 2+ times
      prisma.material.count({ where: { reuseCount: { gte: 2 } } }),
      // Total redistribution cycles across all materials
      prisma.material.aggregate({ _sum: { reuseCount: true } }),
      // Materials with categories for water saved calc
      prisma.material.findMany({
        where: { categoryId: { not: null } },
        select: { weightKg: true, category: { select: { waterFactorLiters: true, landfillCostInrPerTonne: true } } },
      }),
      // Top 5 suppliers by confirmed transactions
      prisma.transaction.groupBy({
        by: ["supplierId"],
        where: { status: "confirmed" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      // Top 5 receivers by confirmed transactions
      prisma.transaction.groupBy({
        by: ["receiverId"],
        where: { status: "confirmed" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      take: 5,
      }),
    ]))

    // Get category names
    const categories = await prisma.category.findMany({ select: { id: true, name: true } })
    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

    // Compute water saved & landfill cost saved from materials+categories
    let waterSavedLiters = 0
    let landfillCostSaved = 0
    for (const m of materialsWithCategories) {
      const weight = m.weightKg ?? 0
      if (m.category) {
        waterSavedLiters += weight * m.category.waterFactorLiters
        landfillCostSaved += (weight / 1000) * m.category.landfillCostInrPerTonne
      }
    }

    // Transactions per city (through material relation)
    const cityTransactions = await prisma.transaction.findMany({
      where: { status: "confirmed" },
      select: { material: { select: { city: true } } },
    })
    const cityTxMap: Record<string, number> = {}
    for (const tx of cityTransactions) {
      const city = tx.material.city
      cityTxMap[city] = (cityTxMap[city] || 0) + 1
    }

    // Merge city listings + transactions
    const cityData = cityBreakdown.map(c => ({
      city: c.city,
      listings: c._count.id,
      transactions: cityTxMap[c.city] || 0,
      co2Saved: Math.round(c._sum.co2SavedKg ?? 0),
      kgDiverted: Math.round(c._sum.weightKg ?? 0),
    }))

    // Resolve supplier/receiver names for leaderboard
    const supplierIds = topSuppliers.map(s => s.supplierId)
    const receiverIds = topReceivers.map(r => r.receiverId)
    const allUserIds = [...new Set([...supplierIds, ...receiverIds])]
    const leaderboardUsers = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, name: true, city: true, role: true },
    })
    const userMap = Object.fromEntries(leaderboardUsers.map(u => [u.id, u]))

    const topSuppliersData = topSuppliers.map(s => ({
      name: userMap[s.supplierId]?.name || "Unknown",
      city: userMap[s.supplierId]?.city || "Unknown",
      role: userMap[s.supplierId]?.role || "individual",
      count: s._count.id,
    }))
    const topReceiversData = topReceivers.map(r => ({
      name: userMap[r.receiverId]?.name || "Unknown",
      city: userMap[r.receiverId]?.city || "Unknown",
      role: userMap[r.receiverId]?.role || "individual",
      count: r._count.id,
    }))

    // Monthly trend data (last 6 months)
    const months: { month: string; materials: number; transactions: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const start = new Date(date.getFullYear(), date.getMonth(), 1)
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

      const [mCount, tCount] = await Promise.all([
        prisma.material.count({ where: { createdAt: { gte: start, lte: end } } }),
        prisma.transaction.count({ where: { createdAt: { gte: start, lte: end } } }),
      ])

      months.push({
        month: start.toLocaleString("en-IN", { month: "short", year: "2-digit" }),
        materials: mCount,
        transactions: tCount,
      })
    }

    // Sankey data: sources, categories, destinations
    const [sankeySources, sankeyCategories, sankeyDestinations] = await Promise.all([
      // Sources: group materials by user role
      prisma.material.findMany({
        select: { user: { select: { role: true } }, aiRouteRecommendation: true, categoryId: true }
      }),
      prisma.category.findMany({ select: { id: true, name: true } }),
      prisma.material.groupBy({
        by: ['aiRouteRecommendation'],
        _count: { id: true }
      })
    ])

    const sourceMap: Record<string, number> = {}
    for (const m of sankeySources) {
      const role = m.user.role
      const key = role === 'business' ? 'Businesses' : role === 'ngo' ? 'NGOs' : 'Individuals'
      sourceMap[key] = (sourceMap[key] || 0) + 1
    }

    const catCountMap: Record<number, number> = {}
    for (const m of sankeySources) {
      if (m.categoryId) catCountMap[m.categoryId] = (catCountMap[m.categoryId] || 0) + 1
    }

    const catIdMap: Record<number, string> = Object.fromEntries(sankeyCategories.map(c => [c.id, c.name]))
    const sankeyData = {
      sources: Object.entries(sourceMap).map(([name, count]) => ({ name, count, role: name.toLowerCase() })),
      categories: Object.entries(catCountMap)
        .map(([id, count]) => ({ name: catIdMap[parseInt(id)] || 'Unknown', count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      destinations: [
        { name: 'Reuse',    count: sankeySources.filter(m => m.aiRouteRecommendation === 'reuse').length },
        { name: 'Repair',   count: sankeySources.filter(m => m.aiRouteRecommendation === 'repair').length },
        { name: 'Recycle',  count: sankeySources.filter(m => m.aiRouteRecommendation === 'recycle').length },
        { name: 'Dispose',  count: sankeySources.filter(m => m.aiRouteRecommendation === 'dispose').length },
      ]
    }

    return NextResponse.json({
      total_materials: totalMaterials,
      total_transactions: totalTransactions,
      kg_diverted: Math.round(impactAgg._sum.weightKg ?? 0),
      co2_saved: Math.round(impactAgg._sum.co2SavedKg ?? 0),
      rupees_saved: Math.round(impactAgg._sum.rupeesSaved ?? 0),
      water_saved_liters: Math.round(waterSavedLiters),
      landfill_cost_saved: Math.round(landfillCostSaved),
      reuse_multiple_count: reuseMultipleCount,
      total_reuse_cycles: totalReuseCount._sum.reuseCount ?? 0,
      city_participation: cityData,
      top_suppliers: topSuppliersData,
      top_receivers: topReceiversData,
      category_breakdown: categoryBreakdown.map(c => ({
        name: catMap[c.categoryId ?? 0] || "Unknown",
        count: c._count.id,
        co2: Math.round(c._sum.co2SavedKg ?? 0),
      })),
      monthly_trend: months,
      agent_logs: recentAgentLogs.map(l => ({
        id: l.id,
        agent: l.agentName,
        action: l.action,
        material: l.material?.title,
        user: l.user?.name,
        created_at: l.createdAt,
        details: l.details,
      })),
      weekly_new_users: weeklyUsers,
      weekly_new_listings: weeklyListings,
      sankey_data: sankeyData,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
