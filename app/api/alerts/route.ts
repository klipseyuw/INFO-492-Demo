import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
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
    const { searchParams } = new URL(req.url);
    const alertId = searchParams.get('id');

    if (!alertId) {
      return NextResponse.json(
        { error: "Alert ID is required" },
        { status: 400 }
      );
    }

    await prisma.alert.delete({
      where: { id: alertId },
    });

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