import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import axios from "axios";
import { logActivity } from "@/lib/agentActivity";

// Attack simulation scenarios
const ATTACK_SCENARIOS = [
  {
    type: "Route Manipulation",
    description: "Suspicious route deviation detected - vehicle diverted 15 miles off planned route",
    delayMinutes: Math.floor(Math.random() * 60) + 30, // 30-90 minutes delay
    riskFactors: ["GPS spoofing", "unauthorized route change", "potential hijacking"]
  },
  {
    type: "ETA Manipulation", 
    description: "Delivery time tampering detected - ETA artificially extended",
    delayMinutes: Math.floor(Math.random() * 120) + 60, // 60-180 minutes delay
    riskFactors: ["time fraud", "driver collusion", "schedule manipulation"]
  },
  {
    type: "Cargo Tampering",
    description: "Unexpected stop detected at unauthorized location for extended period", 
    delayMinutes: Math.floor(Math.random() * 45) + 15, // 15-60 minutes delay
    riskFactors: ["cargo theft", "unauthorized access", "security breach"]
  },
  {
    type: "Cyber Attack",
    description: "Anomalous data patterns suggest potential system compromise",
    delayMinutes: Math.floor(Math.random() * 30) + 5, // 5-35 minutes delay
    riskFactors: ["data injection", "system breach", "malware infection"]
  },
  {
    type: "Driver Impersonation",
    description: "Biometric authentication failure - unauthorized driver detected",
    delayMinutes: Math.floor(Math.random() * 90) + 20, // 20-110 minutes delay
    riskFactors: ["identity theft", "insider threat", "credential compromise"]
  }
];

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    
    // Check if user exists and get agent status
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate random attack scenario
    const scenario = ATTACK_SCENARIOS[Math.floor(Math.random() * ATTACK_SCENARIOS.length)];
    const routeId = `R-ATK-${Date.now()}`;
    const driverName = `Driver ${Math.floor(Math.random() * 100) + 1}`;
    
    const baseTime = new Date();
    const expectedETA = new Date(baseTime.getTime() + (2 * 60 * 60 * 1000)); // 2 hours from now
    const actualETA = new Date(expectedETA.getTime() + (scenario.delayMinutes * 60 * 1000)); // Add delay

    // Create the shipment with attack scenario - this is just suspicious data, no alert yet
    // The defense agent should detect this as an anomaly
    const shipment = await prisma.shipment.create({
      data: {
        routeId,
        driverName,
        expectedETA,
        actualETA,
        routeStatus: "in-progress", // Don't mark as compromised - let the AI detect it
        lastUpdated: new Date()
      }
    });

    // Activity log for creation
    logActivity({
      userId,
      type: 'suspicious_shipment_created',
      status: 'completed',
      shipmentId: routeId,
      description: `Suspicious shipment created (${scenario.type})`,
      metadata: { delayMinutes: scenario.delayMinutes }
    });

    // Now trigger the defense agent to analyze this shipment
    let defenseAnalysis = null;
    if (user.agentActive) {
      try {
        // Call the defense agent to analyze this new shipment
        const defenseResponse = await axios.post(
          `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai`,
          {
            routeId,
            expectedETA: expectedETA.toISOString(),
            actualETA: actualETA.toISOString(),
            userId,
            driverName,
            attackScenario: scenario // Pass scenario for enhanced analysis
          },
          {
            headers: { "Content-Type": "application/json" }
          }
        );
        
        defenseAnalysis = defenseResponse.data;
      } catch (error) {
        console.error("Defense agent analysis failed:", error);
        defenseAnalysis = { message: "Defense agent failed to analyze shipment" };
      }
    }

    return NextResponse.json({
      success: true,
      shipment,
      scenario: {
        type: scenario.type,
        description: scenario.description,
        delayMinutes: scenario.delayMinutes,
        riskFactors: scenario.riskFactors
      },
      defenseAnalysis,
      agentActive: user.agentActive,
      message: user.agentActive 
        ? "Suspicious shipment created and analyzed by defense agent"
        : "Suspicious shipment created but NOT analyzed (agent inactive)"
    });

  } catch (error) {
    console.error("Simulate attack error:", error);
    return NextResponse.json(
      { error: "Failed to simulate attack" },
      { status: 500 }
    );
  }
}