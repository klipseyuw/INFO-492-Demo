// app/api/database/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest, requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  const guard = requireRole(session, ["ANALYST", "ADMIN"]);
  if (!guard.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const users = await prisma.databaseUser.findMany({
      orderBy: { lastLoginAt: "desc" },
      include: {
        _count: {
          select: {
            loginAttempts: true,
            accessEvents: true,
            anomalies: true,
          },
        },
      },
    });

    // Calculate recent metrics for each user
    const now = new Date();
    const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const usersWithMetrics = await Promise.all(
      users.map(async (user) => {
        // Count failed logins in last 10 minutes
        const failedLogin10m = await prisma.loginAttempt.count({
          where: {
            userId: user.id,
            success: false,
            timestamp: { gte: tenMinAgo },
          },
        });

        // Count table reads in last 5 minutes
        const tableReads5m = await prisma.databaseAccessEvent.count({
          where: {
            userId: user.id,
            action: "SELECT",
            timestamp: { gte: fiveMinAgo },
          },
        });

        // Sum sensitive data reads in last 5 minutes (from Users, Billing tables)
        const sensitiveReads = await prisma.databaseAccessEvent.findMany({
          where: {
            userId: user.id,
            tableName: { in: ["Users", "Billing", "Analyses", "Alerts"] },
            timestamp: { gte: fiveMinAgo },
          },
          select: { estSizeMB: true },
        });

        const sensitiveReadsMB5m = sensitiveReads.reduce(
          (sum, event) => sum + (event.estSizeMB || 0),
          0
        );

        return {
          ...user,
          failedLogin10m,
          tableReads5m,
          sensitiveReadsMB5m: Math.round(sensitiveReadsMB5m * 10) / 10,
        };
      })
    );

    return NextResponse.json({ success: true, users: usersWithMetrics });
  } catch (error) {
    console.error("[DATABASE/USERS] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
