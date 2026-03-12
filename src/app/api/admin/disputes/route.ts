import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== "admin") return null
  return session
}

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  const disputes = await prisma.dispute.findMany({
    where: status ? { status } : undefined,
    include: {
      raiser: { select: { id: true, name: true, role: true, trustScore: true, avgRating: true } },
      transaction: {
        include: {
          material: { select: { id: true, title: true } },
          supplier: { select: { id: true, name: true, role: true, trustScore: true } },
          receiver: { select: { id: true, name: true, role: true, trustScore: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(disputes)
}

export async function PUT(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id, status, resolution } = await req.json()
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const data: any = {}
  if (status)     data.status = status
  if (resolution) data.resolution = resolution
  if (status === "resolved") {
    data.resolvedBy = (session.user as any).id
    data.resolvedAt = new Date()
  }

  const dispute = await prisma.dispute.update({ where: { id }, data })
  return NextResponse.json(dispute)
}
