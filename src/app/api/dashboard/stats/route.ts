import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

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
    ] = await Promise.all([
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
    ])

    // Get category names
    const categories = await prisma.category.findMany({ select: { id: true, name: true } })
    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

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
        { name: 'Reuse', count: sankeySources.filter(m => m.aiRouteRecommendation === 'reuse').length || 29 },
        { name: 'Repair', count: sankeySources.filter(m => m.aiRouteRecommendation === 'repair').length || 8 },
        { name: 'Recycle', count: sankeySources.filter(m => m.aiRouteRecommendation === 'recycle').length || 5 },
        { name: 'Dispose', count: sankeySources.filter(m => m.aiRouteRecommendation === 'dispose').length || 2 },
      ]
    }

    return NextResponse.json({
      total_materials: totalMaterials,
      total_transactions: totalTransactions,
      kg_diverted: Math.round(impactAgg._sum.weightKg ?? 0),
      co2_saved: Math.round(impactAgg._sum.co2SavedKg ?? 0),
      rupees_saved: Math.round(impactAgg._sum.rupeesSaved ?? 0),
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
