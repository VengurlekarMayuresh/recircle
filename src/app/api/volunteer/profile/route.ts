import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

/**
 * GET /api/volunteer/profile
 *
 * Returns volunteer's transporter profile, verification status,
 * delivery stats, and green points info.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const transporter = await prisma.transporter.findUnique({
      where: { userId },
      include: {
        verification: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            greenPoints: true,
            level: true,
            avatarUrl: true,
            avgRating: true,
            totalRatings: true,
          },
        },
      },
    })

    if (!transporter) {
      return NextResponse.json({ error: "Not a registered transporter" }, { status: 403 })
    }

    // Get delivery stats
    const bookings = await prisma.transportBooking.findMany({
      where: { transporterId: transporter.id },
      select: { status: true, distanceKm: true, createdAt: true },
    })

    const completed = bookings.filter((b) => b.status === "completed")
    const active = bookings.filter((b) =>
      ["pending_approval", "accepted", "pickup_scheduled", "collected", "in_transit", "delivered"].includes(b.status)
    )
    const cancelled = bookings.filter((b) => b.status === "cancelled")
    const totalDistanceKm = completed.reduce((sum, b) => sum + b.distanceKm, 0)

    // Recent deliveries (last 7 days) for streak info
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentCount = completed.filter((b) => b.createdAt >= sevenDaysAgo).length

    return NextResponse.json({
      profile: {
        id: transporter.id,
        vehicleType: transporter.vehicleType,
        vehicleCapacityKg: transporter.vehicleCapacityKg,
        serviceAreaCity: transporter.serviceAreaCity,
        serviceRadiusKm: transporter.serviceRadiusKm,
        availabilityStatus: transporter.availabilityStatus,
        isVolunteer: transporter.isVolunteer,
      },
      user: transporter.user,
      verification: transporter.verification
        ? {
            status: transporter.verification.status,
            createdAt: transporter.verification.createdAt,
            reviewedAt: transporter.verification.reviewedAt,
          }
        : { status: "none" },
      stats: {
        totalDeliveries: transporter.totalDeliveries,
        completedThisSession: completed.length,
        activeDeliveries: active.length,
        cancelledDeliveries: cancelled.length,
        totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
        recentDeliveriesThisWeek: recentCount,
        hasStreak: recentCount >= 3,
        avgRating: transporter.avgRating,
        totalRatings: transporter.totalRatings,
      },
    })
  } catch (error) {
    console.error("[Volunteer Profile GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
