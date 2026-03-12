import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function PATCH() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true }
    })

    return NextResponse.json({ message: "All notifications marked as read" })
  } catch {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
