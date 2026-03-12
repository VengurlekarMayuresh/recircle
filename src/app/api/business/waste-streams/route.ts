import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const parsePositiveFloat = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const parsePositiveInt = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const handlePrismaError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021") {
      return NextResponse.json(
        { error: "Waste streams table is missing. Run: npx prisma db push" },
        { status: 500 }
      );
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Selected category is invalid or no longer exists" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "business") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wasteStreams = await prisma.businessWasteStream.findMany({
      where: { userId: session.user.id },
      include: { category: true },
      orderBy: { lastUpdated: "desc" },
    });

    return NextResponse.json({ wasteStreams });
  } catch (error) {
    console.error("[BusinessWasteStreams] GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "business") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { categoryId, monthlyVolumeKg, title, description, tags, unit } = body;

    if (!categoryId || !monthlyVolumeKg) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedCategoryId = parsePositiveInt(categoryId);
    const parsedMonthlyVolumeKg = parsePositiveFloat(monthlyVolumeKg);

    if (!parsedCategoryId || !parsedMonthlyVolumeKg) {
      return NextResponse.json(
        { error: "Category and monthly volume must be valid positive values" },
        { status: 400 }
      );
    }

    // Check if a stream for this category already exists for this user
    const existing = await prisma.businessWasteStream.findFirst({
      where: { userId: session.user.id, categoryId: parsedCategoryId },
    });

    if (existing) {
      return NextResponse.json({ error: "Waste stream for this category already exists" }, { status: 400 });
    }

    const newStream = await prisma.businessWasteStream.create({
      data: {
        userId: session.user.id,
        categoryId: parsedCategoryId,
        monthlyVolumeKg: parsedMonthlyVolumeKg,
        unit: unit || "kg",
        title: title || null,
        description: description || null,
        tags: Array.isArray(tags) ? JSON.stringify(tags) : null,
      },
      include: { category: true },
    });

    return NextResponse.json({ wasteStream: newStream }, { status: 201 });
  } catch (error) {
    console.error("[BusinessWasteStreams] POST Error:", error);
    return handlePrismaError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "business") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, monthlyVolumeKg, status, title, description, tags, unit } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing stream ID" }, { status: 400 });
    }

    const parsedId = parsePositiveInt(id);
    if (!parsedId) {
      return NextResponse.json({ error: "Invalid stream ID" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.businessWasteStream.findUnique({
      where: { id: parsedId },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const updateData: any = { lastUpdated: new Date() };
    if (monthlyVolumeKg !== undefined) {
      const parsedMonthlyVolumeKg = parsePositiveFloat(monthlyVolumeKg);
      if (!parsedMonthlyVolumeKg) {
        return NextResponse.json(
          { error: "Monthly volume must be a valid positive value" },
          { status: 400 }
        );
      }
      updateData.monthlyVolumeKg = parsedMonthlyVolumeKg;
    }
    if (unit !== undefined) updateData.unit = unit;
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? JSON.stringify(tags) : null;

    const updatedStream = await prisma.businessWasteStream.update({
      where: { id: parsedId },
      data: updateData,
      include: { category: true },
    });

    return NextResponse.json({ wasteStream: updatedStream });
  } catch (error) {
    console.error("[BusinessWasteStreams] PATCH Error:", error);
    return handlePrismaError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "business") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing stream ID" }, { status: 400 });
    }

    const parsedId = parsePositiveInt(id);
    if (!parsedId) {
      return NextResponse.json({ error: "Invalid stream ID" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.businessWasteStream.findUnique({
      where: { id: parsedId },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    await prisma.businessWasteStream.delete({
      where: { id: parsedId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BusinessWasteStreams] DELETE Error:", error);
    return handlePrismaError(error);
  }
}
