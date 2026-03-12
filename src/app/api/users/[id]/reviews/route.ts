import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviews = await prisma.review.findMany({
      where: { reviewee_id: params.id },
      include: {
        reviewer: { select: { id: true, name: true, avatar_url: true, role: true } },
      },
      orderBy: { created_at: "desc" },
      take: 20,
    })
    return NextResponse.json(reviews)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
