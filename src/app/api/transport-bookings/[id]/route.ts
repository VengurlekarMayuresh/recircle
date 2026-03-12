import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { calculateVolunteerDeliveryPoints, getLevelFromPoints } from "@/lib/green-points"

// Valid status transitions to prevent arbitrary jumps
const VALID_TRANSITIONS: Record<string, string[]> = {
  requested: ["accepted", "cancelled"],
  pending_approval: ["cancelled"], // accepted handled by /volunteer/confirm
  accepted: ["pickup_scheduled", "collected", "cancelled"],
  pickup_scheduled: ["collected", "cancelled"],
  collected: ["in_transit", "delivered", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: ["completed", "cancelled"],
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userId = session.user.id
    const { id } = await params
    const bookingId = parseInt(id)
    if (isNaN(bookingId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

    // Fetch booking first for authorization + validation
    const existing = await prisma.transportBooking.findUnique({
      where: { id: bookingId },
      include: { transporter: true, transaction: true },
    })
    if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

    // Authorization: only supplier, receiver, or assigned transporter can update
    const isTransporter = existing.transporter.userId === userId
    const isReceiver = existing.receiverId === userId
    const isSupplier = existing.transaction.supplierId === userId
    if (!isTransporter && !isReceiver && !isSupplier) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { status, transporter_rating, actual_cost } = body

    // Validate status transition
    if (status) {
      const allowed = VALID_TRANSITIONS[existing.status]
      if (!allowed || !allowed.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from '${existing.status}' to '${status}'` },
          { status: 400 }
        )
      }
      // Only receiver can mark as completed
      if (status === "completed" && !isReceiver) {
        return NextResponse.json({ error: "Only the receiver can confirm delivery" }, { status: 403 })
      }
    }

    // Handle volunteer cancellation: delete booking so delivery returns to pool
    if (status === "cancelled" && existing.transporter.isVolunteer) {
      await prisma.transportBooking.delete({ where: { id: bookingId } })

      // Notify both parties
      await Promise.all([
        prisma.notification.create({
          data: {
            userId: existing.transaction.supplierId,
            type: "volunteer_cancelled",
            title: "Volunteer delivery cancelled",
            body: "The volunteer has cancelled. The delivery is back in the available pool.",
            data: JSON.stringify({ transactionId: existing.transactionId }),
          },
        }),
        prisma.notification.create({
          data: {
            userId: existing.transaction.receiverId,
            type: "volunteer_cancelled",
            title: "Volunteer delivery cancelled",
            body: "The volunteer has cancelled. The delivery is back in the available pool.",
            data: JSON.stringify({ transactionId: existing.transactionId }),
          },
        }),
      ]).catch(() => {})

      return NextResponse.json({ message: "Booking cancelled, delivery returned to available pool" })
    }

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
      // Sync transaction to confirmed + set completedAt
      await prisma.transaction.update({
        where: { id: booking.transactionId },
        data: { status: "confirmed", completedAt: new Date() },
      }).catch(() => {})

      // Increment delivery count
      await prisma.transporter.update({
        where: { id: booking.transporterId },
        data: { totalDeliveries: { increment: 1 } },
      }).catch(() => {})

      // Award green points to volunteer
      const transporter = booking.transporter
      if (transporter?.isVolunteer) {
        try {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          const recentCount = await prisma.transportBooking.count({
            where: {
              transporterId: transporter.id,
              status: "completed",
              updatedAt: { gte: sevenDaysAgo },
            },
          })

          const fullBooking = await prisma.transportBooking.findUnique({
            where: { id: bookingId },
            include: { transaction: { include: { material: true } } },
          })

          const points = calculateVolunteerDeliveryPoints(
            {
              distanceKm: fullBooking?.distanceKm ?? 0,
              weightKg: fullBooking?.transaction?.material?.weightKg,
              rating: booking.transporterRating,
            },
            recentCount
          )

          // Award points + update level atomically
          const updatedUser = await prisma.user.update({
            where: { id: transporter.userId },
            data: { greenPoints: { increment: points } },
          })
          const newLevel = getLevelFromPoints(updatedUser.greenPoints)
          if (newLevel !== updatedUser.level) {
            await prisma.user.update({
              where: { id: transporter.userId },
              data: { level: newLevel },
            })
          }

          // Notify volunteer of points earned
          await prisma.notification.create({
            data: {
              userId: transporter.userId,
              type: "green_points_earned",
              title: `+${points} Green Points earned! 🌱`,
              body: `You earned ${points} GP for completing a delivery. Keep going!`,
              data: JSON.stringify({ points, bookingId }),
            },
          }).catch(() => {})
        } catch (e) {
          console.error("[Green Points Award]", e)
        }
      }
    }

    return NextResponse.json(booking)
  } catch (error) {
    console.error("[Transport Booking PUT]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
