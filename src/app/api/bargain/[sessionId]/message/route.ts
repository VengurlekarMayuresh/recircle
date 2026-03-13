import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { runBargainAgent } from "@/lib/agents/bargain"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { sessionId } = await params
    const { message } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ message: "Message is required" }, { status: 400 })
    }

    // Verify permission: sender must be buyer or seller
    const bargainSession = await prisma.bargainSession.findUnique({
      where: { id: sessionId },
      include: { material: { select: { userId: true } } }
    })

    if (!bargainSession) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 })
    }

    const isBuyer = bargainSession.buyerId === session.user.id
    const isSeller = bargainSession.material.userId === session.user.id

    if (!isBuyer && !isSeller) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    if (bargainSession.status !== "active") {
      return NextResponse.json({
        message: "This negotiation has ended",
        status: bargainSession.status,
      }, { status: 400 })
    }

    const role = isBuyer ? "buyer" : "seller"

    // Save message
    await prisma.bargainMessage.create({
      data: {
        sessionId,
        role,
        content: message.trim(),
      },
    })

    // Update message count
    await prisma.bargainSession.update({
      where: { id: sessionId },
      data: { messageCount: { increment: 1 } },
    })

    // Skip AI agent if:
    // 1. Negotiation is human-only (direct chat)
    // 2. The sender is the seller (don't want bot to reply to seller's own message immediately)
    if (bargainSession.negotiationStyle === "human" || isSeller) {
      return NextResponse.json({
        reply: null,
        status: bargainSession.status,
        humanOnly: true
      })
    }

    // Run the AI bargain agent for buyers in AI-enabled sessions
    let aiResponse
    try {
      aiResponse = await runBargainAgent(message.trim(), sessionId)
    } catch (agentError: any) {
      console.error("[Bargain Agent] Failed:", agentError?.message || agentError)
      aiResponse = {
        message: "I'm having a moment — could you try sending your offer again? 🙏",
        currentOffer: null,
        status: "negotiating" as const,
        tactic: "concession",
      }
    }

    // Save AI response
    await prisma.bargainMessage.create({
      data: {
        sessionId,
        role: "assistant",
        content: JSON.stringify(aiResponse),
        metadata: JSON.stringify({
          currentOffer: aiResponse.currentOffer,
          tactic: aiResponse.tactic,
        }),
      },
    })

    // Update message count again
    await prisma.bargainSession.update({
      where: { id: sessionId },
      data: { messageCount: { increment: 1 } },
    })

    return NextResponse.json({
      reply: aiResponse.message,
      currentOffer: aiResponse.currentOffer,
      status: aiResponse.status,
      tactic: aiResponse.tactic,
    })
  } catch (error: any) {
    console.error("[Bargain Message] Error:", error)
    return NextResponse.json(
      { message: "Failed to process message", error: error.message },
      { status: 500 }
    )
  }
}
