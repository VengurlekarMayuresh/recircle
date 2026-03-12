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

    const transporters = await prisma.transporter.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(transporters);
  } catch (error: any) {
    console.error("Admin transporters GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transporters" },
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
    const { transporterId, availability_status } = body;

    if (!transporterId) {
      return NextResponse.json({ error: "Transporter ID required" }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (availability_status) dataToUpdate.availabilityStatus = availability_status;

    const updatedTransporter = await prisma.transporter.update({
      where: { id: transporterId },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedTransporter);
  } catch (error: any) {
    console.error("Admin transporter PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update transporter" },
      { status: 500 }
    );
  }
}
