import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

/**
 * POST /api/volunteer/upload-proof/[bookingId]
 *
 * Volunteer uploads pickup or delivery proof photo.
 * Body: { type: "pickup" | "delivery", photoUrl: string }
 *
 * The photo is uploaded via /api/upload first, then the URL is passed here.
 * On pickup photo: advances status to "collected"
 * On delivery photo: advances status to "delivered" and notifies receiver to confirm.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { bookingId } = await params
    const id = parseInt(bookingId)
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

    const body = await req.json()
    const { type, photoUrl } = body

    if (!["pickup", "delivery"].includes(type)) {
      return NextResponse.json({ error: "type must be 'pickup' or 'delivery'" }, { status: 400 })
    }
    if (!photoUrl) {
      return NextResponse.json({ error: "photoUrl is required" }, { status: 400 })
    }

    // Verify volunteer
    const booking = await prisma.transportBooking.findUnique({
      where: { id },
      include: {
        transporter: true,
        transaction: {
          include: {
            material: { select: { title: true } },
          },
        },
      },
    })

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    if (booking.transporter.userId !== session.user.id) {
      return NextResponse.json({ error: "Only the assigned volunteer can upload proof" }, { status: 403 })
    }

    if (type === "pickup") {
      // Validate status: must be accepted or pickup_scheduled
      if (!["accepted", "pickup_scheduled"].includes(booking.status)) {
        return NextResponse.json({ error: "Cannot upload pickup proof in current status" }, { status: 400 })
      }

      await prisma.transportBooking.update({
        where: { id },
        data: {
          pickupPhotoUrl: photoUrl,
          status: "collected",
        },
      })

      // Notify receiver: item has been picked up
      await prisma.notification.create({
        data: {
          userId: booking.transaction.receiverId,
          type: "delivery_collected",
          title: "Your item has been picked up! 📦",
          body: `Volunteer collected "${booking.transaction.material.title}". Delivery is on the way!`,
          data: JSON.stringify({ bookingId: id, transactionId: booking.transactionId }),
        },
      }).catch(() => {})

      // Also notify supplier
      await prisma.notification.create({
        data: {
          userId: booking.transaction.supplierId,
          type: "delivery_collected",
          title: "Item picked up by volunteer ✅",
          body: `"${booking.transaction.material.title}" has been collected by the volunteer.`,
          data: JSON.stringify({ bookingId: id, transactionId: booking.transactionId }),
        },
      }).catch(() => {})

      return NextResponse.json({ message: "Pickup proof uploaded, status: collected" })
    }

    // Delivery proof
    if (!["collected", "in_transit"].includes(booking.status)) {
      return NextResponse.json({ error: "Cannot upload delivery proof in current status" }, { status: 400 })
    }

    await prisma.transportBooking.update({
      where: { id },
      data: {
        deliveryPhotoUrl: photoUrl,
        status: "delivered",
      },
    })

    // Sync transaction status
    await prisma.transaction.update({
      where: { id: booking.transactionId },
      data: { status: "delivered" },
    }).catch(() => {})

    // Notify receiver to confirm delivery
    await prisma.notification.create({
      data: {
        userId: booking.transaction.receiverId,
        type: "delivery_arrived",
        title: "Your item has been delivered! 🎉",
        body: `"${booking.transaction.material.title}" has arrived. Please confirm delivery.`,
        data: JSON.stringify({ bookingId: id, transactionId: booking.transactionId }),
      },
    }).catch(() => {})

    return NextResponse.json({ message: "Delivery proof uploaded, status: delivered. Awaiting receiver confirmation." })
  } catch (error) {
    console.error("[Volunteer Upload Proof POST]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
