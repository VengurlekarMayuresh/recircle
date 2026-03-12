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
    const categoryId = searchParams.get("category");
    const status = searchParams.get("status");
    const listingType = searchParams.get("listingType");

    const where: any = {};
    if (categoryId && categoryId !== "all" && categoryId !== "undefined") {
        const parsedId = parseInt(categoryId);
        if(!isNaN(parsedId)) where.categoryId = parsedId;
    }
    if (status && status !== "all") where.status = status;
    if (listingType && listingType !== "all") where.listingType = listingType;

    const materials = await prisma.material.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        category: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(materials);
  } catch (error: any) {
    console.error("Admin materials GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch materials" },
      { status: 500 }
    );
  }
}
