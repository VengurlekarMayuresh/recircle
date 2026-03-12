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
        material: { select: { id: true, title: true, price: true, address: true } },
        buyer: { select: { id: true, name: true, avatarUrl: true, city: true, phone: true, address: true } },
      },
    })

    // Get transactions for agreed sessions so seller can message the buyer
    const agreedMaterialIds = sessions.filter(s => s.status === "agreed").map(s => s.materialId)
    const transactions = agreedMaterialIds.length > 0 ? await prisma.transaction.findMany({
      where: { materialId: { in: agreedMaterialIds }, supplierId: session.user.id },
      select: { id: true, materialId: true, status: true, pickupAddress: true },
    }) : []
    const txnMap = new Map(transactions.map(t => [t.materialId, t]))

    return NextResponse.json(
      sessions.map((s) => {
        const txn = txnMap.get(s.materialId) || null
        return {
          sessionId: s.id,
          material: s.material,
          // Only expose buyer phone/address for agreed deals
          buyer: s.status === "agreed"
            ? s.buyer
            : { id: s.buyer.id, name: s.buyer.name, avatarUrl: s.buyer.avatarUrl, city: s.buyer.city },
          transaction: txn ? { id: txn.id, status: txn.status, pickupAddress: txn.pickupAddress } : null,
          status: s.status,
          askingPrice: s.askingPrice,
          agreedPrice: s.agreedPrice,
          messageCount: s.messageCount,
          discount: s.agreedPrice
            ? Math.round(((s.askingPrice - s.agreedPrice) / s.askingPrice) * 100)
            : null,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }
      })
    )
  } catch (error: any) {
    console.error("[Bargain Seller] Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
