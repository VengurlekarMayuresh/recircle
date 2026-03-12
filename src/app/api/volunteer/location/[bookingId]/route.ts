import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

/**
 * PUT /api/volunteer/location/[bookingId]
 *
 * Volunteer updates their live GPS location.
 * Body: { lat: number, lng: number }
 *
 * GET /api/volunteer/location/[bookingId]
 *
 * Any party (supplier, receiver, or volunteer) can read current location.
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
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

    const body = await req.json()
    const { lat, lng } = body

    if (lat == null || lng == null) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 })
    }

    // Verify the caller is the volunteer assigned to this booking
    const booking = await prisma.transportBooking.findUnique({
      where: { id },
      include: { transporter: true },
    })

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    if (booking.transporter.userId !== session.user.id) {
      return NextResponse.json({ error: "Only the assigned volunteer can update location" }, { status: 403 })
    }

    // Only allow location updates for active deliveries
    const activeStatuses = ["accepted", "pickup_scheduled", "collected", "in_transit"]
    if (!activeStatuses.includes(booking.status)) {
      return NextResponse.json({ error: "Location updates only allowed for active deliveries" }, { status: 400 })
    }

    await prisma.transportBooking.update({
      where: { id },
      data: {
        volunteerLat: parseFloat(lat),
        volunteerLng: parseFloat(lng),
        volunteerLocationUpdatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Volunteer Location PUT]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function GET(
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

    const booking = await prisma.transportBooking.findUnique({
      where: { id },
      include: {
        transporter: { include: { user: { select: { id: true, name: true } } } },
        transaction: true,
      },
    })

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

    // Verify caller is supplier, receiver, or volunteer
    const userId = session.user.id
    const isAllowed =
      booking.transporter.userId === userId ||
      booking.transaction.supplierId === userId ||
      booking.transaction.receiverId === userId

    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      lat: booking.volunteerLat,
      lng: booking.volunteerLng,
      updatedAt: booking.volunteerLocationUpdatedAt,
      status: booking.status,
    })
  } catch (error) {
    console.error("[Volunteer Location GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
