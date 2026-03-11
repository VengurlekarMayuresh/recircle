import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { materialId } = await req.json()

    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: { category: true }
    })

    if (!material) return NextResponse.json({ message: "Not found" }, { status: 404 })

    // Router Logic: Decide where the material should go
    let recommendation = "MARKETPLACE"
    let reason = "High market value and good condition."

    if (material.condition === "Fair" || material.condition === "Salvageable") {
      recommendation = "REPAIR_HUB"
      reason = "Material requires restoration before circular reuse. Routing to nearest Repair Hub."
    } else if (material.price === 0) {
      recommendation = "NGO_DONATION"
      reason = "Giveaway listing prioritized for high-impact social housing projects."
    }

    // Update material status or add router log
    await prisma.agentLog.create({
      data: {
        agentName: "router",
        materialId: material.id,
        action: "ROUTING_DECISION",
        details: `Recommendation: ${recommendation}. Reason: ${reason}`,
      }
    })

    return NextResponse.json({
      recommendation,
      reason
    })

  } catch (error) {
    return NextResponse.json({ message: "Error" }, { status: 500 })
  }
}
