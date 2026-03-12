import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        material: { include: { category: true } },
        supplier: { select: { id: true, name: true, avatarUrl: true, city: true, trustScore: true, avgRating: true, verificationLevel: true } },
        receiver: { select: { id: true, name: true, avatarUrl: true, city: true, trustScore: true, avgRating: true, verificationLevel: true } },
        messages: { include: { sender: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } },
        reviews: { include: { reviewer: { select: { id: true, name: true, avatarUrl: true } } } },
        transportBooking: { include: { transporter: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } } }
      }
    })

    if (!transaction) return NextResponse.json({ message: "Not found" }, { status: 404 })
    if (transaction.supplierId !== session.user.id && transaction.receiverId !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error("[Transaction GET]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(
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
    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...body,
        ...(body.status === "confirmed" ? { completedAt: new Date() } : {})
      }
    })

    // Notify the other party of status change
    const notifyUserId = session.user.id === transaction.supplierId ? transaction.receiverId : transaction.supplierId
    await prisma.notification.create({
      data: {
        userId: notifyUserId,
        type: "transaction_update",
        title: "Transaction Updated",
        body: `Transaction status changed to: ${body.status || "updated"}`,
        data: JSON.stringify({ transactionId: id })
      }
    }).catch(() => {})

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
