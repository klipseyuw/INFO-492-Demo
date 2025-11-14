// app/api/database/anomalies/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest, requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  const guard = requireRole(session, ["ANALYST", "ADMIN"]);
  if (!guard.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    const anomalies = await prisma.databaseAnomaly.findMany({
      take: limit,
      orderBy: { timestamp: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, anomalies });
  } catch (error) {
    console.error("[DATABASE/ANOMALIES] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch anomalies" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  const guard = requireRole(session, ["ANALYST", "ADMIN"]);
  if (!guard.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { userId, type, severity, description, metadata } = body;

    const anomaly = await prisma.databaseAnomaly.create({
      data: {
        userId,
        type,
        severity,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, anomaly });
  } catch (error) {
    console.error("[DATABASE/ANOMALIES] Create error:", error);
    return NextResponse.json(
      { error: "Failed to create anomaly" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  const guard = requireRole(session, ["ADMIN"]);
  if (!guard.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await prisma.databaseAnomaly.deleteMany({});
    return NextResponse.json({ success: true, message: "All anomalies cleared" });
  } catch (error) {
    console.error("[DATABASE/ANOMALIES] Delete error:", error);
    return NextResponse.json(
      { error: "Failed to clear anomalies" },
      { status: 500 }
    );
  }
}
