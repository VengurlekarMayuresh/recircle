import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

/**
 * POST /api/volunteer/verify
 *
 * Volunteer submits verification documents (selfie, ID proof, vehicle photo).
 * Body: { selfieUrl, idProofUrl, vehiclePhotoUrl, addressProofUrl? }
 *
 * Creates VolunteerVerification with status "pending".
 * Admin reviews and approves/rejects via admin panel.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get transporter profile
    const transporter = await prisma.transporter.findUnique({
      where: { userId },
      include: { verification: true },
    })

    if (!transporter) {
      return NextResponse.json({ error: "Not a registered transporter" }, { status: 403 })
    }

    // Check if already verified
    if (transporter.verification?.status === "verified") {
      return NextResponse.json({ error: "Already verified" }, { status: 400 })
    }

    const body = await req.json()
    const { selfieUrl, idProofUrl, vehiclePhotoUrl, addressProofUrl } = body

    if (!selfieUrl || !idProofUrl || !vehiclePhotoUrl) {
      return NextResponse.json(
        { error: "selfieUrl, idProofUrl, and vehiclePhotoUrl are required" },
        { status: 400 }
      )
    }

    // Upsert: update if exists (e.g. re-submission after rejection), create if new
    const verification = await prisma.volunteerVerification.upsert({
      where: { transporterId: transporter.id },
      update: {
        selfieUrl,
        idProofUrl,
        vehiclePhotoUrl,
        addressProofUrl: addressProofUrl || null,
        status: "pending",
        reviewedAt: null,
      },
      create: {
        transporterId: transporter.id,
        selfieUrl,
        idProofUrl,
        vehiclePhotoUrl,
        addressProofUrl: addressProofUrl || null,
        status: "pending",
      },
    })

    return NextResponse.json(verification, { status: 201 })
  } catch (error) {
    console.error("[Volunteer Verify POST]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

/**
 * GET /api/volunteer/verify
 * Returns current verification status for the logged-in volunteer.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const transporter = await prisma.transporter.findUnique({
      where: { userId: session.user.id },
      include: { verification: true },
    })

    if (!transporter) {
      return NextResponse.json({ error: "Not a registered transporter" }, { status: 403 })
    }

    return NextResponse.json(transporter.verification || { status: "none" })
  } catch (error) {
    console.error("[Volunteer Verify GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
