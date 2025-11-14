import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest, requireRole } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    const guard = requireRole(session, ["ANALYST", "ADMIN"]);
    if (!guard.ok) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to 100 most recent alerts
    });

    return NextResponse.json({
      success: true,
      alerts
    });

  } catch (error) {
    console.error("Get Alerts Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    const guard = requireRole(session, ["ADMIN"]);
    if (!guard.ok) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const alertId = searchParams.get('id');

    if (!alertId) {
      return NextResponse.json(
        { error: "Alert ID is required" },
        { status: 400 }
      );
    }

    const del = await prisma.alert.deleteMany({
      where: { id: alertId },
    });

    if (del.count === 0) {
      return NextResponse.json(
        { error: "Alert not found", message: `No alert with id '${alertId}'` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Alert deleted successfully"
    });

  } catch (error) {
    console.error("Delete Alert Error:", error);
    return NextResponse.json(
      { error: "Failed to delete alert", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}