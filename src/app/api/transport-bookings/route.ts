import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { haversineDistance } from "@/lib/haversine"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as any).id

    const bookings = await prisma.transportBooking.findMany({
      where: {
        OR: [
          { receiverId: userId },
          { transporter: { userId } },
          { transaction: { supplierId: userId } },
        ],
      },
      include: {
        transporter: {
          include: {
            user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
          },
        },
        transaction: {
          include: {
            material: { select: { title: true, images: true } },
            supplier: { select: { id: true, name: true, phone: true, city: true } },
            receiver: { select: { id: true, name: true, phone: true, city: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(bookings)
  } catch (error) {
    console.error("[Transport Bookings GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as any).id

    const body = await req.json()
    const {
      transaction_id, transporter_id, pickup_address, pickup_lat, pickup_lng,
      delivery_address, delivery_lat, delivery_lng, scheduled_date, notes,
    } = body

    if (!transaction_id || !transporter_id || !pickup_address || !delivery_address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const distance = haversineDistance(
      parseFloat(pickup_lat), parseFloat(pickup_lng),
      parseFloat(delivery_lat), parseFloat(delivery_lng)
    )

    const transporter = await prisma.transporter.findUnique({ where: { id: parseInt(transporter_id) } })
    if (!transporter) return NextResponse.json({ error: "Transporter not found" }, { status: 404 })

    let cost = transporter.baseRate + distance * transporter.pricePerKm
    if (distance > 50) cost *= 1.1

    const booking = await prisma.transportBooking.create({
      data: {
        transactionId:   transaction_id,
        transporterId:   parseInt(transporter_id),
        receiverId:      userId,
        pickupAddress:   pickup_address,
        pickupLat:       parseFloat(pickup_lat),
        pickupLng:       parseFloat(pickup_lng),
        deliveryAddress: delivery_address,
        deliveryLat:     parseFloat(delivery_lat),
        deliveryLng:     parseFloat(delivery_lng),
        distanceKm:      Math.round(distance * 10) / 10,
        estimatedCost:   Math.round(cost),
        scheduledDate:   scheduled_date ? new Date(scheduled_date) : null,
        notes,
        status: "requested",
      },
    })

    // Notify transporter
    await prisma.notification.create({
      data: {
        userId:  transporter.userId,
        type:    "transport_booking",
        title:   "New delivery booking request",
        body:    `A delivery has been booked for ${pickup_address} → ${delivery_address}`,
        data:    JSON.stringify({ booking_id: booking.id }),
      },
    }).catch(() => {})

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error("[Transport Bookings POST]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
