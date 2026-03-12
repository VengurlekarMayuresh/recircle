import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const SEASONS: Record<number, string> = {
  1: "Off-Season", 2: "Off-Season", 3: "Pre-Monsoon",
  4: "Pre-Monsoon", 5: "Pre-Monsoon", 6: "Monsoon",
  7: "Monsoon", 8: "Monsoon", 9: "Post-Monsoon",
  10: "Building Season", 11: "Building Season", 12: "Festive Season",
}

export async function GET(req: Request) {
  try {
  const { searchParams } = new URL(req.url)
  const city     = searchParams.get("city") || ""
  const catSlug  = searchParams.get("category") || ""

  const categories = await prisma.category.findMany({
    where: catSlug ? { slug: catSlug } : undefined,
    select: { id: true, name: true, slug: true, peakMonths: true },
  })

  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()

  // Build 9-month window: 6 past + current + 2 future
  const months: { month: number; year: number }[] = []
  for (let i = -6; i <= 2; i++) {
    let m = month + i
    let y = year
    while (m <= 0) { m += 12; y -= 1 }
    while (m > 12) { m -= 12; y += 1 }
    months.push({ month: m, year: y })
  }

  const result = await Promise.all(categories.map(async (cat) => {
    const history = await prisma.demandHistory.findMany({
      where: {
        categoryId: cat.id,
        ...(city ? { city } : {}),
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    })

    const peakMonths = cat.peakMonths
      ? cat.peakMonths.split(",").map(Number)
      : []

    const dataPoints = months.map(({ month: m, year: y }) => {
      const isFuture = y > year || (y === year && m > month)
      const existing = history.find(h => h.month === m && h.year === y)

      // For future months, generate prediction based on peak months
      let predicted = 0
      if (isFuture) {
        const avgActual = history.length > 0
          ? history.reduce((s, h) => s + h.listingCount, 0) / history.length
          : 10
        const peakBoost = peakMonths.includes(m) ? 1.4 : 0.85
        predicted = Math.round(avgActual * peakBoost)
      }

      return {
        month: m,
        year: y,
        label: `${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m]} ${y}`,
        actual:    isFuture ? null : (existing?.listingCount ?? 0),
        predicted: isFuture ? predicted : null,
        season:    SEASONS[m] || "Normal",
        isPeak:    peakMonths.includes(m),
      }
    })

    // Trend: compare last 3 months vs 3 months before that
    const recentActual  = dataPoints.filter(d => d.actual !== null).slice(-3)
    const prevActual    = dataPoints.filter(d => d.actual !== null).slice(-6, -3)
    const recentAvg     = recentActual.length ? recentActual.reduce((s, d) => s + (d.actual ?? 0), 0) / recentActual.length : 0
    const prevAvg       = prevActual.length   ? prevActual.reduce((s, d)   => s + (d.actual ?? 0), 0) / prevActual.length   : recentAvg

    const changePct = prevAvg > 0 ? Math.round(((recentAvg - prevAvg) / prevAvg) * 100) : 0
    const trend     = changePct > 5 ? "rising" : changePct < -5 ? "falling" : "stable"
    const bestMonth = dataPoints.find(d => d.isPeak && d.predicted !== null) || dataPoints[dataPoints.length - 1]

    return {
      category:    cat,
      dataPoints,
      trend,
      changePct,
      currentSeason: SEASONS[month],
      bestListingMonth: bestMonth?.label || "",
    }
  }))

  return NextResponse.json({ city, month, year, data: result })
  } catch (error) {
    console.error("[Forecast GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
