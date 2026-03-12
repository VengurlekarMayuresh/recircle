import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

// GET /api/material-requests — list requests for current user (sent + received)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") // "sent" | "received"

    let requests

    if (type === "sent") {
      // Requests I sent as receiver
      requests = await prisma.directRequest.findMany({
        where: { receiverId: session.user.id },
        include: {
          material: { include: { category: true, user: { select: { id: true, name: true, avatarUrl: true, city: true, trustScore: true, verificationLevel: true } } } },
        },
        orderBy: { createdAt: "desc" }
      })
    } else if (type === "received") {
      // Requests received for my listings
      requests = await prisma.directRequest.findMany({
        where: { material: { userId: session.user.id } },
        include: {
          material: { include: { category: true } },
          receiver: { select: { id: true, name: true, avatarUrl: true, city: true, trustScore: true, verificationLevel: true, avgRating: true, totalRatings: true } }
        },
        orderBy: { createdAt: "desc" }
      })
    } else {
      // Both
      const [sent, received] = await Promise.all([
        prisma.directRequest.findMany({
          where: { receiverId: session.user.id },
          include: {
            material: { include: { category: true, user: { select: { id: true, name: true, avatarUrl: true, city: true, trustScore: true } } } }
          },
          orderBy: { createdAt: "desc" }
        }),
        prisma.directRequest.findMany({
          where: { material: { userId: session.user.id } },
          include: {
            material: { include: { category: true } },
            receiver: { select: { id: true, name: true, avatarUrl: true, city: true, trustScore: true, avgRating: true, totalRatings: true } }
          },
          orderBy: { createdAt: "desc" }
        })
      ])
      return NextResponse.json({ sent, received })
    }

    return NextResponse.json(requests)
  } catch (error) {
    console.error("[Material Requests GET] Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

// POST /api/material-requests — create a new direct request
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { materialId, quantityRequested, message, preferredTransport } = body

    if (!materialId || !quantityRequested) {
      return NextResponse.json({ message: "materialId and quantityRequested are required" }, { status: 400 })
    }

    const material = await prisma.material.findUnique({
      where: { id: parseInt(materialId) },
      include: { user: true }
    })

    if (!material) return NextResponse.json({ message: "Material not found" }, { status: 404 })
    if (material.status !== "available" && material.status !== "future") {
      return NextResponse.json({ message: "Material is not available for requests" }, { status: 400 })
    }
    if (material.userId === session.user.id) {
      return NextResponse.json({ message: "Cannot request your own listing" }, { status: 400 })
    }

    // Check for duplicate pending request
    const existing = await prisma.directRequest.findFirst({
      where: { materialId: parseInt(materialId), receiverId: session.user.id, status: "pending" }
    })
    if (existing) {
      return NextResponse.json({ message: "You already have a pending request for this material" }, { status: 400 })
    }

    const request = await prisma.directRequest.create({
      data: {
        materialId: parseInt(materialId),
        receiverId: session.user.id,
        quantityRequested: parseInt(quantityRequested),
        message: message || "",
        preferredTransport: preferredTransport || "self_pickup",
        status: "pending"
      }
    })

    // Notify the supplier
    await prisma.notification.create({
      data: {
        userId: material.userId,
        type: "new_request",
        title: "New Material Request",
        body: `Someone wants your listing: ${material.title}`,
        data: JSON.stringify({ requestId: request.id, materialId: material.id })
      }
    }).catch(() => {})

    return NextResponse.json(request, { status: 201 })
  } catch (error) {
    console.error("[Material Requests POST] Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
