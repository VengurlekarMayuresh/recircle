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

    const wantRequest = await prisma.wantRequest.findUnique({
      where: { id },
      include: {
        category: true,
        user: { select: { id: true, name: true, avatarUrl: true, role: true, city: true, trustScore: true, verificationLevel: true } }
      }
    })

    if (!wantRequest) return NextResponse.json({ message: "Not found" }, { status: 404 })
    return NextResponse.json(wantRequest)
  } catch {
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

    const wantRequest = await prisma.wantRequest.findUnique({ where: { id } })
    if (!wantRequest) return NextResponse.json({ message: "Not found" }, { status: 404 })
    if (wantRequest.userId !== session.user.id) return NextResponse.json({ message: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const updated = await prisma.wantRequest.update({ where: { id }, data: body })
    return NextResponse.json(updated)
  } catch {
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

    const wantRequest = await prisma.wantRequest.findUnique({ where: { id } })
    if (!wantRequest) return NextResponse.json({ message: "Not found" }, { status: 404 })
    if (wantRequest.userId !== session.user.id && (session.user as any).role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await prisma.wantRequest.delete({ where: { id } })
    return NextResponse.json({ message: "Deleted" })
  } catch {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
