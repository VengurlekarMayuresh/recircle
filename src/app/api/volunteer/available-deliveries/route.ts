import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { haversineDistance } from "@/lib/haversine"

/**
 * GET /api/volunteer/available-deliveries
 *
 * Returns transactions that:
 *   - have transportMethod = "platform_transporter"
 *   - have NO TransportBooking yet (unclaimed)
 *   - are not cancelled/confirmed
 * Filtered by the volunteer's city, service radius, and vehicle capacity.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get volunteer's transporter profile
    const transporter = await prisma.transporter.findUnique({
      where: { userId },
      include: { verification: true },
    })

    if (!transporter || !transporter.isVolunteer) {
      return NextResponse.json({ error: "Not a registered volunteer" }, { status: 403 })
    }

    // Find unclaimed transactions needing platform transport
    const transactions = await prisma.transaction.findMany({
      where: {
        transportMethod: "platform_transporter",
        status: { in: ["negotiating", "scheduled"] },
        transportBooking: null, // no booking yet = unclaimed
      },
      include: {
        material: {
          include: {
            category: true,
            user: { select: { id: true, name: true, city: true, phone: true } },
          },
        },
        supplier: {
          select: {
            id: true, name: true, city: true, locationLat: true, locationLng: true, phone: true,
          },
        },
        receiver: {
          select: {
            id: true, name: true, city: true, locationLat: true, locationLng: true, phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Filter by volunteer's service area + radius
    const filtered = transactions
      .map((tx) => {
        const pickupLat = tx.material.locationLat
        const pickupLng = tx.material.locationLng
        const deliveryLat = tx.receiver.locationLat
        const deliveryLng = tx.receiver.locationLng

        // Check if pickup is within volunteer's service area
        // Use supplier city match as a fast filter
        const cityMatch =
          tx.supplier.city?.toLowerCase() === transporter.serviceAreaCity.toLowerCase() ||
          tx.receiver.city?.toLowerCase() === transporter.serviceAreaCity.toLowerCase()

        if (!cityMatch) return null

        // Calculate distances
        let estimatedDistance = 0
        if (pickupLat && pickupLng && deliveryLat && deliveryLng) {
          estimatedDistance = haversineDistance(pickupLat, pickupLng, deliveryLat, deliveryLng)
        }

        // Check weight capacity
        if (tx.material.weightKg && tx.material.weightKg > transporter.vehicleCapacityKg) {
          return null
        }

        // Estimate green points
        const estimatedPoints = 50 + Math.round(estimatedDistance * 5) +
          (tx.material.weightKg ? Math.round(tx.material.weightKg * 2) : 0)

        return {
          transactionId: tx.id,
          material: {
            id: tx.material.id,
            title: tx.material.title,
            description: tx.material.description,
            images: tx.material.images,
            condition: tx.material.condition,
            weightKg: tx.material.weightKg,
            listingType: tx.material.listingType,
            category: tx.material.category,
          },
          supplier: {
            name: tx.supplier.name,
            city: tx.supplier.city,
          },
          receiver: {
            name: tx.receiver.name,
            city: tx.receiver.city,
          },
          pickupAddress: tx.pickupAddress,
          deliveryAddress: tx.deliveryAddress,
          estimatedDistance: Math.round(estimatedDistance * 10) / 10,
          estimatedPoints,
          quantity: tx.quantity,
          createdAt: tx.createdAt,
        }
      })
      .filter(Boolean)

    return NextResponse.json(filtered)
  } catch (error) {
    console.error("[Volunteer Available Deliveries GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
