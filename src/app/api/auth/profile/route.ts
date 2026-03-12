import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

// GET /api/auth/profile - get own profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, email: true, phone: true, role: true, orgName: true,
        bio: true, avatarUrl: true, locationLat: true, locationLng: true,
        address: true, city: true, greenPoints: true, level: true,
        trustScore: true, verificationLevel: true, idVerified: true,
        avgRating: true, totalRatings: true, createdAt: true,
        userBadges: { include: { badge: true } }
      }
    })

    if (!user) return NextResponse.json({ message: "Not found" }, { status: 404 })
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

// PUT /api/auth/profile - update own profile
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { name, phone, bio, avatarUrl, orgName, address, city, locationLat, locationLng } = body

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(orgName !== undefined && { orgName }),
        ...(address !== undefined && { address }),
        ...(city && { city }),
        ...(locationLat !== undefined && { locationLat: parseFloat(locationLat) }),
        ...(locationLng !== undefined && { locationLng: parseFloat(locationLng) }),
      },
      select: {
        id: true, name: true, email: true, phone: true, role: true, orgName: true,
        bio: true, avatarUrl: true, city: true, greenPoints: true, level: true,
        trustScore: true, verificationLevel: true
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[Profile PUT] Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
