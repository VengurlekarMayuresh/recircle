import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const material = await prisma.material.findUnique({
      where: { id: params.id },
      include: { user: true, category: true }
    })

    if (!material) {
      return NextResponse.json({ message: "Material not found" }, { status: 404 })
    }

    return NextResponse.json(material)
  } catch (error) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
