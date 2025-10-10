import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface ShipmentData {
  id: string;
  expectedETA: Date;
  actualETA: Date | null;
  predictedDelay: number | null;
  createdAt: Date;
}

// Simple linear regression implementation
function calculateLinearRegression(data: number[][]): { slope: number; intercept: number; rSquared: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

  // Calculate sums
  const sumX = data.reduce((sum, [x]) => sum + x, 0);
  const sumY = data.reduce((sum, [, y]) => sum + y, 0);
  const sumXY = data.reduce((sum, [x, y]) => sum + x * y, 0);
  const sumXX = data.reduce((sum, [x]) => sum + x * x, 0);
  const sumYY = data.reduce((sum, [, y]) => sum + y * y, 0);

  // Calculate slope and intercept
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  const ssRes = data.reduce((sum, [x, y]) => {
    const predicted = slope * x + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  const ssTot = data.reduce((sum, [, y]) => sum + Math.pow(y - yMean, 2), 0);
  const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

  return { slope, intercept, rSquared };
}

// Moving average calculation
function calculateMovingAverage(data: number[], windowSize: number): number {
  if (data.length === 0) return 0;
  if (data.length < windowSize) {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }
  
  const recentData = data.slice(-windowSize);
  return recentData.reduce((sum, val) => sum + val, 0) / windowSize;
}

// Calculate delay in minutes between two dates
function calculateDelayMinutes(expected: Date, actual: Date): number {
  return (actual.getTime() - expected.getTime()) / (1000 * 60);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get('routeId');
    const threshold = parseFloat(searchParams.get('threshold') || '30'); // Default 30 minutes

    // Fetch recent shipments with actual ETAs (completed shipments)
    const whereClause = routeId 
      ? { routeId, actualETA: { not: null } }
      : { actualETA: { not: null } };

    const shipments = await prisma.shipment.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50, // Use last 50 completed shipments for prediction
    });

    if (shipments.length < 3) {
      return NextResponse.json({
        success: true,
        prediction: {
          predictedDelay: 0,
          confidence: 'low',
          deviation: 0,
          threshold,
          alert: false,
          method: 'insufficient_data',
          dataPoints: shipments.length
        }
      });
    }

    // Calculate actual delays for historical data
    const historicalDelays: number[] = [];
    const timeSeriesData: number[][] = [];

    shipments.forEach((shipment, index) => {
      if (shipment.actualETA) {
        const delay = calculateDelayMinutes(shipment.expectedETA, shipment.actualETA);
        historicalDelays.push(delay);
        // Use index as time series X value (days/weeks ago)
        timeSeriesData.push([shipments.length - index, delay]);
      }
    });

    // Calculate predictions using both methods
    const movingAvgWindow = Math.min(10, Math.floor(historicalDelays.length / 3));
    const movingAveragePrediction = calculateMovingAverage(historicalDelays, movingAvgWindow);
    
    const regressionResult = calculateLinearRegression(timeSeriesData);
    const linearRegressionPrediction = regressionResult.slope * (shipments.length + 1) + regressionResult.intercept;

    // Combine predictions (weighted average favoring moving average for short-term prediction)
    const predictedDelay = (movingAveragePrediction * 0.7) + (linearRegressionPrediction * 0.3);

    // Get the most recent shipment for comparison
    const latestShipment = await prisma.shipment.findFirst({
      where: { actualETA: null }, // Active shipments
      orderBy: { createdAt: 'desc' }
    });

    let currentDeviation = 0;
    if (latestShipment) {
      const now = new Date();
      const currentDelay = calculateDelayMinutes(latestShipment.expectedETA, now);
      currentDeviation = Math.abs(currentDelay - predictedDelay);
    }

    // Determine if alert should be triggered
    const alert = currentDeviation > threshold;

    // Update the latest shipment with predicted delay if it exists
    if (latestShipment) {
      await prisma.shipment.update({
        where: { id: latestShipment.id },
        data: { predictedDelay }
      });
    }

    // Determine confidence level
    let confidence = 'low';
    if (historicalDelays.length >= 20) confidence = 'high';
    else if (historicalDelays.length >= 10) confidence = 'medium';

    return NextResponse.json({
      success: true,
      prediction: {
        predictedDelay: Math.round(predictedDelay * 100) / 100,
        confidence,
        deviation: Math.round(currentDeviation * 100) / 100,
        threshold,
        alert,
        method: 'combined',
        dataPoints: historicalDelays.length,
        movingAverage: Math.round(movingAveragePrediction * 100) / 100,
        linearRegression: Math.round(linearRegressionPrediction * 100) / 100,
        rSquared: Math.round(regressionResult.rSquared * 1000) / 1000,
        latestShipment: latestShipment ? {
          id: latestShipment.id,
          routeId: latestShipment.routeId,
          expectedETA: latestShipment.expectedETA,
          predictedDelay
        } : null
      }
    });

  } catch (error) {
    console.error("Schedule Prediction Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to predict schedule delays", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { routeId, threshold = 30 } = await req.json();

    // Trigger prediction for specific route
    const predictionResponse = await GET(
      new Request(`${req.url}?routeId=${routeId}&threshold=${threshold}`)
    );

    return predictionResponse;

  } catch (error) {
    console.error("Schedule Prediction POST Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to trigger schedule prediction", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
