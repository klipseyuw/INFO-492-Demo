// app/api/database/access-events/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest, requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  const guard = requireRole(session, ["ANALYST", "ADMIN"]);
  if (!guard.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "150");

    const events = await prisma.databaseAccessEvent.findMany({
      take: limit,
      orderBy: { timestamp: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            region: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error("[DATABASE/ACCESS-EVENTS] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch access events" },
      { status: 500 }
    );
  }
}
