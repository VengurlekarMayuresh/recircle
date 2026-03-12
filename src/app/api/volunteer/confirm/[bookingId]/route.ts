import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

/**
 * PUT /api/volunteer/confirm/[bookingId]
 *
 * Receiver or Supplier confirms the volunteer.
 * Body: { action: "confirm" | "reject" }
 *
 * When BOTH confirm → status moves to "accepted" and all parties
 * get each other's contact info via notification.
 */
export async function PUT(
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
    if (isNaN(id)) return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 })

    const userId = session.user.id
    const body = await req.json()
    const { action } = body // "confirm" | "reject"

    if (!["confirm", "reject"].includes(action)) {
      return NextResponse.json({ error: "action must be 'confirm' or 'reject'" }, { status: 400 })
    }

    // Fetch booking with transaction details
    const booking = await prisma.transportBooking.findUnique({
      where: { id },
      include: {
        transaction: {
          include: {
            material: true,
            supplier: { select: { id: true, name: true, phone: true, city: true } },
            receiver: { select: { id: true, name: true, phone: true, city: true } },
          },
        },
        transporter: {
          include: {
            user: { select: { id: true, name: true, phone: true, city: true } },
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    if (booking.status !== "pending_approval") {
      return NextResponse.json({ error: "This booking is no longer pending approval" }, { status: 400 })
    }

    const tx = booking.transaction
    const isSupplier = tx.supplierId === userId
    const isReceiver = tx.receiverId === userId

    if (!isSupplier && !isReceiver) {
      return NextResponse.json({ error: "Only the supplier or receiver can confirm" }, { status: 403 })
    }

    // Handle rejection
    if (action === "reject") {
      await prisma.transportBooking.update({
        where: { id },
        data: { status: "rejected" },
      })

      // Notify volunteer
      await prisma.notification.create({
        data: {
          userId: booking.transporter.userId,
          type: "volunteer_rejected",
          title: "Delivery claim declined",
          body: `Your claim for "${tx.material.title}" was declined. The delivery is now open for others.`,
          data: JSON.stringify({ bookingId: id, transactionId: tx.id }),
        },
      }).catch(() => {})

      // Delete the booking so the transaction becomes available again
      await prisma.transportBooking.delete({ where: { id } })

      return NextResponse.json({ message: "Volunteer rejected, delivery returned to available pool" })
    }

    // Handle confirmation
    const updateData: any = {}
    if (isSupplier) updateData.supplierConfirmed = true
    if (isReceiver) updateData.receiverConfirmed = true

    const updated = await prisma.transportBooking.update({
      where: { id },
      data: updateData,
    })

    // Check if both have confirmed
    const bothConfirmed =
      (updated.supplierConfirmed || (isSupplier && action === "confirm")) &&
      (updated.receiverConfirmed || (isReceiver && action === "confirm"))

    if (bothConfirmed) {
      // Move to accepted
      await prisma.transportBooking.update({
        where: { id },
        data: { status: "accepted" },
      })

      const volunteerInfo = `${booking.transporter.user.name} | ${booking.transporter.user.phone} | ${booking.transporter.vehicleType.replace("_", " ")}`
      const bookingData = JSON.stringify({ bookingId: id, transactionId: tx.id })

      // Notify all three parties with each other's info
      await Promise.all([
        // Notify volunteer with supplier's contact + pickup info
        prisma.notification.create({
          data: {
            userId: booking.transporter.userId,
            type: "volunteer_accepted",
            title: "You're confirmed! 🎉 Delivery details inside",
            body: `Pickup from: ${tx.supplier.name} (${tx.supplier.phone}) at ${booking.pickupAddress}. Deliver to: ${tx.receiver.name} (${tx.receiver.phone})`,
            data: bookingData,
          },
        }),
        // Notify supplier with volunteer info
        prisma.notification.create({
          data: {
            userId: tx.supplierId,
            type: "volunteer_accepted",
            title: "Volunteer confirmed! Ready for pickup 📦",
            body: `Volunteer: ${volunteerInfo}. They will contact you to arrange pickup.`,
            data: bookingData,
          },
        }),
        // Notify receiver with volunteer info
        prisma.notification.create({
          data: {
            userId: tx.receiverId,
            type: "volunteer_accepted",
            title: "Volunteer confirmed! Delivery incoming 🚴",
            body: `Volunteer: ${volunteerInfo}. Track delivery in real-time.`,
            data: bookingData,
          },
        }),
      ]).catch(() => {})

      return NextResponse.json({ message: "Both confirmed! Volunteer can now proceed.", status: "accepted" })
    }

    // Only one side confirmed so far
    const who = isSupplier ? "Supplier" : "Receiver"
    const otherPartyId = isSupplier ? tx.receiverId : tx.supplierId
    await prisma.notification.create({
      data: {
        userId: otherPartyId,
        type: "volunteer_confirm_pending",
        title: `${who} confirmed the volunteer`,
        body: `Please confirm the volunteer for "${tx.material.title}" to proceed.`,
        data: JSON.stringify({ bookingId: id, transactionId: tx.id }),
      },
    }).catch(() => {})

    return NextResponse.json({
      message: `${who} confirmed. Waiting for the other party.`,
      supplierConfirmed: updated.supplierConfirmed || isSupplier,
      receiverConfirmed: updated.receiverConfirmed || isReceiver,
    })
  } catch (error) {
    console.error("[Volunteer Confirm PUT]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
