import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import axios from "axios";

// Simulate AI analysis when OpenRouter is unavailable
function simulateAIAnalysis(delayMinutes: number, routeId: string, driverName: string) {
  let riskScore = 0;
  let alertType = "normal_operation";
  let description = "Shipment proceeding normally";

  // Analyze delay patterns
  if (Math.abs(delayMinutes) > 120) { // 2+ hours delay
    riskScore = 85;
    alertType = "critical_delay";
    description = `Critical delay detected: ${Math.round(delayMinutes)} minutes. Possible route manipulation or cyber-physical attack.`;
  } else if (Math.abs(delayMinutes) > 60) { // 1+ hour delay
    riskScore = 65;
    alertType = "significant_delay";
    description = `Significant delay detected: ${Math.round(delayMinutes)} minutes. Monitoring for supply chain disruption.`;
  } else if (Math.abs(delayMinutes) > 30) { // 30+ minutes
    riskScore = 45;
    alertType = "moderate_delay";
    description = `Moderate delay detected: ${Math.round(delayMinutes)} minutes. Investigating potential causes.`;
  } else if (Math.abs(delayMinutes) > 15) { // 15+ minutes
    riskScore = 25;
    alertType = "minor_anomaly";
    description = `Minor timing anomaly detected: ${Math.round(delayMinutes)} minutes variance from expected ETA.`;
  }

  // Add randomness for demonstration (simulate AI uncertainty)
  const randomFactor = Math.random() * 0.2 - 0.1; // ±10%
  riskScore = Math.max(0, Math.min(100, riskScore + (riskScore * randomFactor)));

  // Occasionally generate alerts for normal shipments (false positives)
  if (riskScore < 20 && Math.random() < 0.1) {
    riskScore = 30;
    alertType = "pattern_anomaly";
    description = "Unusual delivery pattern detected. Requires verification.";
  }

  return {
    riskScore: Math.round(riskScore),
    alertType,
    description
  };
}

export async function POST(req: Request) {
  try {
    const { routeId, expectedETA, actualETA, userId, driverName } = await req.json();

    // Check if user exists and agent is active
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.agentActive) {
      return NextResponse.json({ message: "Agent is inactive" }, { status: 200 });
    }

    // Calculate time differences for analysis
    const expectedTime = new Date(expectedETA).getTime();
    const actualTime = actualETA ? new Date(actualETA).getTime() : Date.now();
    const delayMinutes = (actualTime - expectedTime) / (1000 * 60);

    const prompt = `
    You are a cybersecurity defense AI for logistics operations.
    Analyze this shipment data for potential anomalies, cyber-physical attacks, or operational disruptions:
    
    - Route ID: ${routeId}
    - Driver: ${driverName}
    - Expected ETA: ${expectedETA}
    - Actual ETA: ${actualETA || 'In transit'}
    - Delay: ${Math.round(delayMinutes)} minutes
    
    Look for:
    - Route manipulation (delays > 15 minutes)
    - Suspicious timing patterns
    - Data inconsistencies that could indicate cyber attacks
    - Supply chain disruption indicators
    
    Respond with valid JSON only:
    { "riskScore": <number 0-100>, "alertType": "<string>", "description": "<string>" }
    `;

    let result;
    
    try {
      // Try OpenRouter API with improved JSON parsing
      console.log("� Attempting OpenRouter API call...");
      console.log("🎯 Model:", "google/gemma-2-9b-it:free");
      
      const aiRes = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "google/gemma-2-9b-it:free",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150,
          temperature: 0.7,
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
            "X-Title": "Logistics Defense AI Platform",
          },
        }
      );

      const analysis = aiRes.data.choices?.[0]?.message?.content || '{"riskScore": 0, "alertType": "analysis_failed", "description": "AI analysis failed"}';
      
      // Advanced JSON extraction - handle multiple formats
      let jsonString = analysis;
      
      // Remove markdown code blocks
      jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Extract JSON object (more permissive)
      const jsonMatch = jsonString.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
      
      result = JSON.parse(jsonString);
      
    } catch (apiError) {
      console.warn("OpenRouter API failed, using local AI simulation:", apiError instanceof Error ? apiError.message : apiError);
      
      // Fallback: Use local AI simulation
      result = simulateAIAnalysis(delayMinutes, routeId, driverName);
    }

    // Save alert if risk score is significant
    if (result.riskScore > 20) {
      await prisma.alert.create({
        data: {
          shipmentId: routeId,
          type: result.alertType || "unknown",
          severity: result.riskScore > 70 ? "high" : result.riskScore > 40 ? "medium" : "low",
          description: result.description || "Anomaly detected",
        },
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
      analyzed: true
    });

  } catch (error) {
    console.error("AI Agent Error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}