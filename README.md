# Cybersecurity Defensive AI Agent — Logistics — Defense

**Course:** INFO 498B — Agentic Cybersecurity with AI & LLMs  
**Team:** Team 3 — Kenta Lipsey (klipsey), Hanrui Tang, Ajit Mallavarapu  
**One-line pitch:** Dashboard-based AI defense system that autonomously detects cyber-physical threats in warehouse logistics networks, protecting supply chains from route manipulation, ransomware, and scheduling attacks through real-time risk analysis and alerts.

---

## 1) Live Demo

- **Synthetic Industry:** https://info-492-demo.onrender.com/login — status: Up — test creds (fake): analyst@example.com / analystpass operator@example.com / operatorpass
- **Agentic System:** https://info-492-demo.onrender.com/login — status: Up — notes: Use: admin@example.com / adminpass to monitor agent

---

## 2) Thesis & Outcome

**Original thesis (week 2):** In warehouse logistics networks, each delivery unit is vulnerable to cyber-physical disruptions such as route manipulation, ransomware, and scheduling attacks. We believe that agentic AI defense systems can be used to reduce shipment losses and operational disruptions by 10% by autonomously detecting route anomalies at a 95%+ accuracy, protecting company data, and triggering real-time alerts when deliveries deviate from predicted timelines.


**Final verdict:** Partially true

**Why (top evidence):**
- Agent accuracy improved from 32% (Demo #2) to 85% (Demo #4), falling short of the 95% target
- Contextual variables (regional profiles, cargo value, weather data) significantly enhanced risk detection and alert prioritization
- Human-in-the-loop reinforcement learning proved effective, but limited model capacity and training time prevented reaching full hypothesis validation

---

## 3) What We Built

**Synthetic industry:** Next.js 15 dashboard with REST APIs, continuous simulation engine, synthetic shipment generator with telemetry (GPS, speed, heading), PostgreSQL/SQLite database, role-based authentication (passwordless email/phone + 6-digit codes)

**Agentic system:** Risk analysis agent powered by OpenRouter (z-ai/glm-4.5-air:free model), reinforcement learning via human feedback (AlertFeedback & AnalysisFeedback), few-shot learning with 5 recent accurate examples, database monitoring agent for anomaly detection, predictive delay warnings (linear regression + moving average)

**Key risks addressed (or exercised):**
- Route manipulation and scheduling attacks via simulated attack scenarios
- Ransomware and cyber-physical disruptions with cargo value-based risk scoring
- Unauthorized access and data breaches through RBAC and database activity monitoring

---

## 4) Roles, Auth, Data

**Roles & permissions:** 
- **ADMIN**: Full system access, agent control, training protocols, user management
- **ANALYST**: Risk assessment, alert evaluation, feedback submission, report generation
- **OPERATOR**: Shipment monitoring, basic telemetry viewing

**Authentication:** Passwordless authentication via email/phone with 6-digit verification codes (5-min expiry). JWT tokens (7-day expiry) stored in httpOnly cookies. Middleware protects `/dashboard` and `/api/*` routes. Demo accounts: admin@example.com/adminpass, analyst@example.com/analystpass, operator@example.com/operatorpass

**Data:** Synthetic only. Generator creates shipments with routeId, driverName, expectedETA, actualETA, optional telemetry (origin/destination coordinates, GPS, speed, heading, cargo value). Database tracks Shipment, Alert, AlertFeedback, Analysis, AnalysisFeedback, User, AgentActivity, RegionalRiskProfile, VerificationCode models via Prisma ORM.

---

## 5) Experiments Summary (Demos #3 - #5)

**Demo #2:** Human-in-the-loop reinforcement learning with simulated attacks — Manual training protocols, cargo value scoring, basic RBAC — **Result:** Initial accuracy ~32%, established feedback loop foundation — **Evidence:** Integrated AlertFeedback system, manual role selection

**Demo #3:** Enhanced contextual awareness via regional profiles and secure authentication — Implemented shipping contexts, regional risk profiles, secure login (email/password/2FA), database agent for activity monitoring — **Result:** Pass — Separated dashboards by role (operator/analyst/admin), tracked login anomalies — **Evidence:** Role-based dashboards, database monitoring agent

**Demo #4 (continuous run):** Continuous simulations with industry separation and cloud hosting — **Result:** Accuracy improved to ~85%, uptime stable on cloud platform — **Improvement observed:** Yes — Interactive map visualization, near-real-time learning from continuous data stream, scalable multi-user access — **Evidence:** Cloud-hosted dashboard with live shipment tracking

**Demo #5 (final):** Weather as contextual variable for dynamic risk adjustment — Integrated weather data to adjust risk scores based on external conditions (storms, extreme weather) — **Result:** Agent demonstrated ability to incorporate diverse data streams, but did not reach 95% accuracy target — **Evidence:** Weather-adjusted risk scoring in final dashboard

---

## 6) Key Results (plain text)

**Effectiveness:** Risk detection accuracy improved from 32% (Demo #2) to 85% (Demo #4). Alert creation threshold: riskScore > 20. Severity mapping: >70 high, >40 medium, else low. Cargo value-based prioritization reduced false negatives for high-value shipments. Predictive delay warnings with confidence scoring.

**Reliability:** Stable cloud deployment (Render) with adaptive polling (15s visible, 45s hidden). Graceful degradation when OpenRouter unavailable (compact fallback prompt with max_tokens ~200). Agent OFF by default; never auto-enables. Error handling with defensive JSON parsing (strips markdown, balanced brace extraction).

**Safety:** RBAC enforced via middleware (redirects/401 on unauthorized access). Agent activation requires explicit user toggle. Database monitoring agent detects suspicious login patterns and unusual data access. AlertFeedback and AnalysisFeedback prevent overfitting via human oversight. All data synthetic—no real credentials or org systems.

---

## 7) How to Use / Deploy

**Prereqs:** 
- Node.js 18+, npm
- PostgreSQL (production) or SQLite (dev)
- OpenRouter API key (optional, graceful degradation)
- Environment variables: `DATABASE_URL`, `OPENROUTER_API_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Demo accounts: `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, etc.

**Deploy steps:** 
1. Clone repo: `git clone https://github.com/klipseyuw/INFO-492-Demo.git`
2. Install dependencies: `npm install && npm run db:generate`
3. Set environment variables in `.env`
4. Run migrations: `npm run db:migrate`
5. Start dev server: `npm run dev` (or deploy to Render/Vercel)
6. Access at `http://localhost:3000` or https://info-492-demo.onrender.com

**Test steps:** 
- `npm run test` (aggregates test-normal, test-ai, test-attack)
- `npm run simulate:single` (single shipment test)
- `npm run simulate` (continuous simulation, 60s interval)
- Login with demo credentials, toggle agent, submit feedback

---

## 8) Safety, Ethics, Limits

- **Synthetic data only**; no real credentials or org systems. All shipments, routes, and telemetry are generated for lab/demo purposes.
- **Controls:** Role-based access control (ADMIN/ANALYST/OPERATOR), agent OFF by default (explicit toggle required), middleware protection on sensitive routes, defensive JSON parsing, httpOnly cookies for JWT tokens, database activity monitoring for anomaly detection.
- **Known limits/failure modes:** 
  - Agent accuracy plateaued at 85% (below 95% target) due to free model constraints and limited training data
  - Weather data integration requires external API (not fully implemented in all regions)
  - Continuous simulation requires external script (`scripts/simulateRoutes.ts`) or manual refresh
  - OpenRouter rate limits may throttle requests during high-volume simulations
  - Few-shot learning limited to 5 recent examples (could benefit from larger context window)

---

## 9) Final Deliverables

- **Final Analysis (1000+ words):** See project documentation ([12/1/25 — INFO 492 B Final Analysis]([url](https://docs.google.com/document/d/1MDSo9mkw68osUp-rVw8OjcWtZfSvVaP64RLidkjai3o/edit?usp=sharing)))
- **Slides:** ([Presentation](https://docs.google.com/presentation/d/1-QsRxD_Hf_aVh7T3HMuUIGXTR01sxS0Qd3Ckc1oGK9Y/edit?usp=sharing))
- **Evidence folder (logs/screens):** Dashboard screenshots, accuracy progression graphs (32% → 85%), interactive map demos, feedback loop examples

---

## 10) Next Steps

- **Upgrade to more powerful AI model** (e.g., GPT-4, Claude 3.5 Sonnet) to improve accuracy beyond 85% threshold
- **Expand training dataset** with richer contextual variables (real-time traffic, geopolitical events, supply chain disruptions) and extended simulation periods
- **Implement advanced RL techniques** (RLHF, multi-agent coordination) and increase few-shot learning context window beyond 5 examples

**Maintainers:** Kenta Lipsey, Hanrui Tang, Ajit Mallavarapu • **Contact:** klipsey@uw.edu
