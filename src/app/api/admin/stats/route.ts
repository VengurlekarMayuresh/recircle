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

    const [
      totalUsers,
      totalActiveListings,
      totalTransactions,
      totalCo2SavedData,
      openDisputes,
      flaggedListings,
      pendingVerifications,
      recentActivityData
    ] = await Promise.all([
      prisma.user.count(),
      prisma.material.count({ where: { status: "available" } }),
      prisma.transaction.count(),
      prisma.material.aggregate({ _sum: { co2SavedKg: true } }),
      prisma.dispute.count({ where: { status: "open" } }),
      prisma.fraudFlag.count({ where: { status: "pending" } }),
      prisma.volunteerVerification.count({ where: { status: "pending" } }),
      // Fetch some recent agent logs
      prisma.agentLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalCo2Saved = totalCo2SavedData._sum.co2SavedKg || 0;

    return NextResponse.json({
      stats: {
        totalUsers,
        totalActiveListings,
        totalTransactions,
        totalCo2Saved,
        openDisputes,
        flaggedListings,
        pendingVerifications,
      },
      recentActivity: recentActivityData,
    });
  } catch (error: any) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
