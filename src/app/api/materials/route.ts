import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

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
    } = await req.json()

    const material = await prisma.material.create({
      data: {
        userId: session.user.id,
        title,
        description,
        condition: condition.toLowerCase(),
        quantity: parseInt(quantity) || 1,
        unit,
        price: parseFloat(price) || 0,
        listingType,
        city,
        address: "Default Address", // In a real app, this would be from the user or a map picker
        locationLat: 19.076, // Default Mumbai coords
        locationLng: 72.877,
        tags: Array.isArray(tags) ? tags.join(",") : tags || "",
        images: images || "https://images.unsplash.com/photo-1590069324154-04663e9f4577", // Placeholder if none provided
        status: "available",
      }
    })

    return NextResponse.json(material, { status: 201 })
  } catch (error: any) {
    console.error("Error creating material:", error)
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const materials = await prisma.material.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true }
    })
    return NextResponse.json(materials)
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
