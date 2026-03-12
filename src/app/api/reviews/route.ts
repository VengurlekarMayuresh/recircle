import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const reviews = await prisma.review.findMany({
    where: { reviewerId: (session.user as any).id },
    include: { reviewee: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(reviews)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { transactionId, revieweeId, rating, comment, reviewType } = await req.json()
  if (!transactionId || !revieweeId || !rating || !reviewType)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const existing = await prisma.review.findFirst({
    where: { transactionId, reviewerId: (session.user as any).id, reviewType },
  })
  if (existing) return NextResponse.json({ error: "Already reviewed" }, { status: 409 })

  const review = await prisma.review.create({
    data: {
      transactionId,
      reviewerId: (session.user as any).id,
      revieweeId,
      rating,
      comment,
      reviewType,
    },
  })

  // Update reviewee avg rating
  const allReviews = await prisma.review.findMany({ where: { revieweeId } })
  const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
  await prisma.user.update({
    where: { id: revieweeId },
    data: { avgRating: avg, totalRatings: allReviews.length },
  })

  return NextResponse.json(review, { status: 201 })
}
