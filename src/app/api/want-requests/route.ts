import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

// GET /api/want-requests — list public want requests
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get("categoryId")
    const status = searchParams.get("status") || "open"
    const mine = searchParams.get("mine")
    const session = await getServerSession(authOptions)

    const where: any = { status }
    if (categoryId) where.categoryId = parseInt(categoryId)
    if (mine === "true" && session?.user?.id) where.userId = session.user.id

    const requests = await prisma.wantRequest.findMany({
      where,
      include: {
        category: true,
        user: { select: { id: true, name: true, avatarUrl: true, role: true, city: true, trustScore: true, verificationLevel: true } }
      },
      orderBy: [{ urgency: "desc" }, { createdAt: "desc" }]
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error("[Want Requests GET]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

// POST /api/want-requests — create a new want request
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { title, description, categoryId, keywords, quantityNeeded, locationLat, locationLng, radiusKm, urgency } = body

    if (!title || !categoryId) {
      return NextResponse.json({ message: "title and categoryId are required" }, { status: 400 })
    }

    // Get user's city for location
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { city: true, locationLat: true, locationLng: true } })

    const wantRequest = await prisma.wantRequest.create({
      data: {
        userId: session.user.id,
        categoryId: parseInt(categoryId),
        title,
        description: description || "",
        keywords: keywords || "",
        quantityNeeded: parseInt(quantityNeeded) || 1,
        locationLat: locationLat || user?.locationLat || 19.0760,
        locationLng: locationLng || user?.locationLng || 72.8777,
        radiusKm: parseInt(radiusKm) || 10,
        urgency: urgency || "medium",
        status: "open"
      }
    })

    return NextResponse.json(wantRequest, { status: 201 })
  } catch (error) {
    console.error("[Want Requests POST]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
