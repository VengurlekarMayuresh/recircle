import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const t = await prisma.transporter.findUnique({
    where: { id: parseInt(params.id) },
    include: { user: { select: { id: true, name: true, avatarUrl: true, city: true, avgRating: true, totalRatings: true, verificationLevel: true } } },
  })
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(t)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const updated = await prisma.transporter.update({
    where: { id: parseInt(params.id) },
    data: {
      availabilityStatus: body.availability_status ?? undefined,
      pricePerKm:         body.price_per_km        !== undefined ? parseFloat(body.price_per_km) : undefined,
      baseRate:           body.base_rate            !== undefined ? parseFloat(body.base_rate) : undefined,
      serviceRadiusKm:    body.service_radius_km    !== undefined ? parseInt(body.service_radius_km) : undefined,
    },
  })
  return NextResponse.json(updated)
}
