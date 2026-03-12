import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const id = parseInt(rawId)
    if (isNaN(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 })

    const material = await prisma.material.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, role: true, city: true, avatarUrl: true, trustScore: true, verificationLevel: true, avgRating: true, totalRatings: true, greenPoints: true, level: true, orgName: true } }, category: true }
    })

    if (!material) {
      return NextResponse.json({ message: "Material not found" }, { status: 404 })
    }

    // Increment views count
    await prisma.material.update({ where: { id }, data: { viewsCount: { increment: 1 } } }).catch(() => {})

    return NextResponse.json(material)
  } catch (error) {
    console.error("[Material GET] Error:", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const { id: rawId } = await params
    const id = parseInt(rawId)
    if (isNaN(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 })

    const material = await prisma.material.findUnique({ where: { id } })
    if (!material) return NextResponse.json({ message: "Not found" }, { status: 404 })
    if (material.userId !== session.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const updated = await prisma.material.update({ where: { id }, data: body, include: { category: true } })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const { id: rawId } = await params
    const id = parseInt(rawId)
    if (isNaN(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 })

    const material = await prisma.material.findUnique({ where: { id } })
    if (!material) return NextResponse.json({ message: "Not found" }, { status: 404 })
    if (material.userId !== session.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 })

    await prisma.material.update({ where: { id }, data: { status: 'archived' } })
    return NextResponse.json({ message: "Material archived" })
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
