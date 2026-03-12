import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "admin")
    return null
  return session
}

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const role   = searchParams.get("role")
  const city   = searchParams.get("city")
  const search = searchParams.get("search")

  const where: any = {}
  if (role)   where.role = role
  if (city)   where.city = city
  if (search) where.OR = [
    { name:  { contains: search } },
    { email: { contains: search } },
  ]

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, name: true, email: true, role: true, city: true,
      trustScore: true, verificationLevel: true, greenPoints: true,
      avgRating: true, totalRatings: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(users)
}

export async function PUT(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id, role, verificationLevel, trustScore } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const data: any = {}
  if (role)              data.role = role
  if (verificationLevel) data.verificationLevel = verificationLevel
  if (trustScore != null) data.trustScore = trustScore

  const user = await prisma.user.update({ where: { id }, data })
  return NextResponse.json(user)
}
