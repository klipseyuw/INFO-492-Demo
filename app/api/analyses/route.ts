import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Retrieve all recent analyses (including safe predictions with risk ≤ 20)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Prefer persisted Analysis records for stable IDs and feedback linkage
    const analysesDb = await prisma.analysis.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });

  const analyses = analysesDb.map((a: typeof analysesDb[number]) => ({
      id: a.id,
      shipmentId: a.shipmentId,
      riskScore: a.riskScore,
      alertType: a.alertType,
      description: a.description,
      createdAt: a.createdAt,
      severity: a.severity,
      metadata: a.shipmentContext
    }));

    return NextResponse.json({ success: true, analyses });
  } catch (error) {
    console.error("Get Analyses Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analyses", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
