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

    const flaggedListings = await prisma.fraudFlag.findMany({
      include: {
        material: {
          select: {
            title: true,
            images: true,
            status: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { riskScore: "desc" },
    });

    return NextResponse.json(flaggedListings);
  } catch (error: any) {
    console.error("Admin flagged GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch flagged listings" },
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
    const { flagId, status } = body;

    if (!flagId || !status) {
      return NextResponse.json(
        { error: "Flag ID and new status are required" },
        { status: 400 }
      );
    }

    // Update the flag status
    const updatedFlag = await prisma.fraudFlag.update({
      where: { id: flagId },
      data: {
        status,
        reviewedBy: session.user.id,
      },
    });

    // Take actions based on status
    if (status === "cleared" && updatedFlag.materialId) {
      // If cleared, make sure the material is available again if it was auto-hidden
      await prisma.material.update({
        where: { id: updatedFlag.materialId },
        data: { status: "available" },
      });
    } else if (status === "banned" && updatedFlag.materialId) {
      // If rejected, archive the material
      await prisma.material.update({
        where: { id: updatedFlag.materialId },
        data: { status: "archived" },
      });
      // Further logic to ban user could go here
    }

    return NextResponse.json(updatedFlag);
  } catch (error: any) {
    console.error("Admin flagged PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update flagged listing" },
      { status: 500 }
    );
  }
}
