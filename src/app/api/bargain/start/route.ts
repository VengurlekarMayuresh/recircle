import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { generateOpeningMessage } from "@/lib/agents/bargain"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { materialId } = await req.json()
    if (!materialId) {
      return NextResponse.json({ message: "materialId is required" }, { status: 400 })
    }

    // Fetch material with seller info
    const material = await prisma.material.findUnique({
      where: { id: parseInt(materialId) },
      include: { user: { select: { id: true, name: true } } },
    })

    if (!material) {
      return NextResponse.json({ message: "Material not found" }, { status: 404 })
    }

    if (!material.bargainEnabled) {
      return NextResponse.json({ message: "Bargaining is not enabled for this listing" }, { status: 400 })
    }

    if (material.userId === session.user.id) {
      return NextResponse.json({ message: "You cannot bargain on your own listing" }, { status: 400 })
    }

    if (material.listingType !== "sell" || material.price <= 0) {
      return NextResponse.json({ message: "Bargaining is only available for sell listings with a price" }, { status: 400 })
    }

    // Check for existing active session
    const existingSession = await prisma.bargainSession.findFirst({
      where: {
        materialId: material.id,
        buyerId: session.user.id,
        status: "active",
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    })

    if (existingSession) {
      // Resume existing session
      return NextResponse.json({
        sessionId: existingSession.id,
        messages: existingSession.messages.map((m) => ({
          role: m.role,
          content: m.role === "assistant" ? (() => { try { return JSON.parse(m.content).message } catch { return m.content } })() : m.content,
          metadata: m.metadata ? JSON.parse(m.metadata) : null,
          createdAt: m.createdAt,
        })),
        status: existingSession.status,
        askingPrice: existingSession.askingPrice,
        resumed: true,
      })
    }

    // Create new session
    const floorPrice = material.floorPrice ?? material.price * 0.7 // Default floor = 70% of asking

    const bargainSession = await prisma.bargainSession.create({
      data: {
        materialId: material.id,
        buyerId: session.user.id,
        askingPrice: material.price,
        floorPrice,
        negotiationStyle: material.negotiationStyle || "moderate",
        status: "active",
        messageCount: 1,
      },
    })

    // Generate opening message
    const opening = await generateOpeningMessage({
      title: material.title,
      sellerName: material.user.name,
      askingPrice: material.price,
      condition: material.condition,
    })

    // Save opening message
    await prisma.bargainMessage.create({
      data: {
        sessionId: bargainSession.id,
        role: "assistant",
        content: JSON.stringify(opening),
        metadata: JSON.stringify({
          currentOffer: opening.currentOffer,
          tactic: opening.tactic,
        }),
      },
    })

    return NextResponse.json({
      sessionId: bargainSession.id,
      messages: [
        {
          role: "assistant",
          content: opening.message,
          metadata: { currentOffer: opening.currentOffer, tactic: opening.tactic },
          createdAt: new Date(),
        },
      ],
      status: "active",
      askingPrice: material.price,
      resumed: false,
    }, { status: 201 })
  } catch (error: any) {
    console.error("[Bargain Start] Error:", error)
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 })
  }
}
