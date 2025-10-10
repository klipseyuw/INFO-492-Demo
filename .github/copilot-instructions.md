
## Logistics Defense AI – Agent Authoring Guide

Purpose: Equip AI coding agents with precise, project-specific context for safe, efficient contributions. Keep edits minimal, aligned with current behavior, and token-efficient.

### 1) Architecture & Data Flow
This is a Next.js App Router (TypeScript) project. The serverless API lives in `app/api/*`:
- `ai/route.ts`: Risk analysis. Calls OpenRouter (model: `z-ai/glm-4.5-air:free`) with `response_format: json_object`; robust JSON extraction; falls back to local simulation if needed. Alerts are persisted only when `riskScore > 20`. Severity: `>70 high`, `>40 medium`, else `low`. All analysis steps are logged.
- `agent/toggle/route.ts`: Upserts `User` and toggles `agentActive`. GET returns status. Agent must remain OFF unless explicitly enabled.
- `agent/status/route.ts`: Returns agent status and recent activities from in-memory log (`lib/agentActivity.ts`). States: inactive/idle/active.
- `shipments/route.ts`: Create and list latest 50 shipments. Accepts optional telemetry (origin/destination/GPS/coords/speed/heading) and normalizes types.
- `alerts/route.ts`: List latest 100 and delete by id.
- `analysis-report/route.ts`: Builds structured incident report from latest alert + shipment details.
- `simulate-attack/route.ts`: Creates a suspicious shipment and (if agent active) immediately triggers `/api/ai` for analysis.
Client components (`components/*`) poll endpoints with adaptive intervals (faster when tab visible) and always provide manual Refresh.


### 2) Persistence & Models (Prisma `schema.prisma`)
Models: `Shipment`, `Alert`, `User(agentActive)`, `AgentActivity`. Dev DB is SQLite via `DATABASE_URL` (can swap to Postgres in prod; do not hardcode provider logic). Use `findMany({ orderBy, take })` to bound list sizes.


### 3) Risk & Alert Rules
- Only create alerts when `riskScore > 20` (see `ai/route.ts`).
- Severity: `>70 → high`, `>40 → medium`, else low.
- Fallback analysis must tag `source: 'fallback'` and use compact prompt: `max_tokens ≈ 200`, `temperature: 0.4`.
- Always re-check `user.agentActive` before any external AI call; never auto-enable.


### 4) Conventions & Error Style
- API success: `{ success: true, ... }`; errors: `{ error, message? }` with appropriate status codes.
- Defensive AI JSON parsing: strip code fences, extract first `{...}`, try/catch, then fallback.
- Keep responses lean; avoid storing raw prompts/large payloads in DB.
- Use `[AI]` log prefixes for notable analysis steps.


### 5) Environment & Config
`DATABASE_URL`, `OPENROUTER_API_KEY`, `NEXTAUTH_URL` (also used as Referer header). Never log secrets. If keys are missing or calls fail, degrade gracefully to fallback analysis.


### 6) Developer Workflows
- Dev server: `npm run dev` (Turbopack)
- Simulations: `npm run simulate` (continuous) | `npm run simulate:single` (one-off)
- Prisma: `npm run db:generate` | `npm run db:migrate` | `npm run db:studio`
- Data reset: `npm exec tsx scripts/clearData.ts` (clears Shipments + Alerts)
- Tests: `npm run test` aggregates `tests/test-*.js` scenarios (normal, ai, attack)


### 7) Frontend Patterns
- Adaptive polling intervals in `ShipmentTable`, `AlertFeed`, `AgentStatusMonitor`; keep cadence consistent for new live panels.
- Tailwind utility classes; cards with header, actions, error banner; always include manual Refresh.


### 8) Activity Logging
`lib/agentActivity.ts` maintains an in-memory activity feed (dev/demo). When expanding features, add new `type` values (e.g., `routine_analysis`, `threat_analysis`, `threat_detected`). Close activities with `duration` and final `status`.


### 9) Safe Extension Guidelines
- Before AI calls: validate activation + required fields; keep prompts compact.
- If introducing new severity levels, update: `ai/route.ts` alert creation, UI badge mapping, and tests.
- Avoid long-running loops inside API routes; use client polling or external scripts (`scripts/simulateRoutes.ts`).


### 10) Do NOT change without direction
- Model name: `z-ai/glm-4.5-air:free`
- Alert thresholds and creation rules
- Agent default OFF behavior and toggle flow
- Existing polling cadence


### 11) Quick File Map
`app/api/ai/route.ts` (analysis + fallback) | `app/api/agent/{toggle,status}/route.ts` | `app/api/shipments/route.ts` | `app/api/alerts/route.ts` | `app/api/analysis-report/route.ts` | `app/api/simulate-attack/route.ts` | `components/{AgentToggle,AgentStatusMonitor,ShipmentTable,AlertFeed,AnalysisReport,SimulateAttackButton}.tsx` | `lib/{prisma.ts,agentActivity.ts}` | `scripts/simulateRoutes.ts` | `prisma/schema.prisma` | `tests/*`


### 12) PR Expectations
Keep diffs minimal. Justify any threshold/model changes in the commit message. Update or add a test when altering risk logic. Prefer incremental changes with clear `[AI]` logs.

If unsure, inspect an existing route or component and mirror its patterns.
