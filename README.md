# 🚛 Logistics Defense AI Platform

> **⚠️ IMPORTANT**: All commands in this README should be run from the project root directory (`INFO-492-Demo`).

A cutting-edge cybersecurity defense platform for warehouse logistics operations, utilizing AI-powered anomaly detection with **reinforcement learning** to identify route manipulation, data tampering, and cyber-physical disruptions in real-time.

## ✨ Key Features at a Glance

- 🤖 **AI-Powered Threat Detection** with few-shot reinforcement learning
- 🔒 **Role-Based Access Control (RBAC)** for Analysts, Operators, and Admins
- 🔐 **Passwordless Authentication** via email/phone verification codes
- 📊 **Real-time Dashboard** with adaptive polling (15s visible / 45s hidden)
- 🎯 **Human-in-the-Loop Feedback** system for continuous AI improvement
- 🔮 **Predictive Scheduling** with confidence scoring and deviation alerts
- 🚨 **Smart Alert System** with severity classification (High/Medium/Low)
- 🗺️ **Regional Risk Profiling** for geographic threat patterns

## 🏗️ Technology Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS
- **Backend**: Next.js serverless API routes (`app/api/*`)
- **Database**: PostgreSQL (production) / SQLite (development) via Prisma ORM
- **AI Engine**: OpenRouter API (`z-ai/glm-4.5-air:free`) with robust local fallback
- **Authentication**: Passwordless auth with JWT tokens (via `jose` library)
- **Runtime**: Node.js 18+ with Turbopack for fast hot-reload development
- **Deployment**: Render.com / Vercel / Docker compatible

## 📋 Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org/))
- **Git** for version control
- **Terminal/Command Prompt** access
- **OpenRouter API account** (free tier available at [openrouter.ai](https://openrouter.ai))
- **PostgreSQL database** (optional - SQLite dev database included)

## 🚀 Quick Start Guide

### Step 1: Clone & Navigate to Project

```bash
git clone <your-repo-url>
cd INFO-492-Demo
```

### Step 2: Install Dependencies

```bash
npm install
```

This automatically runs `npm run db:generate` via the `postinstall` script.

### Step 3: Database Configuration

**Option A: Use Built-in SQLite Database (Recommended for Development)**
```bash
# Database is pre-configured in .env with SQLite
# Prisma client is already generated from Step 2
npx prisma migrate dev --name init
```

**Option B: Use PostgreSQL Database (Production)**
```bash
# 1. Update DATABASE_URL in .env with your PostgreSQL connection string
# 2. Run migration to create tables
npx prisma migrate dev --name init

# 3. Verify with Prisma Studio
npx prisma studio
```

### Step 4: Configure Environment Variables

The `.env` file contains working defaults. For production, update:

```env
# Database (default uses SQLite)
DATABASE_URL="file:./prisma/dev.db"

# OpenRouter API (replace with your key)
OPENROUTER_API_KEY="sk-or-v1-your-api-key-here"

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
NEXTAUTH_SECRET="your-secure-secret-key"

# App URL
NEXTAUTH_URL="http://localhost:3000"

# Optional: Demo RBAC accounts
DEMO_ADMIN_EMAIL="admin@example.com"
DEMO_ADMIN_PASSWORD="adminpass"
DEMO_ANALYST_EMAIL="analyst@example.com"
DEMO_ANALYST_PASSWORD="analystpass"
DEMO_OPERATOR_EMAIL="operator@example.com"
DEMO_OPERATOR_PASSWORD="operatorpass"
```

**Get your OpenRouter API key**:
1. Sign up at [OpenRouter.ai](https://openrouter.ai/)
2. Navigate to dashboard and copy your API key
3. Replace `OPENROUTER_API_KEY` in `.env`

### Step 5: Start Development Server

```bash
npm run dev
```

🎉 **Success!** Navigate to **http://localhost:3000** (redirects to `/login`)

### Step 6: Login & Test

1. **Login** using email (e.g., `admin@example.com`) or demo account
2. Check terminal for 6-digit verification code (in dev mode)
3. Enter code to access dashboard
4. **Enable AI Agent** using the toggle switch
5. **Run simulation**: `npm run simulate:single` in new terminal
6. **Verify alerts** appear in the dashboard

## 🛡️ Platform Features

### 🔐 Role-Based Access Control (RBAC)

Three distinct user roles with granular permissions enforced at both middleware and API levels:

- **👑 ADMIN** - Full system access
  - All analyst + operator capabilities
  - Main dashboard access (`/dashboard`)
  - Attack simulation privileges (`/api/simulate-attack`)
  - User and settings management

- **📊 ANALYST** - Analysis and reporting
  - Analyst dashboard (`/dashboard/analyst`)
  - View all shipments and alerts
  - Submit AI feedback for reinforcement learning
  - Generate analysis reports
  - Access predictive scheduling tools

- **📦 OPERATOR** - Basic logistics operations
  - Operator dashboard (`/dashboard/operator`)
  - View and create shipments
  - View-only alert access
  - Cannot trigger AI analysis or simulations

**Technical Implementation**:
- `middleware.ts` guards all protected routes with authentication checks
- `lib/auth.ts` provides `requireRole()` helper for granular API-level access control
- Internal API calls must forward `Cookie` header for auth passthrough (see `simulate-attack/route.ts`)
- JWT tokens (via `jose` library) stored in httpOnly `auth` cookie with 7-day expiry

### 👥 Class Feedback (Mid-Quarter Improvements)

- **RBAC rigor for agents:** Ensure roles strictly separate what agents can see/do; test for overlap/leakage and enforce on the server.
- **Realism in data:** Use noisier, real-world routing/telemetry and schedule changes to validate anomaly detection under real conditions.
- **Resilience under load/DoS:** Stress-test the agent path (queueing, rate limits, backpressure, circuit breakers) to degrade safely and recover.
- **Breach playbook:** Define incident response (detect → contain → communicate → recover) and make it role-gated/auditable.
- **Value model nuance:** Don’t rely on dollar value alone—prioritize essentials (e.g., food, critical meds) with context-aware weighting.
- **Reduce rater fatigue:** Shift from manual ratings to backend RL and synthetic data from flagged cases to keep learning without user burnout.
- **Integration risk:** Validate that the four key improvements work together end-to-end, not just in isolation.

### 🤖 AI-Powered Threat Detection
- **Real-time Analysis**: `/api/ai` evaluates shipment timing and attack simulations, logs all analysis steps with `[AI]` prefix
- **Reinforcement Learning**: Human-in-the-loop feedback system using few-shot learning; rate alert accuracy via `AlertFeedbackModal`, and the AI learns from corrections in future predictions
- **Fallback Resilience**: If OpenRouter fails or keys are missing, local simulation produces a compact, structured result (`source: 'fallback'`, `max_tokens ≈ 200`, `temperature: 0.4`)
- **Risk Scoring**: 0–100; alerts are persisted only when `riskScore > 20` (Severity: >70 High, >40 Medium, else Low)
- **Safety First**: Defense agent is **OFF by default** and must be explicitly enabled (never auto-enabled; checked before every AI call)
- **Defensive Parsing**: Robust JSON extraction from AI responses; strips code fences, extracts first object, try/catch fallback
- **Token Efficient**: Prompts are compact and only invoked when agent is active
- **Activity Logging**: Analysis and threat events recorded in memory/`AgentActivity` pattern for status dashboards; extendable with new `type` values

### 🎛️ Intelligent Control Center
- **One-Click Toggle**: Enable/disable AI monitoring instantly (see `AgentToggle`)
- **Persistent State**: Agent status saved to database across sessions; always OFF by default
- **Visual Indicators**: Real-time status with color-coded feedback (see `AgentStatusMonitor`)
- **User Management**: Individual agent control per user account

### 📊 Live Operations Dashboard
- **Route Tracking**: Active shipments with computed delay badges
- **Adaptive Polling**: All live panels (e.g. `ShipmentTable`, `AlertFeed`, `AgentStatusMonitor`) adjust polling interval based on tab visibility; keep cadence consistent for new panels
- **Manual Refresh**: Every panel has a Refresh button for instant updates
- **Delay Detection**: Delay minutes derived client-side; color-coded status chips
- **Responsive Design**: Tailwind layout suitable for desktop + mobile

### 🚨 Advanced Alert System
- **Creation Logic**: Alert is persisted only when AI (or fallback) returns `riskScore > 20` (never below)
- **Severity Mapping**: High (>70), Medium (>40), Low (≤40) — keep thresholds consistent across code, UI, and tests
- **Structured Data**: `Alert` model stores shipment routeId reference + description
- **Dismissible**: `/api/alerts` DELETE supports removal; UI updates in place
- **Analysis Reports**: `/api/analysis-report` generates rich post-incident report (explanations, recommendations, compliance list) consumed by `AnalysisReport` component
- **Feedback System**: Click "🎯 Rate Accuracy" on any alert to provide feedback; rate risk score accuracy and attack type correctness to train the AI

### 🔮 Predictive Scheduling Defense
- **Delay Prediction**: `/api/schedule-predict` uses linear regression and moving averages to forecast delivery delays
- **Deviation Detection**: Compares actual vs predicted delays and triggers alerts when deviation exceeds threshold
- **Real-time Analysis**: Updates predictions based on historical shipment data and current route conditions
- **Confidence Scoring**: Provides confidence levels (high/medium/low) based on available data points
- **Predictive Alerts**: New "Predictive Warning" alert type with purple styling and 🔮 icon

### 🎯 Reinforcement Learning System

The AI agent learns from human feedback using **few-shot learning** (no custom model training required):

#### How It Works:
1. **AI makes a prediction**: Analyzes a shipment and assigns risk score + attack type
2. **You provide feedback**: Click "🎯 Rate Accuracy" on any alert
   - Was the risk score appropriate? (Yes/No)
   - Was the attack type correct? (Yes/No)
   - Provide corrections if needed (actual risk score 0-100, actual attack type)
   - Add optional notes for context
3. **AI learns immediately**: Next analysis includes recent accurate feedback examples in the prompt
4. **Continuous improvement**: The more feedback you provide, the more accurate future predictions become

#### Technical Implementation:
- **Few-Shot Learning**: No model fine-tuning needed; feedback examples are injected into prompts
- **Stored in Database**: `AlertFeedback` model stores corrections with original AI predictions
- **Automatic Enrichment**: `/api/ai` fetches 5 most recent accurate feedback examples before each analysis
- **Free & Effective**: Works with any OpenRouter model without additional costs

#### Best Practices:
- Rate alerts immediately after simulations for best learning
- Provide detailed notes explaining why predictions were wrong
- Focus on correcting high-severity alerts first
- Review learning examples in database via Prisma Studio

# 📊 AI Evaluation Metrics

To ensure transparency, reliability, and operational trust, the Logistics Defense AI Platform includes a dedicated **AI Evaluation System**.  

These metrics measure how well the defense agent predicts delays, triggers alerts, avoids false alarms, and maintains operational stability across routes.

All metrics are generated automatically using **real shipment timelines**, **predicted vs actual delays**, and **alert logs**.

---

## 🧠 Key Performance Indicators

### **1. Delay Prediction MAE (Mean Absolute Error)**  

Measures how far predicted delays deviate from actual delays.  

Data sources: `predictedDelay`, `expectedETA`, `actualETA`

```

actualDelay = actualETA - expectedETA

MAE = avg(|predictedDelay − actualDelay|)

```

---

### **2. Overtrigger Rate (False Positive Operational Rate)**  

AI predicts major delays that never occur.  

Data: `predictedDelay`, `actualDelay`

```

predictedDelay > 30 AND actualDelay < 10

```

---

### **3. Undertrigger Rate (False Negative Operational Rate)**  

AI fails to detect real severe delays.

```

predictedDelay < 15 AND actualDelay > 30

```

---

### **4. Alert Hit Rate (True Positive Alignment)**  

Whether alerts correspond to meaningful operational issues.

```

(severity = high OR medium) AND actualDelay > 20

```

---

### **5. Route Stability Score (Operational Consistency Index)**  

MAD-based score:

```

MAD = median(|delay_i − median(delay)|)

RouteStabilityScore = max(0, 100 − (MAD / 20) × 100)

```

---

### **6. System Confidence Score (Overall Reliability Index)**  

Weighted composite:

```

SystemConfidenceScore =

0.30 × (100 − MAE_norm)

* 0.20 × (100 − overtriggerRate)

* 0.20 × (100 − undertriggerRate)

* 0.20 × alertHitRate

* 0.10 × routeStabilityScore

```

---

## 📄 Where Metrics Appear

### **Dashboard Integration**  

Displayed in the *Route Performance Overview* panel.

### **PDF Reports**  

Included in all "Comprehensive Reports" with last-updated timestamp.

---

## 🎯 Why These Metrics Matter

They help teams:

- Diagnose prediction reliability  

- Detect model drift  

- Understand alert quality  

- Reduce false alarms  

- Monitor operational stability  

- Build trust in the AI defense agent  

### 🧪 Integrated Testing & Simulation
Generate realistic operational + adversarial data:

```bash
# Run from project root directory
npm run simulate         # Continuous simulation (60-second intervals)
npm run simulate:single  # Single route test for quick validation
```


## 📁 Project Architecture & File Map


```
app/api/ai/route.ts                # Risk analysis (OpenRouter + fallback + reinforcement learning)
app/api/agent/toggle/route.ts      # Upsert user, toggle agentActive
app/api/agent/status/route.ts      # Agent status + in-memory activity log
app/api/shipments/route.ts         # Create/list shipments (latest 50)
app/api/alerts/route.ts            # List/delete alerts (latest 100)
app/api/alerts/feedback/route.ts   # Submit/retrieve feedback for AI learning
app/api/alerts/predictive/route.ts # Predictive warning alert generation
app/api/analysis-report/route.ts   # Builds incident report from alert+shipment
app/api/simulate-attack/route.ts   # Simulate suspicious shipment + analysis
components/AgentToggle.tsx         # Agent activation control
components/AgentStatusMonitor.tsx  # Live activity/status display
components/ShipmentTable.tsx       # Adaptive polling shipment list
components/AlertFeed.tsx           # Adaptive polling alert list with feedback button
components/AlertFeedbackModal.tsx  # Modal for rating alert accuracy (reinforcement learning)
components/AnalysisReport.tsx      # Modal for analysis report
components/SimulateAttackButton.tsx# Triggers attack scenario & analysis
lib/prisma.ts                      # Prisma client singleton
lib/agentActivity.ts               # In-memory activity log helpers
prisma/schema.prisma               # Models: Shipment, Alert, User, AgentActivity
scripts/simulateRoutes.ts          # Simulation runner
scripts/clearData.ts               # Data reset script
tests/                             # Scenario scripts (normal, ai, attack)
```
## 🧩 Safe Extension Guidelines

- Before any AI call: always validate agent activation and required fields; keep prompts compact
- Never auto-enable the agent; must be toggled explicitly
- If introducing new severity levels, update alert creation, UI badge mapping, and tests
- Avoid long-running loops in API routes; use client polling or external scripts
- Never log secrets; degrade gracefully if keys are missing
- Use `[AI]` log prefixes for notable analysis steps
## 📝 Conventions & Error Handling

- API success: `{ success: true, ... }`; errors: `{ error, message? }` with proper status codes
- Defensive AI JSON parsing: strip code fences, extract first `{...}`, try/catch, then fallback
- Keep responses lean; avoid storing raw prompts/large payloads in DB

## 🛠️ Available Commands

> **⚠️ All commands must be run from the project root directory**

### Development & Build
```bash
npm run dev              # Start development server (with Turbopack)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint code quality checks
```

### Database Management
```bash
npm run db:generate      # Generate Prisma client from schema
npm run db:migrate       # Create and run database migrations
npm run db:studio        # Open Prisma Studio (database GUI)
```

### Testing & Simulation
```bash
npm run simulate         # Continuous mixed normal anomalies (60s interval)
npm run simulate:single  # Single shipment + optional analysis
node tests/test-normal.js  # Baseline (agent may be off)
node tests/test-ai.js      # Force analysis path
node tests/test-attack-sim.js  # Attack scenario simulation
```

## � Security & Compliance

### Built-in Security Features
- **🛡️ Default Safe Mode**: AI agent disabled by default across all users
- **🔒 Authenticated APIs**: All endpoints validate requests and user permissions  
- **📊 Audit Trail**: All agent actions and alerts stored with timestamps
- **🔑 Secure Storage**: API keys and sensitive data properly isolated
- **⚡ Rate Limited**: AI calls optimized to prevent token exhaustion

### Data Protection
- **🚫 No PII Logging**: Personal data never exposed in console logs
- **🔐 Encrypted Transport**: HTTPS/TLS for all API communications
- **💾 Persistent State**: User preferences stored securely in PostgreSQL
- **🧹 Data Cleanup**: Dismissed alerts can be permanently deleted

### Compliance Ready
- **📋 SOC 2 Aligned**: Structured logging and access controls
- **🔍 GDPR Compatible**: User data management and deletion capabilities
- **📊 Audit Support**: Complete activity logs for security reviews

## 🎯 Getting Started Checklist

Follow this checklist to ensure successful setup:

- [ ] **Navigate to correct directory**: Ensure you're in the project root
- [ ] **Install dependencies**: `npm install` completes without errors
- [ ] **Generate Prisma client**: `npx prisma generate` runs successfully  
- [ ] **Verify environment**: `.env` file exists with OpenRouter API key
- [ ] **Start development server**: `npm run dev` starts on port 3000
- [ ] **Access dashboard**: Navigate to http://localhost:3000/dashboard
- [ ] **Enable AI agent**: Toggle the agent ON in the dashboard
- [ ] **Test simulation**: Run `npm run simulate:single` in new terminal
- [ ] **Verify alerts**: Check that alerts appear in the dashboard

## 🧑‍💻 Login & Logout Guide (for All Users)

### 🔐 Demo Accounts (RBAC) — Email + Password

For class demos requiring strict role separation (RBAC), you can enable simple email/password demo accounts. Set these environment variables and use the "Demo Accounts" tab on the login page:

```env
# Optional demo users (mutually exclusive roles)
DEMO_ADMIN_EMAIL=admin@example.com
DEMO_ADMIN_PASSWORD=adminpass
DEMO_ANALYST_EMAIL=analyst@example.com
DEMO_ANALYST_PASSWORD=analystpass
DEMO_OPERATOR_EMAIL=operator@example.com
DEMO_OPERATOR_PASSWORD=operatorpass
```

Notes:
- Each demo account is permanently mapped to its role (ADMIN, ANALYST, OPERATOR). The server issues a JWT containing this role.
- Server-side RBAC is enforced on protected APIs; page routing enforces role-specific dashboards.
- The passwordless flow below still works in parallel; choose whichever is needed for your demo.

### 🔐 Login

The Logistics Defense AI Platform uses a **passwordless authentication system**, meaning users can log in securely using their **email** or **phone number** — no password required.

**Steps to log in:**

1. Open the platform at **http://localhost:3000/login** (or your deployed URL)
2. Choose **Email Login** or **Phone Login** tab
3. Enter your email address or phone number
4. Click **"Send Verification Code"**
5. Check your email (or console output in development mode) for the 6-digit code
6. Enter the code and click **"Verify & Login"**
7. ✅ You'll be redirected to your personalized **Dashboard**

**Notes:**
- If your email or phone number is not registered, the system will **automatically create a new user account**
- Verification codes are valid for **5 minutes**
- In development mode, verification codes appear in the **server terminal** console
- In production, codes can be sent via **SendGrid** (email) or **Twilio** (SMS) for real delivery
- Rate limit: Maximum **3 code requests per minute** per IP address

**Development Mode Tips:**
- Watch the terminal where `npm run dev` is running
- You'll see output like:
  ```
  🔐 VERIFICATION CODE for test@example.com:
  📧 Code: 123456
  ⏰ Expires: 10/15/2024, 8:30:00 PM
  👤 User ID: clxxx123
  ```
- In development, an alert popup may also display the code

---

### 🚪 Logout

Logging out is simple and secure:

1. Click the **"Logout"** button in the top-right corner of the navigation bar
2. Your authentication session and cookies are immediately cleared on the server
3. You will be redirected to the **Login** page
4. Access to protected pages (like `/dashboard`) will now require re-login

**What happens during logout:**
- JWT session token is invalidated
- `auth_token` cookie is cleared from your browser
- All cached authentication data is removed
- You cannot access protected routes until logging in again

---

### 🔒 Security & Sessions

**Session Duration:**
- JWT tokens expire after **7 days** of inactivity
- Verification codes expire after **5 minutes**

**Protected Routes:**
- `/dashboard` - Requires authentication
- All `/api/*` routes (except `/api/auth/*` and `/api/health`)

**Public Routes:**
- `/login` - Login page (always accessible)
- `/api/auth/*` - Authentication endpoints
- `/api/health` - Health check endpoint

**Session Persistence:**
- Your login session persists across browser tabs and page refreshes
- Sessions survive server restarts (stored in JWT token)
- Close browser to auto-logout (cookie-based)

---

### 🧰 Developer Notes

- **No `.env` configuration needed for end users** — only the server operator needs environment variables
- All login verification and JWT session logic happen on the backend
- New users are automatically created when they first log in with an unregistered email/phone
- User accounts are linked to the AI agent settings (each user has individual `agentActive` state)

**For Server Operators:**

Ensure your `.env` file contains:
```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secure-random-secret-key"
OPENROUTER_API_KEY="your-openrouter-api-key"
# Optional: demo RBAC login accounts
DEMO_ADMIN_EMAIL="admin@example.com"
DEMO_ADMIN_PASSWORD="adminpass"
DEMO_ANALYST_EMAIL="analyst@example.com"
DEMO_ANALYST_PASSWORD="analystpass"
DEMO_OPERATOR_EMAIL="operator@example.com"
DEMO_OPERATOR_PASSWORD="operatorpass"
```

Generate a secure `NEXTAUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🧪 Testing the Platform

### 1. Basic Functionality Test
```bash
# In project root directory
npm run simulate:single
```
Expected: One new shipment appears in the dashboard table

### 2. AI Agent Test  
1. Navigate to http://localhost:3000/dashboard
2. Click "Enable" on the AI Agent toggle (should turn green)
3. Run simulation: `npm run simulate:single`
4. Check if alerts appear in the right panel (may take 10-15 seconds)

### 3. Continuous Monitoring Test
```bash
# In project root directory  
npm run simulate
```
Expected: New shipments generated every 60 seconds with AI analysis

### 4. Database Inspection
```bash
# Open database GUI
npm run db:studio
```
Navigate to http://localhost:5555 to inspect data tables

## 🚀 Deployment Guide

### Vercel Deployment (Recommended)

1. **Prepare Repository**
```bash
git add .
git commit -m "Deploy Logistics Defense AI Platform"
git push origin main
```

2. **Connect to Vercel**
   - Visit [vercel.com](https://vercel.com) and connect your GitHub repository
   - Select the project root directory
   - Vercel will auto-detect Next.js configuration

3. **Configure Environment Variables**
   Add these variables in Vercel dashboard:
   ```
   DATABASE_URL=your_production_postgresql_url
   OPENROUTER_API_KEY=your_openrouter_api_key
   NEXTAUTH_SECRET=your_secure_production_secret
   NEXTAUTH_URL=https://your-app-name.vercel.app
   ```

4. **Database Setup**
   - Use [Neon.tech](https://neon.tech) or [PlanetScale](https://planetscale.com) for production PostgreSQL
   - Run migration: `npx prisma migrate deploy`

### Docker Deployment

1. **Create Dockerfile** (in project root directory)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

2. **Build and Run**
```bash
docker build -t info-492-demo .
docker run -p 3000:3000 --env-file .env info-492-demo
```

## 🔧 Troubleshooting Guide

### Common Issues

**🚫 "Cannot find module '@/lib/prisma'"**
```bash
# Solution: Regenerate Prisma client
npx prisma generate
```

**🚫 "ENOENT: no such file or directory"**  
```bash
# Solution: Ensure you're in the correct directory
# Should already be in project root directory
pwd  # Should show path ending in INFO-492-Demo
```

**🚫 "Database connection failed"**
```bash  
# Solution: Check if database is running
npx prisma db push
# Or reset database
npx prisma migrate reset
```

**🚫 "Port 3000 already in use"**
```bash
# Solution: Kill existing process or use different port
npx kill-port 3000
# Or start on different port
npm run dev -- -p 3001
```

**🚫 "OpenRouter API error"**
- Verify API key in `.env`
- If failing, system should still return fallback analysis (`source: fallback`)
- Inspect server logs for `[AI]` prefixed messages

**🚫 "No alerts generating"**
- Confirm agent is ON (Agent Toggle active + Status Monitor shows Active/Idle)
- Verify simulation created shipments (`/api/shipments` response not empty)
- Risk must exceed 20 to persist an alert; inspect AI response JSON
- Fallback path may yield lower scores; retry or run attack simulation

### Reset Everything
```bash
# Complete reset (Windows PowerShell friendly)
Remove-Item -Recurse -Force node_modules,.next 2>$null
npm install
npx prisma generate
npx prisma migrate reset
npm run dev
```

### Get Help
- **Check Logs**: Browser console (F12) and terminal output
- **Database Issues**: Run `npm run db:studio` to inspect data
- **API Issues**: Test endpoints directly with curl or Postman
- **Performance**: Monitor Network tab in browser dev tools

## 📚 Learn More

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs) - Framework features and API
- [React Documentation](https://react.dev) - Component development guide

### Database & ORM
- [Prisma Documentation](https://www.prisma.io/docs) - Database ORM guide
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/) - Database fundamentals

### AI Integration  
- [OpenRouter API Docs](https://openrouter.ai/docs) - AI model integration
- [DeepSeek Model Info](https://openrouter.ai/models/deepseek/deepseek-chat) - AI capabilities

### Deployment Platforms
- [Vercel Deployment Guide](https://vercel.com/docs) - Serverless hosting
- [Neon Database](https://neon.tech/docs) - Serverless PostgreSQL
- [Render.com Guide](./RENDER_DEPLOYMENT.md) - **Full production deployment with PostgreSQL**

## 🌐 Production Deployment

### Deploy to Render.com (Recommended)

This project is configured for one-click deployment to Render.com with PostgreSQL database:

1. **Push to GitHub**: Ensure your code is in a GitHub repository
2. **Create Blueprint**: In Render dashboard, create a new Blueprint
3. **Configure Environment**: Add your `OPENROUTER_API_KEY`
4. **Deploy**: Render automatically builds, migrates, and starts your app

📖 **See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for complete step-by-step instructions**

### Key Features for Production
- ✅ PostgreSQL database (replaces SQLite)
- ✅ Automatic migrations on deploy
- ✅ Secure environment variable management
- ✅ Health check endpoint (`/api/health`)
- ✅ Simulated attacks work via API
- ✅ Agent AI analysis fully functional

### Local Development vs Production

**Development (SQLite)**:
```bash
DATABASE_URL="file:./prisma/dev.db"
npm run dev
```

**Production (PostgreSQL on Render)**:
```bash
DATABASE_URL="postgresql://..." # Auto-configured by Render
npm start
```

The schema automatically supports both databases with minimal changes.

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes in the project directory
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`  
6. Open a Pull Request

---

**⚠️ Security Notice**: This platform is designed for educational and demonstration purposes. For production use with real logistics data, conduct a thorough security audit and implement additional authentication, authorization, and data protection measures.
