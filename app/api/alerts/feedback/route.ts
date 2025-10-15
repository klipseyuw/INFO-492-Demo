import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST: Submit feedback for an alert
export async function POST(req: Request) {
  try {
    const {
      alertId,
      riskScoreAccurate,
      attackTypeCorrect,
      actualAttackType,
      actualRiskScore,
      notes,
      aiRiskScore,
      aiAttackType,
      shipmentContext
    } = await req.json();

    if (!alertId) {
      return NextResponse.json(
        { error: "Alert ID is required" },
        { status: 400 }
      );
    }

    // Check if alert exists
    const alert = await prisma.alert.findUnique({
      where: { id: alertId }
    });

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    // Create or update feedback
    const feedback = await prisma.alertFeedback.upsert({
      where: { alertId },
      update: {
        riskScoreAccurate,
        attackTypeCorrect,
        actualAttackType,
        actualRiskScore,
        notes
      },
      create: {
        alertId,
        riskScoreAccurate,
        attackTypeCorrect,
        actualAttackType,
        actualRiskScore,
        notes,
        aiRiskScore: aiRiskScore || 0,
        aiAttackType: aiAttackType || 'unknown',
        shipmentContext: shipmentContext || '{}'
      }
    });

    console.log(`[FEEDBACK] Alert ${alertId}: Risk=${riskScoreAccurate ? '✓' : '✗'}, Type=${attackTypeCorrect ? '✓' : '✗'}`);

    return NextResponse.json({
      success: true,
      feedback
    });

  } catch (error) {
    console.error("Submit Feedback Error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// GET: Retrieve feedback for learning (used by AI system)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const onlyAccurate = searchParams.get('accurate') === 'true';
    
    // Retrieve feedback with alert details
    const feedbacks = await prisma.alertFeedback.findMany({
      where: onlyAccurate ? {
        riskScoreAccurate: true,
        attackTypeCorrect: true
      } : undefined,
      include: {
        alert: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Format for AI learning context
    const learningExamples = feedbacks.map((fb: typeof feedbacks[0]) => {
      try {
        const context = JSON.parse(fb.shipmentContext);
        return {
          scenario: context,
          aiPrediction: {
            riskScore: fb.aiRiskScore,
            attackType: fb.aiAttackType
          },
          actualResult: {
            riskScore: fb.actualRiskScore || fb.aiRiskScore,
            attackType: fb.actualAttackType || fb.aiAttackType,
            wasAccurate: fb.riskScoreAccurate && fb.attackTypeCorrect
          },
          feedback: fb.notes
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      count: learningExamples.length,
      examples: learningExamples
    });

  } catch (error) {
    console.error("Get Feedback Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve feedback", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
