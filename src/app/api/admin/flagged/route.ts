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

  const flags = await prisma.fraudFlag.findMany({
    where: status ? { status } : undefined,
    include: {
      material: { select: { id: true, title: true, status: true, images: true } },
      user:     { select: { id: true, name: true, role: true, trustScore: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(flags)
}

export async function PUT(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const flag = await prisma.fraudFlag.update({
    where: { id },
    data: { status, reviewedBy: (session.user as any).id },
  })

  // If banned, archive the associated material
  if (status === "banned" && flag.materialId) {
    await prisma.material.update({
      where: { id: flag.materialId },
      data: { status: "archived" },
    })
  }

  return NextResponse.json(flag)
}
