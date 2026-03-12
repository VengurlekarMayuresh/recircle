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

    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        transaction: {
          include: {
            material: { select: { title: true } },
          },
        },
        raiser: {
          select: { name: true, role: true, trustScore: true, verificationLevel: true },
        },
        resolver: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(disputes);
  } catch (error: any) {
    console.error("Admin disputes GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch disputes" },
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
    const { disputeId, status, resolution, notifyUsers } = body;

    if (!disputeId) {
      return NextResponse.json({ error: "Dispute ID required" }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (resolution) dataToUpdate.resolution = resolution;
    if (status === "resolved") {
      dataToUpdate.resolvedAt = new Date();
      dataToUpdate.resolvedBy = session.user.id;
    } else if (status === "reviewing") {
      dataToUpdate.resolvedBy = session.user.id;
    }

    const updatedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: dataToUpdate,
      include: { transaction: true }
    });

    // Ideally, if notifyUsers is true, send notifications
    // e.g. await sendNotification(updatedDispute.transaction.supplier_id, "Dispute updated")
    // e.g. await sendNotification(updatedDispute.transaction.receiver_id, "Dispute updated")

    return NextResponse.json(updatedDispute);
  } catch (error: any) {
    console.error("Admin dispute PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update dispute" },
      { status: 500 }
    );
  }
}
