import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const daysParam = url.searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Gather metrics
    const [totalAnalyses, alertsCreated, alertFeedback, analysisFeedback, allAnalyses] = await Promise.all([
      prisma.analysis.count({ where: { createdAt: { gte: since } } }),
      prisma.alert.count({ where: { createdAt: { gte: since } } }),
      prisma.alertFeedback.findMany({
        where: { createdAt: { gte: since } },
        select: {
          riskScoreAccurate: true,
          attackTypeCorrect: true,
        },
      }),
      prisma.analysisFeedback.findMany({
        where: { createdAt: { gte: since } },
        select: {
          riskScoreAccurate: true,
          attackTypeCorrect: true,
        },
      }),
      prisma.analysis.findMany({
        where: { createdAt: { gte: since } },
        select: { riskScore: true, severity: true },
      }),
    ]);

    // Calculate accuracy (combine both feedback sources)
    const allFeedback = [...alertFeedback, ...analysisFeedback];
    const accuratePredictions = allFeedback.filter(
      (f) => f.riskScoreAccurate && f.attackTypeCorrect
    ).length;
    const accuracyRate =
      allFeedback.length > 0
        ? ((accuratePredictions / allFeedback.length) * 100).toFixed(1)
        : "N/A";

    // Severity distribution
    const severityCounts = allAnalyses.reduce(
      (acc, a) => {
        acc[a.severity] = (acc[a.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Average risk score
    const avgRiskScore =
      allAnalyses.length > 0
        ? (
            allAnalyses.reduce((sum, a) => sum + a.riskScore, 0) /
            allAnalyses.length
          ).toFixed(1)
        : "N/A";

    return NextResponse.json({
      success: true,
      timePeriod: `${days} days`,
      metrics: {
        totalAnalyses,
        alertsCreated,
        feedbackReceived: allFeedback.length,
        accurateFeedback: accuratePredictions,
        accuracyRate: accuracyRate !== "N/A" ? `${accuracyRate}%` : "N/A",
        avgRiskScore: avgRiskScore,
        severityDistribution: severityCounts,
      },
    });
  } catch (error) {
    console.error("Accuracy metrics error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
