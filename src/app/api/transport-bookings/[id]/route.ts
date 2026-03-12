import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const bookingId = parseInt(id)
    if (isNaN(bookingId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

    const body = await req.json()
    const { status, transporter_rating, actual_cost } = body

    const booking = await prisma.transportBooking.update({
      where: { id: bookingId },
      data: {
        status:             status ?? undefined,
        transporterRating:  transporter_rating ?? undefined,
        actualCost:         actual_cost ? parseFloat(actual_cost) : undefined,
      },
      include: { transaction: true, transporter: true },
    })

    // Sync transaction status if booking is delivered
    if (status === "delivered") {
      await prisma.transaction.update({
        where: { id: booking.transactionId },
        data: { status: "delivered" },
      }).catch(() => {})
    }
    if (status === "completed") {
      await prisma.transporter.update({
        where: { id: booking.transporterId },
        data: { totalDeliveries: { increment: 1 } },
      }).catch(() => {})
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error("[Transport Booking PUT]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
