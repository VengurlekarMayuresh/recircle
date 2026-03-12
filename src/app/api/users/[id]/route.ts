import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        badges: { include: { badge: true } },
        transporterProfile: true,
        _count: {
          select: {
            materials: true,
            suppliedTransactions: { where: { status: "confirmed" } },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate co2_saved from their materials
    const materialImpact = await prisma.material.aggregate({
      where: { userId: params.id },
      _sum: { co2SavedKg: true },
    })

    // Never expose password
    const { passwordHash, ...safeUser } = user as any

    return NextResponse.json({
      ...safeUser,
      transporter: (user as any).transporterProfile,
      total_listings: user._count.materials,
      total_exchanges: user._count.suppliedTransactions,
      co2_saved: Math.round(materialImpact._sum.co2SavedKg ?? 0),
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
