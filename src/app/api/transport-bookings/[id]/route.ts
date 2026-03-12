import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { calculateVolunteerDeliveryPoints } from "@/lib/green-points"

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

          await prisma.user.update({
            where: { id: transporter.userId },
            data: { greenPoints: { increment: points } },
          })

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
