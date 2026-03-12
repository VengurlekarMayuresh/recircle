import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { supplierId: session.user.id },
          { receiverId: session.user.id }
        ]
      },
      include: {
        material: { include: { category: true } },
        supplier: { select: { id: true, name: true, avatarUrl: true, city: true, trustScore: true } },
        receiver: { select: { id: true, name: true, avatarUrl: true, city: true, trustScore: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error("[Transactions GET]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
