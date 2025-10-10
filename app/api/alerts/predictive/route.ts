import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { routeId, threshold = 30 } = await req.json();

    // Get prediction data
    const predictionResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/schedule-predict?routeId=${routeId}&threshold=${threshold}`);
    const predictionData = await predictionResponse.json();

    if (!predictionData.success) {
      return NextResponse.json(
        { error: "Failed to get prediction data" },
        { status: 500 }
      );
    }

    const { prediction } = predictionData;

    // Only create alert if deviation exceeds threshold
    if (prediction.alert && prediction.deviation > threshold) {
      const alert = await prisma.alert.create({
        data: {
          shipmentId: prediction.latestShipment?.routeId || 'unknown',
          type: 'Predictive Warning',
          severity: prediction.deviation > threshold * 1.5 ? 'high' : 'medium',
          description: `Predicted delay deviation of ${Math.round(prediction.deviation)} minutes exceeds threshold of ${threshold} minutes. Expected delay: ${Math.round(prediction.predictedDelay)} minutes.`,
        },
      });

      return NextResponse.json({
        success: true,
        alert,
        prediction
      });
    }

    return NextResponse.json({
      success: true,
      message: "No alert needed - deviation within threshold",
      prediction
    });

  } catch (error) {
    console.error("Predictive Alert Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to create predictive alert", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
