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

    const sessions = await prisma.bargainSession.findMany({
      where: { buyerId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        material: {
          select: {
            id: true,
            title: true,
            price: true,
            city: true,
            condition: true,
            images: true,
            status: true,
          },
        },
        buyer: { select: { id: true, name: true } },
      },
    })

    // Also get the seller info for each material
    const materialIds = sessions.map((s) => s.materialId)
    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: {
        id: true,
        user: { select: { id: true, name: true, city: true, avatarUrl: true } },
      },
    })

    const sellerMap = new Map(materials.map((m) => [m.id, m.user]))

    return NextResponse.json(
      sessions.map((s) => ({
        sessionId: s.id,
        material: s.material,
        seller: sellerMap.get(s.materialId) || null,
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
    console.error("[Bargain Buyer] Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
