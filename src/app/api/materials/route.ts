import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { runScoutAgent } from "@/lib/agents/scout"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    console.log("[Material API] Session:", session ? `User ${session.user.id}` : "No Session")
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    console.log("[Material API] Body:", body)

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
      images
    } = body

    // Sanitize numbers to avoid NaN
    const parsedQuantity = parseInt(quantity)
    const finalQuantity = isNaN(parsedQuantity) ? 1 : parsedQuantity
    
    const parsedPrice = parseFloat(price)
    const finalPrice = isNaN(parsedPrice) ? 0 : parsedPrice

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
        images: images || "https://images.unsplash.com/photo-1590069324154-04663e9f4577",
        status: "available",
      }
    })

    console.log("[Material API] Success:", material.id)

    // Trigger Scout Agent asynchronously (non-blocking)
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
    const own = searchParams.get("own") === "true"
    
    let where = {}
    
    if (own) {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      }
      where = { userId: session.user.id }
    }

    const materials = await prisma.material.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: true }
    })
    return NextResponse.json(materials)
  } catch (error) {
    console.error("[Material API GET] Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
