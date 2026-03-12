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

    const userId = session.user.id

    // Get materials owned by user (for seller sessions)
    const ownedMaterials = await prisma.material.findMany({
      where: { userId },
      select: { id: true },
    })
    const ownedIds = ownedMaterials.map((m) => m.id)

    // Fetch all sessions where user is buyer OR seller
    const sessions = await prisma.bargainSession.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { materialId: { in: ownedIds } },
        ],
      },
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
            userId: true,
            user: { select: { id: true, name: true, avatarUrl: true, city: true } },
          },
        },
        buyer: { select: { id: true, name: true, avatarUrl: true, city: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
      },
    })

    const result = sessions.map((s) => {
      const isBuyer = s.buyerId === userId
      const isSeller = s.material.userId === userId
      const counterparty = isBuyer ? s.material.user : s.buyer

      // Extract last message preview
      let lastMessagePreview = ""
      let lastMessageTime = s.updatedAt
      if (s.messages.length > 0) {
        const last = s.messages[0]
        lastMessageTime = last.createdAt
        if (last.role === "assistant") {
          try {
            const parsed = JSON.parse(last.content)
            lastMessagePreview = parsed.message || last.content
          } catch {
            lastMessagePreview = last.content
          }
        } else {
          lastMessagePreview = last.content
        }
        // Truncate
        if (lastMessagePreview.length > 80) {
          lastMessagePreview = lastMessagePreview.slice(0, 80) + "…"
        }
      }

      const images = s.material.images?.split?.(",") || []

      return {
        sessionId: s.id,
        role: isBuyer ? "buyer" : "seller",
        isBuyer,
        isSeller,
        status: s.status,
        material: {
          id: s.material.id,
          title: s.material.title,
          price: s.material.price,
          city: s.material.city,
          condition: s.material.condition,
          image: images[0] || null,
          materialStatus: s.material.status,
        },
        counterparty: {
          id: counterparty.id,
          name: counterparty.name,
          avatarUrl: counterparty.avatarUrl,
          city: counterparty.city,
        },
        askingPrice: s.askingPrice,
        agreedPrice: s.agreedPrice,
        messageCount: s.messageCount,
        lastMessage: lastMessagePreview,
        lastMessageTime,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[Bargain Sessions] Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
