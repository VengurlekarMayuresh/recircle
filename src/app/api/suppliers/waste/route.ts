import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const wasteStreams = await prisma.businessWasteStream.findMany({
      where: { status: "active" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            orgName: true,
            city: true,
            avatarUrl: true,
            role: true,
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
          }
        }
      },
      orderBy: { lastUpdated: "desc" }
    })

    return NextResponse.json({ wasteStreams })
  } catch (error: any) {
    console.error("[Suppliers Waste API] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
