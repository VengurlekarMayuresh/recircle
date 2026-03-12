import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Get all materials owned by this seller
    const sellerMaterials = await prisma.material.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    })

    const materialIds = sellerMaterials.map((m) => m.id)

    if (materialIds.length === 0) {
      return NextResponse.json([])
    }

    // Get all bargain sessions for these materials
    const sessions = await prisma.bargainSession.findMany({
      where: { materialId: { in: materialIds } },
      orderBy: { updatedAt: "desc" },
      include: {
        material: { select: { id: true, title: true, price: true } },
        buyer: { select: { id: true, name: true, avatarUrl: true, city: true } },
      },
    })

    return NextResponse.json(
      sessions.map((s) => ({
        sessionId: s.id,
        material: s.material,
        buyer: s.buyer,
        status: s.status,
        askingPrice: s.askingPrice,
        agreedPrice: s.agreedPrice,
        messageCount: s.messageCount,
        discount: s.agreedPrice
          ? Math.round(((s.askingPrice - s.agreedPrice) / s.askingPrice) * 100)
          : null,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }))
    )
  } catch (error: any) {
    console.error("[Bargain Seller] Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
