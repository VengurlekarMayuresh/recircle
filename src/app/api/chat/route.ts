import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { runAdvisorAgent } from "@/lib/agents/advisor"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id ?? "anonymous"

    const { message } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Load recent chat history (last 10 messages)
    let history: { role: "user" | "assistant"; content: string }[] = []
    if (userId !== "anonymous") {
      const dbHistory = await prisma.chatHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      history = dbHistory.reverse().map(h => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      }))
    }

    const { reply, toolsUsed } = await runAdvisorAgent(message, userId, history)

    return NextResponse.json({ reply, tools_used: toolsUsed })
  } catch (err) {
    console.error("Chat API error:", err)
    return NextResponse.json(
      { error: "Failed to process message. Please try again." },
      { status: 500 }
    )
  }
}
