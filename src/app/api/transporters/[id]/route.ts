import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const transporterId = parseInt(id)
    if (isNaN(transporterId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

    const t = await prisma.transporter.findUnique({
      where: { id: transporterId },
      include: { user: { select: { id: true, name: true, avatarUrl: true, city: true, avgRating: true, totalRatings: true, verificationLevel: true } } },
    })
    if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(t)
  } catch (error) {
    console.error("[Transporter GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const transporterId = parseInt(id)
    if (isNaN(transporterId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

    const body = await req.json()
    const updated = await prisma.transporter.update({
      where: { id: transporterId },
      data: {
        availabilityStatus: body.availability_status ?? undefined,
        pricePerKm:         body.price_per_km        !== undefined ? parseFloat(body.price_per_km) : undefined,
        baseRate:           body.base_rate            !== undefined ? parseFloat(body.base_rate) : undefined,
        serviceRadiusKm:    body.service_radius_km    !== undefined ? parseInt(body.service_radius_km) : undefined,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("[Transporter PUT]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
