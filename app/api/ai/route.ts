import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import axios from "axios";
import { logActivity, updateActivity } from "@/lib/agentActivity";
import { getSessionFromRequest, requireRole } from "@/lib/auth";

// Fallback deliberately disabled: threats must be determined by the external AI agent only.

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    const guard = requireRole(session, ["ANALYST", "ADMIN"]);
    if (!guard.ok) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
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
      ,
      // Cargo
      cargoName,
      cargoQuantity,
      cargoUnitCost,
      cargoTotalValue
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
  // Cargo summary
  if (cargoName) {
    const qty = typeof cargoQuantity === 'number' ? cargoQuantity : undefined;
    const unit = typeof cargoUnitCost === 'number' ? cargoUnitCost : undefined;
    const total = typeof cargoTotalValue === 'number' ? cargoTotalValue : (qty && unit ? qty * unit : undefined);
    telemetryLines.push(`- Cargo: ${cargoName}${qty ? ` x${qty}` : ''}${unit ? ` @ $${unit.toLocaleString()}` : ''}${total ? ` (≈ $${Math.round(total).toLocaleString()})` : ''}`);
  }

  // Fetch recent feedback for few-shot learning
  let learningContext = '';
  try {
    const feedbackRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/alerts/feedback?limit=5&accurate=true`);
    const feedbackData = await feedbackRes.json();
    if (feedbackData.success && feedbackData.examples && feedbackData.examples.length > 0) {
      learningContext = '\n\nLEARNING FROM PAST ACCURATE PREDICTIONS:\n';
      feedbackData.examples.forEach((ex: any, i: number) => {
        learningContext += `\nExample ${i + 1}:\n`;
        learningContext += `Scenario: Delay=${Math.round(ex.scenario.delayMinutes || 0)}min, GPS=${ex.scenario.gpsOnline}, Speed=${ex.scenario.speedKph}kph`;
        if (ex.scenario.cargoName) {
          learningContext += `, Cargo=${ex.scenario.cargoName}${ex.scenario.cargoQuantity ? ` x${ex.scenario.cargoQuantity}` : ''}`;
        }
        if (ex.valuePreference) {
          learningContext += `, ValuePreference=${ex.valuePreference}`;
        }
        learningContext += `\n`;
        learningContext += `Correct Assessment: Risk=${ex.actualResult.riskScore}, Type=${ex.actualResult.attackType}\n`;
      });
      console.log(`[AI] Enriching prompt with ${feedbackData.examples.length} learning examples`);
    }
  } catch (err) {
    console.warn('[AI] Could not fetch feedback for learning:', err instanceof Error ? err.message : err);
  }

  // Optional: include a tiny regional risk context (top 3)
  let regionalContext = '';
  try {
    const topRegions = await prisma.regionalRiskProfile.findMany({
      orderBy: [{ avgRisk: 'desc' }, { totalAnalyses: 'desc' }],
      take: 3
    } as any);
    if (topRegions && topRegions.length > 0) {
      regionalContext = '\n\nREGIONAL RISK CONTEXT (top historical):\n' + topRegions.map(r => `- ${r.regionKey} (avg ${Math.round(r.avgRisk)}%, n=${r.totalAnalyses})`).join('\n');
      console.log(`[AI] Enriching prompt with ${topRegions.length} regional risk profiles`);
    }
  } catch (e) {
    console.warn('[AI] Could not fetch regional risk context');
  }

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
${learningContext}
${regionalContext}

PRIORITY NOTE:
- The shipment's cargo value should only slightly influence risk priority. High-value cargo may nudge risk a bit higher for the same signals, and low-value cargo may nudge slightly lower. Do not exceed ±5 points due to value alone.

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
      // Pre-flight: ensure API key exists (temporarily disabled for fallback testing)
      const TEST_FALLBACK = false; // Set to true to test fallback
      if (!process.env.OPENROUTER_API_KEY || TEST_FALLBACK) {
        console.warn("[AI] Missing OPENROUTER_API_KEY or fallback testing enabled; using fallback analysis.");
        const duration = Date.now() - activityStart;
        updateActivity(started.id, { status: 'failed', duration, metadata: { ...(started.metadata||{}), error: 'ai_unavailable', reason: TEST_FALLBACK ? 'fallback_test' : 'missing_api_key' } });
        
        // Jump to fallback logic instead of returning error
        throw new Error(TEST_FALLBACK ? 'Fallback test mode' : 'Missing API key');
      }
      // Try OpenRouter API with improved JSON parsing
  console.log("[AI] Attempting OpenRouter API call...");
  const modelName = "z-ai/glm-4.5-air:free"; // Alternate model: deepseek/deepseek-chat-v3.1:free
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
      console.log("[AI] Making API call to:", "https://openrouter.ai/api/v1/chat/completions");
      console.log("[AI] Request payload:", JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: prompt.substring(0, 200) + "..." }],
        max_tokens: 200,
        temperature: 0.4,
        response_format: { type: "json_object" }
      }, null, 2));
      
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

      // DEBUG: Log the complete API response for troubleshooting
      console.log("[AI] Full OpenRouter response data:", JSON.stringify(aiRes.data, null, 2));
      console.log("[AI] Response status:", aiRes.status);
      if (aiRes?.data?.error) {
        // OpenRouter sometimes wraps upstream provider errors in 200s
        const msg = aiRes.data.error?.message || "Unknown provider error";
        const code = aiRes.data.error?.code;
        console.warn("[AI] Provider returned error payload despite 200:", { code, msg });
        throw new Error(`Provider error ${code || ''}: ${msg}`.trim());
      }
      
      // Check if response has expected structure
      if (!aiRes.data || !aiRes.data.choices || !Array.isArray(aiRes.data.choices) || aiRes.data.choices.length === 0) {
        console.warn("[AI] Malformed OpenRouter response - no choices array. Triggering fallback.");
        throw new Error(`Malformed API response: ${JSON.stringify(aiRes.data)}`);
      }
      
      // Extract content from either content, reasoning, or reasoning_details
      const message = aiRes.data.choices[0]?.message;
      const finishReason = aiRes.data.choices[0]?.finish_reason || aiRes.data.choices[0]?.native_finish_reason;
      if (finishReason === 'length') {
        console.warn("[AI] Model output truncated (finish_reason=length). Attempting JSON salvage.");
      }
      let analysis = message?.content;
      
      // Some models may use reasoning field for structured responses
      if (!analysis || analysis.trim() === "") {
        analysis = message?.reasoning || 
                  message?.reasoning_details?.[0]?.text ||
                  null;
      }
      
      if (!analysis) {
        console.warn("[AI] No content in OpenRouter response (checked content, reasoning, and reasoning_details). Triggering fallback.");
        throw new Error("No content in API response");
      }
      
      console.log("[AI] Extracted analysis content:", analysis);

      // Advanced JSON extraction - handle multiple formats and truncated output
      let jsonString = analysis;

      // Remove markdown code blocks
      jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Remove provider/model-specific tokens and extra content
      jsonString = jsonString.replace(/<｜begin▁of▁sentence｜>/g, '');
      jsonString = jsonString.replace(/<\|.*?\|>/g, '');

      // Helper: try best-effort parse with progressive salvage
      const tryParseJson = (s: string): any => {
        return JSON.parse(s);
      };

      // Helper: find a balanced JSON object substring using brace counting (ignores braces inside strings)
      const findBalancedJson = (s: string): string | null => {
        const start = s.indexOf('{');
        if (start < 0) return null;
        let inStr = false;
        let escaped = false;
        let depth = 0;
        let lastComplete = -1;
        for (let i = start; i < s.length; i++) {
          const ch = s[i];
          if (inStr) {
            if (escaped) {
              escaped = false;
            } else if (ch === '\\') {
              escaped = true;
            } else if (ch === '"') {
              inStr = false;
            }
          } else {
            if (ch === '"') inStr = true;
            else if (ch === '{') depth++;
            else if (ch === '}') {
              depth--;
              if (depth === 0) lastComplete = i;
            }
          }
        }
        if (lastComplete > start) return s.slice(start, lastComplete + 1);
        return null;
      };

      // First try: longest balanced object
      let candidate = findBalancedJson(jsonString) ?? jsonString;
      let parsed: any | undefined;
      try {
        parsed = tryParseJson(candidate);
      } catch (e1) {
        // Second try: trim to last closing brace if present
        const lastBrace = candidate.lastIndexOf('}');
        if (lastBrace > 0) {
          const trimmed = candidate.slice(0, lastBrace + 1);
          try {
            parsed = tryParseJson(trimmed);
          } catch (e2) {
            // Third try: regex-extract minimal fields from raw text
            const text = jsonString;
            const riskMatch = text.match(/"riskScore"\s*:\s*(\d{1,3})/);
            const typeMatch = text.match(/"alertType"\s*:\s*"([^"]{1,120})"/);
            const descMatch = text.match(/"description"\s*:\s*"([^\n\r"]{0,500})/); // tolerate unterminated
            if (riskMatch || typeMatch || descMatch) {
              parsed = {
                riskScore: riskMatch ? Number(riskMatch[1]) : 0,
                alertType: typeMatch ? typeMatch[1] : 'unknown',
                description: descMatch ? descMatch[1] + (finishReason === 'length' ? '…' : '') : ''
              };
              console.warn("[AI] Parsed partial fields from truncated JSON.");
            }
          }
        }
      }

      if (!parsed) {
        throw new Error('Unable to parse AI JSON response');
      }

      result = parsed;
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
      const body = isAxios ? apiError?.response?.data : (typeof apiError?.message === 'string' && apiError.message.startsWith('Provider error')) ? apiError.message : undefined;
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

      // Cargo value slight modifier (±5 max)
      if (typeof cargoTotalValue === 'number' || (typeof cargoQuantity === 'number' && typeof cargoUnitCost === 'number')) {
        const total = typeof cargoTotalValue === 'number' ? cargoTotalValue : (cargoQuantity as number) * (cargoUnitCost as number);
        if (Number.isFinite(total)) {
          // Heuristic thresholds
          if (total > 100000) fallbackRiskScore += 4; // high value
          else if (total < 5000) fallbackRiskScore -= 2; // low value
        }
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

    // ALSO persist to database for /api/analyses endpoint
    await prisma.agentActivity.create({
      data: {
        userId,
        activityType: attackScenario ? 'threat_analysis' : 'routine_analysis',
        status: 'completed',
        targetShipment: routeId,
        description: result.description || (attackScenario ? 'Threat analysis completed' : 'Routine analysis completed'),
        metadata: JSON.stringify({ riskScore: result.riskScore, alertType: result.alertType }),
      }
    });

    // Persist structured analysis to Analysis table for feedback on safe predictions
    try {
      const shipmentContext = {
        delayMinutes,
        gpsOnline,
        speedKph,
        origin,
        destination,
        attackScenario: attackScenario?.type,
        cargoName,
        cargoQuantity,
        cargoUnitCost,
        cargoTotalValue
      };
      await prisma.analysis.create({
        data: {
          shipmentId: routeId,
          routeId,
          driverName: driverName || 'Unknown',
          riskScore: Number(result.riskScore) || 0,
          alertType: String(result.alertType || 'unknown'),
          severity: (Number(result.riskScore) || 0) > 70 ? 'high' : (Number(result.riskScore) || 0) > 40 ? 'medium' : 'low',
          description: result.description || '',
          shipmentContext: JSON.stringify(shipmentContext),
          analyzed: true,
          source: typeof result.source === 'string' ? result.source : undefined
        }
      });
    } catch (err) {
      console.warn('[AI] Failed to persist Analysis record:', err instanceof Error ? err.message : err);
    }

    // Update regional risk profiles for origin/destination/local tile
    try {
      const risk = Number(result.riskScore) || 0;
      const severity = risk > 70 ? 'high' : risk > 40 ? 'medium' : 'low';
      const keys: string[] = [];
      if (origin && typeof origin === 'string') keys.push(`city:${origin}`);
      if (destination && typeof destination === 'string') keys.push(`city:${destination}`);
      if (typeof lastKnownLat === 'number' && typeof lastKnownLng === 'number') {
        // Coarse tile ~0.5° for regional bucket
        const lat = Math.round(lastKnownLat * 2) / 2;
        const lng = Math.round(lastKnownLng * 2) / 2;
        keys.push(`tile:${lat.toFixed(1)},${lng.toFixed(1)}`);
      }
      // Deduplicate keys
      const regionKeys = Array.from(new Set(keys));
      for (const rk of regionKeys) {
        const existing = await prisma.regionalRiskProfile.findUnique({ where: { regionKey: rk } });
        if (!existing) {
          await prisma.regionalRiskProfile.create({
            data: {
              regionKey: rk,
              totalAnalyses: 1,
              highCount: severity === 'high' ? 1 : 0,
              mediumCount: severity === 'medium' ? 1 : 0,
              lowCount: severity === 'low' ? 1 : 0,
              avgRisk: risk,
              lastRiskScore: risk
            }
          });
        } else {
          const newTotal = existing.totalAnalyses + 1;
          const sum = existing.avgRisk * existing.totalAnalyses + risk;
          await prisma.regionalRiskProfile.update({
            where: { regionKey: rk },
            data: {
              totalAnalyses: { increment: 1 },
              highCount: { increment: severity === 'high' ? 1 : 0 },
              mediumCount: { increment: severity === 'medium' ? 1 : 0 },
              lowCount: { increment: severity === 'low' ? 1 : 0 },
              avgRisk: sum / newTotal,
              lastRiskScore: risk
            }
          });
        }
      }
    } catch (err) {
      console.warn('[AI] Failed to update regional risk profiles:', err instanceof Error ? err.message : err);
    }

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

    // Include shipment context for feedback
    const shipmentContext = {
      delayMinutes,
      gpsOnline,
      speedKph,
      origin,
      destination,
      attackScenario: attackScenario?.type,
      cargoName,
      cargoQuantity,
      cargoUnitCost,
      cargoTotalValue
    };

    return NextResponse.json({
      success: true,
      ...result,
      analyzed: true,
      attackScenario: attackScenario ? { type: attackScenario.type } : undefined,
      shipmentContext: JSON.stringify(shipmentContext)
    });

  } catch (error) {
    console.error("AI Agent Error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}