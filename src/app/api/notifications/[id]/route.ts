import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 })

    await prisma.notification.updateMany({
      where: { id, userId: session.user.id },
      data: { read: true }
    })

    return NextResponse.json({ message: "Marked as read" })
  } catch {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
