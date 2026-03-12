import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { haversineDistance } from "@/lib/haversine"

/**
 * POST /api/volunteer/claim
 *
 * Volunteer claims an unclaimed delivery. Atomically creates a TransportBooking
 * with status "pending_approval". Prevents double-claims via unique constraint.
 *
 * Body: { transactionId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()
    const { transactionId } = body

    if (!transactionId) {
      return NextResponse.json({ error: "transactionId is required" }, { status: 400 })
    }

    // Get volunteer's transporter profile + verification
    const transporter = await prisma.transporter.findUnique({
      where: { userId },
      include: { verification: true },
    })

    if (!transporter || !transporter.isVolunteer) {
      return NextResponse.json({ error: "Not a registered volunteer" }, { status: 403 })
    }

    // Verification required before claiming
    if (!transporter.verification || transporter.verification.status !== "verified") {
      return NextResponse.json(
        { error: "Please complete identity verification before claiming deliveries" },
        { status: 403 }
      )
    }

    // Check volunteer availability
    if (transporter.availabilityStatus !== "available") {
      return NextResponse.json({ error: "You must be online to claim deliveries" }, { status: 400 })
    }

    // Atomic claim: use $transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Check transaction exists and is claimable
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: {
          material: true,
          supplier: { select: { id: true, name: true, city: true, locationLat: true, locationLng: true, phone: true } },
          receiver: { select: { id: true, name: true, city: true, locationLat: true, locationLng: true, phone: true } },
          transportBooking: true,
        },
      })

      if (!transaction) {
        throw new Error("Transaction not found")
      }

      if (transaction.transportMethod !== "platform_transporter") {
        throw new Error("This transaction does not need a volunteer")
      }

      if (transaction.transportBooking) {
        throw new Error("This delivery has already been claimed by another volunteer")
      }

      if (transaction.status === "cancelled" || transaction.status === "confirmed") {
        throw new Error("This transaction is no longer active")
      }

      // Volunteer can't claim their own transaction
      if (transaction.supplierId === userId || transaction.receiverId === userId) {
        throw new Error("You cannot claim your own transaction")
      }

      // Calculate distance
      const pickupLat = transaction.material.locationLat
      const pickupLng = transaction.material.locationLng
      const deliveryLat = transaction.receiver.locationLat
      const deliveryLng = transaction.receiver.locationLng

      let distance = 0
      if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
        distance = haversineDistance(pickupLat, pickupLng, deliveryLat, deliveryLng)
      }

      // Create the booking (unique constraint on transactionId prevents double-claim)
      const booking = await tx.transportBooking.create({
        data: {
          transactionId: transaction.id,
          transporterId: transporter.id,
          receiverId: transaction.receiverId,
          pickupAddress: transaction.pickupAddress || transaction.material.address,
          pickupLat: pickupLat,
          pickupLng: pickupLng,
          deliveryAddress: transaction.deliveryAddress || "",
          deliveryLat: deliveryLat ?? 0,
          deliveryLng: deliveryLng ?? 0,
          distanceKm: Math.round(distance * 10) / 10,
          estimatedCost: 0, // volunteer = free
          status: "pending_approval",
          receiverConfirmed: false,
          supplierConfirmed: false,
        },
      })

      return { booking, transaction }
    })

    // Notify both supplier and receiver
    const notifData = JSON.stringify({
      bookingId: result.booking.id,
      transactionId: result.transaction.id,
    })

    await Promise.all([
      prisma.notification.create({
        data: {
          userId: result.transaction.supplierId,
          type: "volunteer_claim",
          title: "A volunteer wants to deliver your item! 🚴",
          body: `Volunteer is ready to pick up "${result.transaction.material.title}". Please confirm.`,
          data: notifData,
        },
      }),
      prisma.notification.create({
        data: {
          userId: result.transaction.receiverId,
          type: "volunteer_claim",
          title: "A volunteer wants to deliver your item! 🚴",
          body: `A volunteer courier has offered to deliver "${result.transaction.material.title}". Please confirm.`,
          data: notifData,
        },
      }),
    ]).catch(() => {})

    return NextResponse.json(result.booking, { status: 201 })
  } catch (error: any) {
    // Handle unique constraint violation (double-claim)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "This delivery has already been claimed by another volunteer" },
        { status: 409 }
      )
    }
    if (error?.message) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[Volunteer Claim POST]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
