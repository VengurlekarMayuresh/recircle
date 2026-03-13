import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { sessionId } = await params

    const bargainSession = await prisma.bargainSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        material: {
          select: {
            id: true, title: true, price: true, userId: true,
            city: true, condition: true, images: true, status: true,
            user: { select: { id: true, name: true, avatarUrl: true, city: true } },
          },
        },
        buyer: { select: { id: true, name: true, avatarUrl: true, city: true } },
      },
    })

    if (!bargainSession) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 })
    }

    // Allow access for buyer or seller
    const isBuyer = bargainSession.buyerId === session.user.id
    const isSeller = bargainSession.material.userId === session.user.id
    if (!isBuyer && !isSeller) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const counterparty = isBuyer ? bargainSession.material.user : bargainSession.buyer
    const images = bargainSession.material.images?.split?.(",") || []

    return NextResponse.json({
      sessionId: bargainSession.id,
      materialId: bargainSession.materialId,
      isBuyer,
      isSeller,
      status: bargainSession.status,
      askingPrice: bargainSession.askingPrice,
      agreedPrice: bargainSession.agreedPrice,
      messageCount: bargainSession.messageCount,
      createdAt: bargainSession.createdAt,
      material: {
        id: bargainSession.material.id,
        title: bargainSession.material.title,
        price: bargainSession.material.price,
        city: bargainSession.material.city,
        condition: bargainSession.material.condition,
        image: images[0] || null,
        materialStatus: bargainSession.material.status,
      },
      counterparty,
      sellerName: bargainSession.material.user.name,
      negotiationStyle: bargainSession.negotiationStyle,
      messages: bargainSession.messages.map((m) => ({
        role: m.role,
        content: m.role === "assistant"
          ? (() => { try { return JSON.parse(m.content).message } catch { return m.content } })()
          : m.content,
        metadata: m.metadata ? JSON.parse(m.metadata) : null,
        createdAt: m.createdAt,
      })),
    })
  } catch (error: any) {
    console.error("[Bargain Get] Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
