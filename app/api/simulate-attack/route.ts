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
    // Parse JSON safely to avoid hard failures on malformed bodies
    const raw = await req.text();
    let userId: string | undefined;
    try {
      const parsed = JSON.parse(raw || '{}');
      userId = parsed.userId;
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON', message: 'Request body must be valid JSON with a userId string.' }, { status: 400 });
    }
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing userId', message: 'Provide a valid userId in the JSON body.' }, { status: 400 });
    }
    
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
    
    // 30% chance of missing/overdue shipment (no actual ETA yet)
    const isMissing = Math.random() < 0.3;
    const actualETA = isMissing ? null : new Date(expectedETA.getTime() + (scenario.delayMinutes * 60 * 1000));

    // Telemetry generation for attack scenarios
    const cities = [
      'Seattle, WA', 'Tacoma, WA', 'Spokane, WA', 'Portland, OR', 'Boise, ID',
      'Missoula, MT', 'Yakima, WA', 'Eugene, OR', 'Salem, OR', 'Bellingham, WA'
    ];
    const origin = cities[Math.floor(Math.random() * cities.length)];
    let destination = cities[Math.floor(Math.random() * cities.length)];
    if (destination === origin) destination = cities[(cities.indexOf(origin) + 1) % cities.length];
    let gpsOnline: boolean | null = true;
    let lastKnownAt: Date | null = new Date(baseTime.getTime() - 10 * 60 * 1000);
    let lastKnownLat: number | null = 45 + Math.random() * 5;
    let lastKnownLng: number | null = -123 + Math.random() * 5;
    let speedKph: number | null = Math.max(0, Math.round(80 + (Math.random() - 0.5) * 40));
    let headingDeg: number | null = Math.floor(Math.random() * 360);

    if (scenario.type === 'Cyber Attack') {
      gpsOnline = false;
      lastKnownAt = new Date(baseTime.getTime() - 40 * 60 * 1000);
      speedKph = 0;
    } else if (scenario.type === 'Cargo Tampering') {
      speedKph = 0;
      lastKnownAt = new Date(baseTime.getTime() - 45 * 60 * 1000);
      gpsOnline = true;
    }

    // Create the shipment with attack scenario - this is just suspicious data, no alert yet
    // The defense agent should detect this as an anomaly
    const shipment = await prisma.shipment.create({
      data: ({
        routeId,
        driverName,
        expectedETA,
        actualETA,
        routeStatus: "in-progress", // Don't mark as compromised - let the AI detect it
        lastUpdated: new Date(),
        origin,
        destination,
        gpsOnline,
        lastKnownAt,
        lastKnownLat,
        lastKnownLng,
        speedKph,
        headingDeg,
      } as any)
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
            actualETA: actualETA ? actualETA.toISOString() : null,
            userId,
            driverName,
            attackScenario: scenario, // Pass scenario for enhanced analysis
            origin,
            destination,
            gpsOnline,
            lastKnownAt: lastKnownAt?.toISOString() || undefined,
            lastKnownLat,
            lastKnownLng,
            speedKph,
            headingDeg,
          },
          {
            headers: { "Content-Type": "application/json" }
          }
        );
        
        defenseAnalysis = defenseResponse.data;
      } catch (error: any) {
        const status = error?.response?.status;
        const data = error?.response?.data;
        console.error("Defense agent analysis failed:", error);
        defenseAnalysis = { message: "Defense agent failed to analyze shipment", status, details: data };
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