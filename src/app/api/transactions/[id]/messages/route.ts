import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const transaction = await prisma.transaction.findUnique({ where: { id } })
    if (!transaction) return NextResponse.json({ message: "Not found" }, { status: 404 })
    if (transaction.supplierId !== session.user.id && transaction.receiverId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { content, imageUrl } = body

    if (!content?.trim()) return NextResponse.json({ message: "Message content required" }, { status: 400 })

    const message = await prisma.message.create({
      data: {
        transactionId: id,
        senderId: session.user.id,
        content: content.trim(),
        imageUrl: imageUrl || null
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } }
      }
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
