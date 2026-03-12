import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type     = searchParams.get("type")
  const category = searchParams.get("category")

  const where: any = {}
  if (type) where.type = type
  if (category) where.categories = { contains: category }

  const hubs = await prisma.repairHub.findMany({
    where,
    orderBy: { name: "asc" },
  })
  return NextResponse.json(hubs)
}
