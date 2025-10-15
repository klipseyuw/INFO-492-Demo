import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST: Submit feedback for an analysis (covers safe predictions that didn't generate alerts)
export async function POST(req: Request) {
  try {
    const {
      analysisId,
      riskScoreAccurate,
      attackTypeCorrect,
      actualAttackType,
      actualRiskScore,
      notes
    } = await req.json();

    if (!analysisId) {
      return NextResponse.json(
        { error: "Analysis ID is required" },
        { status: 400 }
      );
    }

    // Check if analysis exists
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId }
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Create or update feedback for this analysis
    const feedback = await prisma.analysisFeedback.upsert({
      where: { analysisId },
      update: {
        riskScoreAccurate,
        attackTypeCorrect,
        actualAttackType,
        actualRiskScore,
        notes
      },
      create: {
        analysisId,
        riskScoreAccurate,
        attackTypeCorrect,
        actualAttackType,
        actualRiskScore,
        notes
      }
    });

    console.log(
      `[FEEDBACK] Analysis ${analysisId}: Risk=${riskScoreAccurate ? "✓" : "✗"}, Type=${attackTypeCorrect ? "✓" : "✗"}`
    );

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error("Submit Analysis Feedback Error:", error);
    return NextResponse.json(
      {
        error: "Failed to submit analysis feedback",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
