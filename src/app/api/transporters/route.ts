import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get("city")
  const vehicle_type = searchParams.get("vehicle_type")
  const min_capacity = searchParams.get("min_capacity")

  const where: any = { availabilityStatus: "available" }
  if (city) where.serviceAreaCity = { contains: city, mode: "insensitive" }
  if (vehicle_type) where.vehicleType = vehicle_type
  if (min_capacity) where.vehicleCapacityKg = { gte: parseFloat(min_capacity) }

  const transporters = await prisma.transporter.findMany({
    where,
    include: { user: { select: { id: true, name: true, avatarUrl: true, city: true, avgRating: true, totalRatings: true } } },
    orderBy: { avgRating: "desc" },
  })
  return NextResponse.json(transporters)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as any).id

  const body = await req.json()
  const {
    vehicle_type, vehicle_capacity_kg, vehicle_capacity_cbm, vehicle_photo,
    service_area_city, service_radius_km, price_per_km, base_rate, is_volunteer,
  } = body

  // Check if already registered
  const existing = await prisma.transporter.findUnique({ where: { userId } })
  if (existing) {
    return NextResponse.json({ error: "Already registered as transporter" }, { status: 400 })
  }

  const isVol = is_volunteer ?? false
  const transporter = await prisma.transporter.create({
    data: {
      userId,
      vehicleType: vehicle_type,
      vehicleCapacityKg: parseFloat(vehicle_capacity_kg),
      vehicleCapacityCbm: vehicle_capacity_cbm ? parseFloat(vehicle_capacity_cbm) : null,
      vehiclePhoto: vehicle_photo,
      serviceAreaCity: service_area_city,
      serviceRadiusKm: parseInt(service_radius_km),
      pricePerKm: isVol ? 0 : parseFloat(price_per_km),
      baseRate: isVol ? 0 : parseFloat(base_rate),
      isVolunteer: isVol,
    },
  })

  return NextResponse.json(transporter, { status: 201 })
}
