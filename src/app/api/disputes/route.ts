import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const isAdmin = (session.user as any).role === "admin"

  const where: any = {}
  if (!isAdmin) where.raisedBy = (session.user as any).id
  if (status) where.status = status

  const disputes = await prisma.dispute.findMany({
    where,
    include: {
      raiser: { select: { id: true, name: true, role: true, trustScore: true } },
      transaction: {
        include: {
          material: { select: { id: true, title: true } },
          supplier: { select: { id: true, name: true, role: true } },
          receiver: { select: { id: true, name: true, role: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(disputes)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { transactionId, reason, evidenceImages } = await req.json()
  if (!transactionId || !reason)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const dispute = await prisma.dispute.create({
    data: {
      transactionId,
      raisedBy: (session.user as any).id,
      reason,
      evidenceImages: evidenceImages || "",
      status: "open",
    },
  })
  return NextResponse.json(dispute, { status: 201 })
}
