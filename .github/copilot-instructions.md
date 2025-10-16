
## Logistics Defense AI – Agent Authoring Guide

Purpose: Equip AI coding agents with precise, project-specific context for safe, efficient contributions. Keep edits minimal, aligned with current behavior, and token-efficient.

### 1) Architecture & Data Flow
This is a Next.js App Router (TypeScript) project. The serverless API lives in `app/api/*`:
- `ai/route.ts`: Risk analysis. Calls OpenRouter (model: `z-ai/glm-4.5-air:free`) with `response_format: json_object`; robust JSON extraction with multi-stage fallback (strip markdown, balanced brace extraction, regex salvage); falls back to deterministic analysis if API unavailable. **Reinforcement Learning**: Fetches recent accurate feedback from `/api/alerts/feedback` and enriches the prompt with 5 learning examples for few-shot learning. Alerts are persisted only when `riskScore > 20`. Severity: `>70 high`, `>40 medium`, else `low`. All analysis steps are logged. Returns `shipmentContext` JSON for feedback submission.
- `agent/toggle/route.ts`: Upserts `User` and toggles `agentActive`. GET returns status. Agent must remain OFF unless explicitly enabled.
- `agent/status/route.ts`: Returns agent status and recent activities from in-memory log (`lib/agentActivity.ts`). States: inactive/idle/active. POST accepts `system_check` action.
- `shipments/route.ts`: Create and list latest 50 shipments. Accepts optional telemetry (origin/destination/GPS/coords/speed/heading) and normalizes types.
- `alerts/route.ts`: List latest 100 and delete by id.
- `alerts/feedback/route.ts`: POST submits user feedback (risk score accuracy, attack type correctness, corrections) for reinforcement learning. GET retrieves learning examples (optionally filtered to accurate ones) formatted for AI prompt enrichment. Feedback is stored in `AlertFeedback` model.
- `analyses/route.ts`: Lists ALL AI predictions (including risk ≤ 20 that don't create alerts) from `Analysis` model. Enables feedback on safe predictions.
- `analyses/feedback/route.ts`: POST submits feedback on `Analysis` records (for predictions that didn't generate alerts). Stores corrections in `AnalysisFeedback` model.
- `alerts/predictive/route.ts`: Generates predictive warning alerts when predicted delay deviation exceeds threshold (default 30 min).
- `analysis-report/route.ts`: Builds structured incident report from latest alert + shipment details.
- `simulate-attack/route.ts`: Creates a suspicious shipment and (if agent active) immediately triggers `/api/ai` for analysis. **Critical**: Must forward `Cookie` header from incoming request to internal `/api/ai` call for authentication passthrough.
- `schedule-predict/route.ts`: Linear regression + moving average delay prediction with confidence scoring.
- `health/route.ts`: Simple health check endpoint.
- `auth/*`: Email/phone-based passwordless authentication using 6-digit codes. `send-code/route.ts` generates codes (5-min expiry), `verify-code/route.ts` validates and issues JWT via `jose` library, `logout/route.ts` clears auth cookie, `me/route.ts` returns current user from JWT. Auth tokens stored in `auth_token` httpOnly cookie.

Client components (`components/*`) poll endpoints with adaptive intervals (faster when tab visible) and always provide manual Refresh. `AlertFeedbackModal` provides UI for rating alert accuracy.


### 2) Persistence & Models (Prisma `schema.prisma`)
Models: 
- `Shipment` (with optional telemetry + `predictedDelay`)
- `Alert` + `AlertFeedback` (1:1 relationship; feedback for alerts with riskScore > 20)
- `Analysis` + `AnalysisFeedback` (1:1 relationship; tracks ALL predictions including safe ones)
- `User` (with `agentActive` boolean, `email`/`phone` for auth)
- `VerificationCode` (time-limited auth codes, 5-min expiry, auto-cleaned)
- `AgentActivity` (persisted activity log with metadata JSON field)

Dev DB is SQLite via `DATABASE_URL` (can swap to Postgres in prod; do not hardcode provider logic). Use `findMany({ orderBy, take })` to bound list sizes. Shipment telemetry fields (origin, destination, gpsOnline, lastKnownLat/Lng, speedKph, headingDeg) are optional and normalized to proper types on creation. Both feedback models store human ratings for reinforcement learning via few-shot prompting.


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
`DATABASE_URL`, `OPENROUTER_API_KEY`, `NEXTAUTH_URL` (also used as Referer header), `JWT_SECRET` (for signing auth tokens via `jose`). Never log secrets. If keys are missing or calls fail, degrade gracefully to fallback analysis.


### 6) Authentication & Middleware
- **Passwordless Auth**: Email or phone + 6-digit verification code (5-min expiry). Codes stored in `VerificationCode` model.
- **JWT Tokens**: Signed using `jose` library with `JWT_SECRET`; stored in `auth_token` httpOnly cookie.
- **Protected Routes**: `middleware.ts` guards `/dashboard` (redirects to login) and most `/api/*` routes (returns 401). Auth routes (`/api/auth/*`) and public routes (`/`, `/login`) are exempt.
- **Internal API Calls**: When one API route calls another protected route (e.g., `simulate-attack` → `ai`), must forward `Cookie` header from original request to preserve authentication context. Example:
  ```typescript
  const cookieHeader = req.headers.get('cookie') || '';
  await axios.post('/api/ai', data, { headers: { Cookie: cookieHeader } });
  ```


### 7) Developer Workflows
- Dev server: `npm run dev` (Turbopack)
- Simulations: `npm run simulate` (continuous) | `npm run simulate:single` (one-off)
- Prisma: `npm run db:generate` | `npm run db:migrate` | `npm run db:studio`
- Data reset: `npm exec tsx scripts/clearData.ts` (clears Shipments + Alerts)
- Tests: `npm run test` aggregates `tests/test-*.js` scenarios (normal, ai, attack). Note: test files may not exist yet; scripts reference them in package.json.
- Lint: `npm run lint` (ESLint checks)
- **After installing new dependencies**: Run `npm install` followed by `npm run db:generate` to regenerate Prisma Client if needed


### 8) Frontend Patterns
- **Adaptive Polling**: All live panels (e.g. `ShipmentTable`, `AlertFeed`, `AgentStatusMonitor`) adjust interval based on `document.visibilityState`: 15s when visible, 45s when hidden. Keep cadence consistent for new panels.
- **Polling Cleanup**: Always clear intervals in component cleanup and re-initialize on visibility change.
- **Manual Refresh**: Every live panel includes a manual Refresh button for instant updates.
- **Tailwind Styling**: Cards with header, actions, error banner; use utility classes for responsive layouts.
- **State Management**: Use `useState` for local state; `useEffect` for data fetching and polling setup.


### 9) Activity Logging
`lib/agentActivity.ts` maintains an in-memory activity feed (dev/demo); persisted `AgentActivity` model exists for production use. When expanding features, add new `type` values (e.g., `routine_analysis`, `threat_analysis`, `threat_detected`). Close activities with `duration` and final `status`. Both in-memory and DB patterns coexist; prefer DB for persistent logs.


### 10) Safe Extension Guidelines
- Before AI calls: validate activation + required fields; keep prompts compact.
- If introducing new severity levels, update: `ai/route.ts` alert creation, UI badge mapping, and tests.
- Avoid long-running loops inside API routes; use client polling or external scripts (`scripts/simulateRoutes.ts`).
- **Database Changes**: Always run `npm run db:migrate` after modifying `schema.prisma`. Migrations are required before server can start.


### 11) Do NOT change without direction
- Model name: `z-ai/glm-4.5-air:free`
- Alert thresholds and creation rules
- Agent default OFF behavior and toggle flow
- Existing polling cadence


### 12) Quick File Map
`app/api/ai/route.ts` (analysis + fallback + reinforcement learning) | `app/api/agent/{toggle,status}/route.ts` | `app/api/shipments/route.ts` | `app/api/alerts/route.ts` | `app/api/alerts/feedback/route.ts` (reinforcement learning) | `app/api/analyses/route.ts` (all predictions including safe) | `app/api/analyses/feedback/route.ts` (safe prediction feedback) | `app/api/alerts/predictive/route.ts` | `app/api/analysis-report/route.ts` | `app/api/simulate-attack/route.ts` | `app/api/schedule-predict/route.ts` | `app/api/health/route.ts` | `components/{AgentToggle,AgentStatusMonitor,ShipmentTable,AlertFeed,RecentAnalyses,AlertFeedbackModal,AnalysisReport,SimulateAttackButton,DelayPredictionChart}.tsx` | `lib/{prisma.ts,agentActivity.ts}` | `scripts/simulateRoutes.ts` | `prisma/schema.prisma`


### 13) PR Expectations
Keep diffs minimal. Justify any threshold/model changes in the commit message. Update or add a test when altering risk logic. Prefer incremental changes with clear `[AI]` logs.

If unsure, inspect an existing route or component and mirror its patterns.
