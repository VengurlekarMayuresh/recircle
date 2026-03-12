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
      dealSweeteners,
      // AI-generated impact data
      co2SavedKg: aiCo2,
      waterSavedLiters: aiWater,
      estimatedWeightKg: aiWeightKg,
      aiDetectedType: aiType,
      // Address fields
      address: userAddress,
      locationLat: userLat,
      locationLng: userLng,
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

    // Parse AI impact data
    const finalCo2 = parseFloat(aiCo2) || 0
    const finalWeightKg = parseFloat(aiWeightKg) || null

    // City center coordinates as fallback
    const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
      "Mumbai": { lat: 19.076, lng: 72.877 },
      "Delhi": { lat: 28.644, lng: 77.216 },
      "Bangalore": { lat: 12.972, lng: 77.594 },
      "Hyderabad": { lat: 17.385, lng: 78.487 },
      "Chennai": { lat: 13.083, lng: 80.270 },
      "Kolkata": { lat: 22.572, lng: 88.364 },
      "Pune": { lat: 18.520, lng: 73.857 },
      "Ahmedabad": { lat: 23.023, lng: 72.571 },
      "Jaipur": { lat: 26.912, lng: 75.787 },
      "Lucknow": { lat: 26.847, lng: 80.947 },
      "Surat": { lat: 21.170, lng: 72.831 },
      "Nagpur": { lat: 21.146, lng: 79.088 },
      "Indore": { lat: 22.720, lng: 75.858 },
      "Bhopal": { lat: 23.260, lng: 77.413 },
      "Chandigarh": { lat: 30.734, lng: 76.779 },
      "Kochi": { lat: 9.932, lng: 76.267 },
    }
    const selectedCity = city || "Mumbai"
    const fallbackCoords = CITY_COORDS[selectedCity] || CITY_COORDS["Mumbai"]
    const finalLat = parseFloat(userLat) || fallbackCoords.lat
    const finalLng = parseFloat(userLng) || fallbackCoords.lng
    const finalAddress = userAddress || selectedCity

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
        city: selectedCity,
        address: finalAddress,
        locationLat: finalLat,
        locationLng: finalLng,
        tags: Array.isArray(tags) ? tags.join(",") : tags || "",
        images: (Array.isArray(images) ? images.filter(Boolean).join(",") : images) || "https://images.unsplash.com/photo-1590069324154-04663e9f4577",
        status: "available",
        co2SavedKg: finalCo2,
        weightKg: finalWeightKg,
        aiDetectedType: aiType || null,
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
