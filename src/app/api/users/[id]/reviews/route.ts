import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const reviews = await prisma.review.findMany({
      where: { revieweeId: id },
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    return NextResponse.json(reviews)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
