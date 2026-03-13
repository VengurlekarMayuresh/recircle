import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { generateOpeningMessage } from "@/lib/agents/bargain"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { streamId, supplierId } = await req.json()
    if (!streamId || !supplierId) {
      return NextResponse.json({ message: "streamId and supplierId are required" }, { status: 400 })
    }

    // 1. Fetch waste stream details
    const stream = await prisma.businessWasteStream.findUnique({
      where: { id: parseInt(streamId) },
      include: { category: true, user: { select: { id: true, name: true, city: true } } }
    })

    if (!stream) {
      return NextResponse.json({ message: "Waste stream not found" }, { status: 404 })
    }

    // 2. Find or Create a placeholder Material listing for this waste stream
    // This allows the existing bargain system to work without schema changes
    let material = await prisma.material.findFirst({
      where: {
        userId: supplierId,
        title: stream.title || stream.category.name,
        listingType: "waste_stream_placeholder"
      }
    })

    if (!material) {
      material = await prisma.material.create({
        data: {
          userId: supplierId,
          categoryId: stream.categoryId,
          title: stream.title || stream.category.name,
          description: stream.description || `Industrial output of ${stream.category.name}. Monthly volume: ${stream.monthlyVolumeKg} ${stream.unit}.`,
          condition: "good",
          quantity: Math.round(stream.monthlyVolumeKg || 1),
          unit: stream.unit || "kg",
          listingType: "waste_stream_placeholder",
          price: 0.01, // Minimal price to allow bargaining logic (usually requires > 0)
          status: "available",
          locationLat: 19.076, // Default or supplier location
          locationLng: 72.8777,
          address: "Business Factory Outlet",
          city: stream.user.city || "Mumbai",
          images: "", // No image yet
          tags: stream.tags || "[]",
          bargainEnabled: true,
          negotiationStyle: "moderate",
          floorPrice: 0.01,
        }
      })
    }

    // 3. Check for existing active bargain session
    const existingSession = await prisma.bargainSession.findFirst({
      where: {
        materialId: material.id,
        buyerId: session.user.id,
        status: "active",
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    })

    if (existingSession) {
      return NextResponse.json({
        sessionId: existingSession.id,
        status: existingSession.status,
        resumed: true,
      })
    }

    // 4. Create new bargain session
    const bargainSession = await prisma.bargainSession.create({
      data: {
        materialId: material.id,
        buyerId: session.user.id,
        askingPrice: material.price,
        floorPrice: material.floorPrice || 0.01,
        negotiationStyle: "human", // Set to 'human' to bypass AI bot
        status: "active",
        messageCount: 0,
      },
    })

    return NextResponse.json({
      sessionId: bargainSession.id,
      status: "active",
      resumed: false,
    }, { status: 201 })

  } catch (error: any) {
    console.error("[Bargain Stream Start] Error:", error)
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 })
  }
}
