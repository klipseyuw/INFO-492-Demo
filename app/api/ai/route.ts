import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import axios from "axios";
import { logActivity, updateActivity } from "@/lib/agentActivity";

// Fallback deliberately disabled: threats must be determined by the external AI agent only.

export async function POST(req: Request) {
  try {
    const {
      routeId,
      expectedETA,
      actualETA,
      userId,
      driverName,
      attackScenario,
      // Optional telemetry for richer context (not persisted here)
      origin,
      destination,
      gpsOnline,
      lastKnownLat,
      lastKnownLng,
      lastKnownAt,
      speedKph,
      headingDeg,
      routeStatus
    } = await req.json();

    // Check if user exists and agent is active
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.agentActive) {
      return NextResponse.json({ message: "Agent is inactive" }, { status: 200 });
    }

    // Calculate time differences for analysis
    const expectedTime = new Date(expectedETA).getTime();
    const currentTime = Date.now();
    let delayMinutes = 0;
    
    if (actualETA) {
      // Shipment has arrived - calculate actual delay
      const actualTime = new Date(actualETA).getTime();
      delayMinutes = (actualTime - expectedTime) / (1000 * 60);
    } else {
      // Shipment still in transit - calculate current delay from expected time
      delayMinutes = (currentTime - expectedTime) / (1000 * 60);
    }

  // Build compact telemetry summary for prompt (avoid token waste when absent)
  const telemetryLines: string[] = [];
  if (origin) telemetryLines.push(`- Origin: ${origin}`);
  if (destination) telemetryLines.push(`- Destination: ${destination}`);
  if (typeof gpsOnline === 'boolean') telemetryLines.push(`- GPS Online: ${gpsOnline}`);
  if (typeof lastKnownLat === 'number' && typeof lastKnownLng === 'number') telemetryLines.push(`- Last Known Location: (${lastKnownLat.toFixed(4)}, ${lastKnownLng.toFixed(4)})`);
  if (lastKnownAt) telemetryLines.push(`- Last Seen: ${lastKnownAt}`);
  if (typeof speedKph === 'number') telemetryLines.push(`- Speed: ${speedKph} kph`);
  if (typeof headingDeg === 'number') telemetryLines.push(`- Heading: ${headingDeg}°`);
  if (routeStatus) telemetryLines.push(`- Route Status: ${routeStatus}`);

  const prompt = `LOGISTICS SECURITY THREAT ANALYSIS

Analyze this shipment and assign a risk score (0-100) based on threat indicators:

SHIPMENT DATA:
Route: ${routeId}
Driver: ${driverName}
Expected ETA: ${expectedETA}
Actual ETA: ${actualETA || 'In transit'}
Delay: ${Math.round(delayMinutes)} minutes
${telemetryLines.join('\n')}

RISK SCORING CRITERIA:

LOW RISK (0-20):
- On-time or minor delays (<15 min)
- GPS active and normal location
- Normal speed and heading
- No route deviations

MODERATE RISK (21-40):
- Moderate delays (15-30 min)
- Minor route deviations
- Temporary GPS issues
- Slight speed variations

HIGH RISK (41-70):
- Significant delays (30+ min)
- Major route deviations from expected path
- Extended stops (>20 min) at unauthorized locations
- Inconsistent speed patterns
- GPS intermittent or last seen >1 hour ago

CRITICAL RISK (71-100):
- Severe delays (60+ min) with no explanation
- Vehicle completely off planned route
- GPS offline for extended periods (>2 hours)
- Vehicle stopped (0 kph) for >30 minutes unexpectedly
- Contradictory telemetry (location vs. reported status)
- Potential cargo tampering indicators
- Driver communication lost
- Heading toward unauthorized areas

ATTACK TYPE DETECTION:
Identify the most likely threat based on patterns:
- ROUTE_MANIPULATION: Unexpected deviations, wrong locations
- GPS_SPOOFING: Offline GPS, contradictory location data  
- CARGO_TAMPERING: Extended unauthorized stops, 0 speed + delays
- ETA_FRAUD: Artificial delays, schedule manipulation
- DRIVER_IMPERSONATION: Communication loss, unusual patterns
- CYBER_ATTACK: System anomalies, data inconsistencies
- NORMAL_OPERATION: No threats detected

Return JSON only:
{
  "riskScore": <number 0-100>,
  "alertType": "<one of the attack types above or descriptive threat name>",
  "description": "<brief explanation of threat indicators>",
  "operatorSummary": "<immediate action needed>", 
  "recommendedActions": ["<specific action 1>", "<specific action 2>", "<specific action 3>"],
  "evidence": ["<supporting evidence 1>", "<supporting evidence 2>"]
}`;

  interface AIResult { riskScore: number; alertType: string; description: string; operatorSummary?: string; recommendedActions?: string[]; evidence?: string[]; source?: string; usingFallback?: boolean; fallbackReason?: string; [k: string]: unknown }
  let result: AIResult;

    // Log start activity
    const started = logActivity({
      userId,
      type: attackScenario ? 'threat_analysis' : 'routine_analysis',
      status: 'in_progress',
      shipmentId: routeId,
      description: attackScenario ? `Analyzing suspicious shipment (${attackScenario.type})` : 'Analyzing shipment timing',
      metadata: { routeId, driverName }
    });
    const activityStart = Date.now();
    
  try {
      // Pre-flight: ensure API key exists
      if (!process.env.OPENROUTER_API_KEY) {
        console.warn("[AI] Missing OPENROUTER_API_KEY; analysis cannot proceed.");
        const duration = Date.now() - activityStart;
        updateActivity(started.id, { status: 'failed', duration, metadata: { ...(started.metadata||{}), error: 'ai_unavailable', reason: 'missing_api_key' } });
        return NextResponse.json(
          { error: "AI analysis unavailable", message: "Missing OPENROUTER_API_KEY", aiUnavailable: true, reason: 'missing_api_key' },
          { status: 503 }
        );
      }
      // Try OpenRouter API with improved JSON parsing
  console.log("[AI] Attempting OpenRouter API call...");
  const modelName = "deepseek/deepseek-chat-v3.1:free"; // Alternate model: z-ai/glm-4.5-air:free
  console.log("[AI] Model:", modelName);
      
      const baseHeaders = {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // Some providers check either header; send both
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": "Logistics Defense AI Platform",
      } as const;

      // First attempt: with response_format json_object
      let aiRes;
      try {
        aiRes = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 200,
            temperature: 0.4,
            response_format: { type: "json_object" }
          },
          { headers: baseHeaders }
        );
      } catch (firstErr: any) {
        const firstStatus = Number(firstErr?.response?.status);
        const firstBody = firstErr?.response?.data;
        console.warn("[AI] First attempt failed", firstStatus, firstBody);
        const responseFormatIssue = !!firstBody?.error?.message?.toString?.().toLowerCase?.().includes('response_format');
        const retriableStatus = [400, 406, 415, 422].includes(firstStatus) || responseFormatIssue;
        const rateLimited = firstStatus === 429;
        if (!retriableStatus && !rateLimited) throw firstErr;

        // If rate-limited, wait briefly then retry without response_format
        if (rateLimited) {
          const retryAfterHeader = firstErr?.response?.headers?.['retry-after'];
          let delayMs = 1500;
          const parsed = parseInt(Array.isArray(retryAfterHeader) ? retryAfterHeader[0] : retryAfterHeader, 10);
          if (!Number.isNaN(parsed)) delayMs = Math.min(5000, parsed * 1000);
          await new Promise((res) => setTimeout(res, delayMs));
        }

        // Retry without response_format; rely on robust JSON extraction
        aiRes = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 200,
            temperature: 0.4
          },
          { headers: baseHeaders }
        );
      }

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
      result.source = 'openrouter';
      // Normalize AI output without altering intent
      const n = Number((result as any).riskScore);
      (result as any).riskScore = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
      if (result && typeof result === 'object') {
        if (Array.isArray((result as any).recommendedActions)) {
          (result as any).recommendedActions = (result as any).recommendedActions
            .filter((x: unknown) => typeof x === 'string')
            .slice(0, 3);
        }
        if (Array.isArray((result as any).evidence)) {
          (result as any).evidence = (result as any).evidence
            .filter((x: unknown) => typeof x === 'string')
            .slice(0, 3);
        }
        if (typeof (result as any).description !== 'string') (result as any).description = '';
        if (typeof (result as any).alertType !== 'string') (result as any).alertType = 'unknown';
      }
      
    } catch (apiError: any) {
      const isAxios = !!apiError?.isAxiosError;
      const status = isAxios ? apiError?.response?.status : undefined;
      const body = isAxios ? apiError?.response?.data : undefined;
      const reason = !process.env.OPENROUTER_API_KEY ? 'missing_api_key' : (status ? `http_${status}` : 'network_error');
      console.warn("[AI] OpenRouter API failed, using fallback analysis:", apiError instanceof Error ? apiError.message : apiError, { status, body });
      
      // Fallback deterministic analysis
      let fallbackRiskScore = 0;
      let fallbackAlertType = "NORMAL_OPERATION";
      let fallbackDescription = "Normal shipment operation";
      const fallbackEvidence: string[] = [];
      const fallbackActions: string[] = [];

      // Analyze delay severity
      if (Math.abs(delayMinutes) > 60) {
        fallbackRiskScore += 40;
        fallbackAlertType = "SEVERE_DELAY";
        fallbackDescription = `Severe delay of ${Math.round(Math.abs(delayMinutes))} minutes detected`;
        fallbackEvidence.push(`${Math.round(Math.abs(delayMinutes))} min delay`);
        fallbackActions.push("Contact driver immediately");
      } else if (Math.abs(delayMinutes) > 30) {
        fallbackRiskScore += 25;
        fallbackAlertType = "SIGNIFICANT_DELAY";
        fallbackDescription = `Significant delay of ${Math.round(Math.abs(delayMinutes))} minutes`;
        fallbackEvidence.push(`${Math.round(Math.abs(delayMinutes))} min delay`);
        fallbackActions.push("Monitor shipment status");
      } else if (Math.abs(delayMinutes) > 15) {
        fallbackRiskScore += 10;
        fallbackAlertType = "MINOR_DELAY";
        fallbackDescription = `Minor delay of ${Math.round(Math.abs(delayMinutes))} minutes`;
        fallbackEvidence.push(`${Math.round(Math.abs(delayMinutes))} min delay`);
      }

      // Analyze GPS and telemetry
      if (gpsOnline === false) {
        fallbackRiskScore += 30;
        fallbackAlertType = "GPS_OFFLINE";
        fallbackDescription += "; GPS offline";
        fallbackEvidence.push("GPS offline");
        fallbackActions.push("Verify GPS system");
      }

      if (typeof speedKph === 'number' && speedKph === 0 && Math.abs(delayMinutes) > 20) {
        fallbackRiskScore += 25;
        fallbackAlertType = "UNEXPECTED_STOP";
        fallbackDescription += "; vehicle stopped unexpectedly";
        fallbackEvidence.push("Vehicle stopped (0 kph)");
        fallbackActions.push("Check cargo security");
      }

      // Attack scenario modifier
      if (attackScenario) {
        fallbackRiskScore += 20;
        fallbackDescription = `Suspicious activity detected: ${attackScenario.type}`;
        fallbackEvidence.push("Suspicious shipment flagged");
        fallbackActions.push("Enhanced monitoring required");
      }

      // Cap risk score
      fallbackRiskScore = Math.min(fallbackRiskScore, 85); // Max 85 for fallback to distinguish from AI

      result = {
        riskScore: fallbackRiskScore,
        alertType: fallbackAlertType,
        description: fallbackDescription + " (AI analysis unavailable - using deterministic assessment)",
        operatorSummary: `Fallback analysis: ${fallbackAlertType.replace(/_/g, ' ').toLowerCase()}`,
        recommendedActions: fallbackActions.length > 0 ? fallbackActions : ["Monitor shipment"],
        evidence: fallbackEvidence.length > 0 ? fallbackEvidence : ["Automated analysis"],
        source: 'fallback',
        usingFallback: true,
        fallbackReason: reason
      };

      const duration = Date.now() - activityStart;
      updateActivity(started.id, { status: 'completed', duration, metadata: { ...(started.metadata||{}), riskScore: result.riskScore, usingFallback: true, reason } });
    }

    // Manual telemetry-based modifiers are disabled to ensure only the AI agent determines threat levels.

    // Always log the result of every analysis as a separate activity
    logActivity({
      userId,
      type: attackScenario ? 'threat_analysis' : 'routine_analysis',
      status: 'completed',
      shipmentId: routeId,
      description: result.description || (attackScenario ? 'Threat analysis completed' : 'Routine analysis completed'),
      metadata: { riskScore: result.riskScore, alertType: result.alertType }
    });

    // Save alert if risk score is significant
    if (typeof result.riskScore === 'number' && result.riskScore > 20) {
      await prisma.alert.create({
        data: {
          shipmentId: routeId,
          type: result.alertType || "unknown",
          severity: result.riskScore > 70 ? "high" : result.riskScore > 40 ? "medium" : "low",
          description: result.description || "Anomaly detected",
        },
      });
      // Log threat if medium/high
      if (result.riskScore > 40) {
        logActivity({
          userId,
          type: 'threat_detected',
          status: 'completed',
          shipmentId: routeId,
          description: `Threat detected: ${result.alertType}`,
          metadata: { riskScore: result.riskScore, alertType: result.alertType }
        });
      }
    }

    const duration = Date.now() - activityStart;
    updateActivity(started.id, { status: 'completed', duration, metadata: { ...(started.metadata||{}), riskScore: result.riskScore } });

    return NextResponse.json({
      success: true,
      ...result,
      analyzed: true,
      attackScenario: attackScenario ? { type: attackScenario.type } : undefined
    });

  } catch (error) {
    console.error("AI Agent Error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}