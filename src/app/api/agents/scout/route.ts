import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { materialId } = await req.json()

    if (!materialId) {
      return NextResponse.json({ message: "Missing materialId" }, { status: 400 })
    }

    // 1. Fetch material
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: { category: true }
    })

    if (!material) {
      return NextResponse.json({ message: "Material not found" }, { status: 404 })
    }

    // 2. Mock Agent Log
    await prisma.agentLog.create({
      data: {
        agentName: "scout",
        materialId: material.id,
        action: "SCANNING_MARKETPLACE",
        details: `Scanned material ${material.title}. Searching for matches in ${material.city}.`,
      }
    })

    // 3. Simple matching logic (Mock)
    // In a real app, this would query WantRequest table
    const potentialMatches = await prisma.user.findMany({
      where: {
        city: material.city,
        role: { in: ["ngo", "business"] },
        id: { not: material.userId }
      },
      take: 3
    })

    const matches = []
    for (const match of potentialMatches) {
      const createdMatch = await prisma.match.create({
        data: {
          materialId: material.id,
          userId: match.id,
          score: 85 + Math.random() * 10,
          status: "pending",
          reason: `Potential match in ${material.city} for ${material.category.name}`,
        }
      })
      matches.push(createdMatch)

      // Log the match success
      await prisma.agentLog.create({
        data: {
          agentName: "scout",
          materialId: material.id,
          action: "MATCH_FOUND",
          details: `Found potential match with ${match.orgName || match.name}. Match Score: ${createdMatch.score.toFixed(1)}%`,
        }
      })
    }

    return NextResponse.json({ 
      message: "Scout AI processing complete", 
      matchCount: matches.length,
      matches: matches
    })

  } catch (error: any) {
    console.error("Scout Agent Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
