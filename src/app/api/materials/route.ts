import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { runScoutAgent } from "@/lib/agents/scout"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    const { 
      title, 
      description, 
      condition, 
      quantity, 
      unit, 
      price, 
      listingType, 
      city, 
      tags,
      images,
      floorPrice,
      bargainEnabled,
      negotiationStyle,
      autoAcceptPrice,
      dealSweeteners
    } = body

    // Sanitize numbers to avoid NaN
    const parsedQuantity = parseInt(quantity)
    const finalQuantity = isNaN(parsedQuantity) ? 1 : parsedQuantity
    
    const parsedPrice = parseFloat(price)
    const finalPrice = isNaN(parsedPrice) ? 0 : parsedPrice

    const parsedFloorPrice = parseFloat(floorPrice)
    const finalFloorPrice = isNaN(parsedFloorPrice) ? null : parsedFloorPrice

    const parsedAutoAccept = parseFloat(autoAcceptPrice)
    const finalAutoAccept = isNaN(parsedAutoAccept) ? null : parsedAutoAccept

    const material = await prisma.material.create({
      data: {
        user: { connect: { id: session.user.id } },
        title: title || "Untitled Material",
        description: description || "",
        condition: (condition || "good").toLowerCase(),
        quantity: finalQuantity,
        unit: unit || "pieces",
        price: finalPrice,
        listingType: listingType || "sell",
        city: city || "Mumbai",
        address: "Default Address",
        locationLat: 19.076,
        locationLng: 72.877,
        tags: Array.isArray(tags) ? tags.join(",") : tags || "",
        images: (Array.isArray(images) ? images.filter(Boolean).join(",") : images) || "https://images.unsplash.com/photo-1590069324154-04663e9f4577",
        status: "available",
        floorPrice: finalFloorPrice,
        bargainEnabled: bargainEnabled === true,
        negotiationStyle: ["firm", "moderate", "flexible"].includes(negotiationStyle) ? negotiationStyle : "moderate",
        autoAcceptPrice: finalAutoAccept,
        dealSweeteners: dealSweeteners || null,
      }
    })

    // Trigger Scout Agent
    runScoutAgent(material.id).catch(err => console.error("[Scout] Failed:", err))

    return NextResponse.json(material, { status: 201 })
  } catch (error: any) {
    console.error("[Material API] Error:", error)
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const own     = searchParams.get("own") === "true"
    const userId  = searchParams.get("userId")
    const status  = searchParams.get("status")
    const limit   = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined

    const where: any = {}

    if (own) {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      }
      where.userId = session.user.id
      // own=true shows all statuses so seller can manage their listings
    } else if (userId) {
      where.userId = userId
      where.status = status || "available"
    } else {
      // Public marketplace — only show available materials
      where.status = status || "available"
    }

    const materials = await prisma.material.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: limit } : {}),
      include: {
        user: { select: { id: true, name: true, email: true, role: true, city: true, avatarUrl: true, trustScore: true, verificationLevel: true, avgRating: true, totalRatings: true, greenPoints: true, level: true, orgName: true } },
        category: true
      }
    })
    return NextResponse.json(materials)
  } catch (error) {
    console.error("[Material API GET] Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
