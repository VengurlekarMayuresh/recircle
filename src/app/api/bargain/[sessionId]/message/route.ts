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

    // Verify the session belongs to this buyer
    const bargainSession = await prisma.bargainSession.findUnique({
      where: { id: sessionId },
    })

    if (!bargainSession) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 })
    }

    if (bargainSession.buyerId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    if (bargainSession.status !== "active") {
      return NextResponse.json({
        message: "This negotiation has ended",
        status: bargainSession.status,
      }, { status: 400 })
    }

    // Save buyer's message
    await prisma.bargainMessage.create({
      data: {
        sessionId,
        role: "buyer",
        content: message.trim(),
      },
    })

    // Update message count
    await prisma.bargainSession.update({
      where: { id: sessionId },
      data: { messageCount: { increment: 1 } },
    })

    // Run the AI bargain agent
    const aiResponse = await runBargainAgent(message.trim(), sessionId)

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

    // Update message count again (for assistant message)
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
