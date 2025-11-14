import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest, requireRole } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    const guard = requireRole(session, ["OPERATOR", "ANALYST", "ADMIN"]);
    if (!guard.ok) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 10));

    const regions = await prisma.regionalRiskProfile.findMany({
      orderBy: [ { avgRisk: "desc" }, { totalAnalyses: "desc" } ],
      take: limit
    } as any);

    return NextResponse.json({ success: true, regions });
  } catch (error) {
    console.error("GET /api/risks/regions error:", error);
    return NextResponse.json({ error: "Failed to fetch regions" }, { status: 500 });
  }
}
