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
    const [totalAnalyses, alertsCreated, feedback, allAnalyses] = await Promise.all([
      prisma.analysis.count({ where: { createdAt: { gte: since } } }),
      prisma.alert.count({ where: { createdAt: { gte: since } } }),
      prisma.alertFeedback.findMany({
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

    // Calculate accuracy
    const accuratePredictions = feedback.filter(
      (f) => f.riskScoreAccurate && f.attackTypeCorrect
    ).length;
    const accuracyRate =
      feedback.length > 0
        ? ((accuratePredictions / feedback.length) * 100).toFixed(1)
        : null;

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
        : null;

    // Thesis validation logic: TRUE if accuracy > 70% with at least 10 feedback samples
    let thesisValidation: "TRUE" | "FALSE" | "PENDING" = "PENDING";
    if (accuracyRate !== null && feedback.length >= 10) {
      thesisValidation = parseFloat(accuracyRate) >= 70 ? "TRUE" : "FALSE";
    }

    return NextResponse.json({
      success: true,
      timePeriod: `${days} days`,
      metrics: {
        totalAnalyses,
        alertsCreated,
        feedbackReceived: feedback.length,
        accurateFeedback: accuratePredictions,
        accuracyRate: accuracyRate ? `${accuracyRate}%` : "N/A",
        avgRiskScore: avgRiskScore || "N/A",
        severityDistribution: severityCounts,
      },
      thesisValidation,
      thesisStatement:
        "AI agents can autonomously detect supply chain threats with >70% accuracy by learning from human feedback over continuous operation.",
      validationCriteria: {
        minimumFeedback: 10,
        targetAccuracy: "70%",
        currentProgress: `${feedback.length}/10 feedback samples`,
      },
    });
  } catch (error) {
    console.error("Thesis validation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
