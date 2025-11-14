
## Logistics Defense AI – Agent Authoring Guide

**Purpose**: Equip AI coding agents with precise, project-specific context for safe, efficient contributions. Keep edits minimal, aligned with current behavior, and token-efficient.

---

### 1) Architecture Overview

**Next.js 15 App Router (TypeScript)** with serverless API routes in `app/api/*`. PostgreSQL/SQLite via Prisma ORM.

**Critical API Routes**:
- `ai/route.ts`: Risk analysis via OpenRouter (`z-ai/glm-4.5-air:free`). Defensive JSON parsing (strips markdown, balanced brace extraction). **Reinforcement Learning**: Fetches 5 recent accurate feedback examples from `/api/alerts/feedback` for few-shot prompting. Creates `Alert` only when `riskScore > 20`. Severity: `>70 high`, `>40 medium`, else `low`. Returns `shipmentContext` JSON for feedback. Logs with `[AI]` prefix.
- `agent/toggle/route.ts`: Toggle `User.agentActive`. Agent is **OFF by default**—never auto-enable.
- `agent/status/route.ts`: Returns agent state (inactive/idle/active) + recent activities from `lib/agentActivity.ts`.
- `shipments/route.ts`: Create/list shipments (latest 50). Accepts optional telemetry (origin/dest/GPS/speed/heading).
- `alerts/route.ts`: List latest 100 alerts; DELETE by id.
- `alerts/feedback/route.ts`: Submit feedback (risk score accuracy, attack type correctness, corrections) for RL. GET retrieves learning examples. Stored in `AlertFeedback`.
- `analyses/route.ts`: Lists ALL predictions (including `riskScore ≤ 20`). Enables feedback on safe predictions.
- `analyses/feedback/route.ts`: Submit feedback on `Analysis` records. Stored in `AnalysisFeedback`.
- `alerts/predictive/route.ts`: Predictive warnings when delay deviation exceeds threshold (default 30 min).
- `analysis-report/route.ts`: Structured incident report from latest alert + shipment.
- `simulate-attack/route.ts`: Creates suspicious shipment + triggers `/api/ai`. **Critical**: Forward `Cookie` header from request to `/api/ai` for auth passthrough.
- `schedule-predict/route.ts`: Linear regression + moving average delay prediction with confidence scoring.
- `auth/*`: Passwordless auth (email/phone + 6-digit codes, 5-min expiry). JWT via `jose`, stored in `auth` httpOnly cookie.

**Frontend**: Components poll with **adaptive intervals** (15s visible, 45s hidden). Always include manual Refresh button. See `ShipmentTable`, `AlertFeed`, `AgentStatusMonitor` for patterns.

---

### 2) Database Models (Prisma)

**Core Models**:
- `Shipment`: routeId, driverName, expectedETA, actualETA, optional telemetry (origin/dest/GPS/speed/heading), `predictedDelay`
- `Alert` + `AlertFeedback` (1:1): Feedback stores human ratings for RL (riskScoreAccurate, attackTypeCorrect, corrections, `valuePreference`)
- `Analysis` + `AnalysisFeedback` (1:1): Tracks ALL predictions including safe ones (`riskScore ≤ 20`)
- `User`: email/phone, `agentActive` (default false), `role` (ANALYST/OPERATOR/ADMIN)
- `VerificationCode`: time-limited auth codes (5-min expiry)
- `AgentActivity`: persisted activity log with metadata JSON
- `RegionalRiskProfile`: aggregated risk stats by region

**Dev DB**: SQLite (`file:./prisma/dev.db`). **Production**: PostgreSQL. No provider-specific logic; use `findMany({ orderBy, take })` to limit results.

---

### 3) RBAC & Authentication

**Role-Based Access Control**:
- `lib/auth.ts`: `getSessionFromRequest()` extracts JWT from `auth` cookie; `requireRole(session, ['ANALYST', 'ADMIN'])` guards routes
- Example pattern (all protected routes):
  ```typescript
  const session = await getSessionFromRequest(req);
  const guard = requireRole(session, ["ANALYST", "ADMIN"]);
  if (!guard.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  ```
- Role hierarchy: `ADMIN` (full access), `ANALYST` (analysis + reports), `OPERATOR` (shipments only)
- **Internal API calls**: Forward `Cookie` header when calling protected routes (e.g., `simulate-attack` → `ai`):
  ```typescript
  const cookieHeader = req.headers.get('cookie') || '';
  await axios.post('/api/ai', data, { headers: { Cookie: cookieHeader } });
  ```

**Middleware** (`middleware.ts`):
- Protects `/dashboard` routes (redirects to `/login` if unauthenticated)
- Protects most `/api/*` routes (returns 401)
- Exempts `/api/auth/*`, `/api/health`, `/login`, `/`
- JWT tokens signed with `NEXTAUTH_SECRET` via `jose` library

**Passwordless Auth**:
- Send 6-digit code → verify → issue JWT (7-day expiry)
- Demo accounts (optional): Set `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, etc. in `.env`

---

### 4) Risk Analysis & Alert Rules

**Alert Creation**:
- Only create `Alert` when `riskScore > 20` (see `ai/route.ts`)
- Severity mapping: `>70 → high`, `>40 → medium`, else `low`
- Always log with `[AI]` prefix for notable steps

**Reinforcement Learning**:
- Human feedback submitted via `AlertFeedbackModal` → stored in `AlertFeedback`
- Next analysis fetches 5 recent accurate examples from `/api/alerts/feedback?accurate=true`
- Few-shot learning: inject examples into AI prompt (no model training)

**Fallback Analysis**:
- If OpenRouter fails, use compact fallback prompt: `max_tokens ≈ 200`, `temperature: 0.4`
- Tag with `source: 'fallback'`

**Safety**: Always re-check `user.agentActive` before external AI calls; never auto-enable.

---

### 5) Frontend Patterns

**Adaptive Polling** (keep consistent across all live panels):
```typescript
useEffect(() => {
  const delay = document.visibilityState === 'visible' ? 15000 : 45000; // 15s visible, 45s hidden
  const interval = setInterval(fetchData, delay);
  return () => clearInterval(interval);
}, [/* deps */]);
```

**Manual Refresh**: Every live panel must have a Refresh button for instant updates.

**Tailwind Styling**: Cards with header, actions, error banner; responsive utility classes.

**Component Examples**: `ShipmentTable`, `AlertFeed`, `AgentStatusMonitor`, `AlertFeedbackModal`

---

### 6) Developer Workflows

**Development**:
```bash
npm run dev              # Turbopack dev server
npm run simulate         # Continuous simulation (60s interval)
npm run simulate:single  # Single shipment test
```

**Database**:
```bash
npm run db:generate      # Generate Prisma Client
npm run db:migrate       # Create migration
npm run db:studio        # Open Prisma Studio (localhost:5555)
npm exec tsx scripts/clearData.ts  # Reset data
```

**Testing**:
```bash
npm run test             # Aggregates test-normal, test-ai, test-attack
npm run lint             # ESLint checks
```

**After installing dependencies**: Run `npm install && npm run db:generate`

**After schema changes**: **Always** run `npm run db:migrate` before server starts (migrations required)

---

### 7) Conventions & Error Handling

**API Responses**:
- Success: `{ success: true, ... }`
- Error: `{ error: "message", message?: "details" }` with appropriate status code (401, 403, 500)

**Defensive AI JSON Parsing**: Strip code fences → extract first `{...}` → try/catch → fallback

**Logging**: Use `[AI]` prefix for analysis steps; never log secrets

**Keep lean**: Avoid storing raw prompts/large payloads in DB

---

### 8) Environment Variables

**Required**:
- `DATABASE_URL`: PostgreSQL connection string (production) or `file:./prisma/dev.db` (dev)
- `OPENROUTER_API_KEY`: OpenRouter API key (graceful degradation if missing)
- `NEXTAUTH_SECRET`: JWT signing secret (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `NEXTAUTH_URL`: App URL (used as Referer header)

**Optional** (demo RBAC):
- `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`
- `DEMO_ANALYST_EMAIL`, `DEMO_ANALYST_PASSWORD`
- `DEMO_OPERATOR_EMAIL`, `DEMO_OPERATOR_PASSWORD`

---

### 9) Activity Logging

`lib/agentActivity.ts`: In-memory activity feed (dev/demo). `AgentActivity` model persists for production.

When adding features, use new `type` values: `routine_analysis`, `threat_analysis`, `threat_detected`, `system_check`.

Close activities with `duration` (ms) and final `status` (completed/failed).

---

### 10) Safe Extension Guidelines

- **Before AI calls**: Validate activation + required fields; keep prompts compact
- **New severity levels**: Update `ai/route.ts` alert creation, UI badge mapping, tests
- **Avoid long-running loops** in API routes; use client polling or external scripts (`scripts/simulateRoutes.ts`)
- **Database changes**: Always `npm run db:migrate` after modifying `schema.prisma`
- **Never log secrets**; degrade gracefully if keys missing

---

### 11) DO NOT Change Without Direction

- Model name: `z-ai/glm-4.5-air:free`
- Alert thresholds (riskScore > 20, severity mappings)
- Agent default OFF behavior
- Polling cadence (15s visible / 45s hidden)

---

### 12) Quick File Reference

**API**: `app/api/ai/route.ts` | `app/api/agent/{toggle,status}/route.ts` | `app/api/shipments/route.ts` | `app/api/alerts/route.ts` | `app/api/alerts/feedback/route.ts` | `app/api/analyses/route.ts` | `app/api/analyses/feedback/route.ts` | `app/api/alerts/predictive/route.ts` | `app/api/analysis-report/route.ts` | `app/api/simulate-attack/route.ts` | `app/api/schedule-predict/route.ts` | `app/api/auth/{send-code,verify-code,logout,me}/route.ts`

**Components**: `components/{AgentToggle,AgentStatusMonitor,ShipmentTable,AlertFeed,RecentAnalyses,AlertFeedbackModal,AnalysisReport,SimulateAttackButton,DelayPredictionChart}.tsx`

**Lib**: `lib/{prisma.ts,agentActivity.ts,auth.ts,jwt.ts}`

**Scripts**: `scripts/{simulateRoutes.ts,clearData.ts}`

**Config**: `prisma/schema.prisma` | `middleware.ts`

---

### 13) PR Expectations

- Keep diffs minimal; justify threshold/model changes in commit message
- Update or add tests when altering risk logic
- Prefer incremental changes with clear `[AI]` logs
- If unsure, inspect existing routes/components and mirror patterns

---

**When uncertain**: Inspect an existing route or component and follow its established patterns.
