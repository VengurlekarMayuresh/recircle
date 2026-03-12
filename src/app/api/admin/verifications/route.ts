import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status) where.status = status;

    const verifications = await prisma.volunteerVerification.findMany({
      where,
      include: {
        transporter: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                city: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(verifications);
  } catch (error: any) {
    console.error("Admin verifications GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch verifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { verificationId, status } = body;

    if (!verificationId) {
      return NextResponse.json({ error: "Verification ID required" }, { status: 400 });
    }

    if (!["verified", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'verified' or 'rejected'" },
        { status: 400 }
      );
    }

    // Update verification status
    const updated = await prisma.volunteerVerification.update({
      where: { id: verificationId },
      data: {
        status,
        reviewedAt: new Date(),
      },
      include: {
        transporter: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    // If approved, update user's verification level
    if (status === "verified") {
      await prisma.user.update({
        where: { id: updated.transporter.userId },
        data: { verificationLevel: "verified" },
      });
    }

    // Notify the volunteer
    await prisma.notification.create({
      data: {
        userId: updated.transporter.userId,
        type: status === "verified" ? "verification_approved" : "verification_rejected",
        title: status === "verified"
          ? "Verification Approved! ✅"
          : "Verification Rejected ❌",
        body: status === "verified"
          ? "Your volunteer verification has been approved. You can now accept deliveries!"
          : "Your volunteer verification was not approved. Please re-submit clearer documents.",
        data: JSON.stringify({ verificationId: updated.id }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Admin verification PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update verification" },
      { status: 500 }
    );
  }
}
