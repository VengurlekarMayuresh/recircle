import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id

    const [materialAgg, txCount] = await Promise.all([
      prisma.material.aggregate({
        where: { userId },
        _sum: { co2SavedKg: true, rupeesSaved: true, weightKg: true },
      }),
      prisma.transaction.count({
        where: {
          OR: [{ supplierId: userId }, { receiverId: userId }],
          status: "confirmed",
        },
      }),
    ])

    return NextResponse.json({
      co2_saved: Math.round(materialAgg._sum.co2SavedKg ?? 0),
      rupees_saved: Math.round(materialAgg._sum.rupeesSaved ?? 0),
      kg_diverted: Math.round(materialAgg._sum.weightKg ?? 0),
      transaction_count: txCount,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
