import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const agentName = searchParams.get("agent")
    const limit     = parseInt(searchParams.get("limit") || "20")
    const isAdmin   = (session.user as any).role === "admin"

    const where: any = {}
    if (!isAdmin) where.userId = (session.user as any).id
    if (agentName) where.agentName = agentName

    const logs = await prisma.agentLog.findMany({
      where,
      include: {
        material: { select: { id: true, title: true } },
        user:     { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return NextResponse.json(logs)
  } catch (error) {
    console.error("[Agent Logs GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
