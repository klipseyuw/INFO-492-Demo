# 🚛 Logistics Defense AI Platform

> **⚠️ IMPORTANT**: All commands in this README should be run from the project root directory.

A cutting-edge cybersecurity defense platform for warehouse logistics operations, utilizing AI-powered anomaly detection to identify route manipulation, data tampering, and cyber-physical disruptions in real-time.

## 🏗️ Technology Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes with serverless functions
- **Database**: PostgreSQL with Prisma ORM
- **AI Engine**: OpenRouter API (DeepSeek Chat v3.1 Free tier)
- **Runtime**: Node.js 18+ with Turbopack for fast development
- **Deployment**: Ready for Vercel, Netlify, or Docker

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **Git** installed for version control
- **Terminal/Command Prompt** access
- **OpenRouter API account** (free tier available)
- **PostgreSQL database** (optional - Prisma dev database included)

## 🚀 Quick Start Guide

### Step 1: Navigate to Project Directory

```bash
# CRITICAL: All commands must be run from the project root directory
# (already in correct directory if you cloned the project)
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Database Configuration

**Option A: Use Built-in Prisma Database (Recommended)**
```bash
# Generate Prisma client
npx prisma generate

# The database is pre-configured in .env with a working Prisma dev database
```

**Option B: Use Your Own PostgreSQL Database**
```bash
# 1. Update the DATABASE_URL in .env file with your connection string
# 2. Run migration to create tables
npx prisma migrate dev --name init

# 3. Generate Prisma client
npx prisma generate
```

### Step 4: Configure OpenRouter API

The `.env` file already contains a working OpenRouter API key for testing. For production:

1. **Sign up** at [OpenRouter.ai](https://openrouter.ai/)
2. **Get your API key** from the dashboard
3. **Replace** the `OPENROUTER_API_KEY` in your `.env` file

```env
OPENROUTER_API_KEY="sk-or-v1-your-api-key-here"
```

### Step 5: Start Development Server

```bash
# Must be run from project root directory
npm run dev
```

🎉 **Success!** Navigate to **http://localhost:3000/dashboard**

## 🛡️ Platform Features

### 🤖 AI-Powered Threat Detection
- **Real-time Analysis**: Monitors logistics data using DeepSeek AI model
- **Anomaly Detection**: Identifies route manipulation, timing irregularities, and data inconsistencies  
- **Risk Scoring**: 0-100 scale with automatic alert generation (20+ triggers alerts)
- **Safety First**: AI agent is **OFF by default** - requires manual activation
- **Token Efficient**: Minimizes API calls to preserve free tier credits

### 🎛️ Intelligent Control Center
- **One-Click Toggle**: Enable/disable AI monitoring instantly
- **Persistent State**: Agent status saved to database across sessions
- **Visual Indicators**: Real-time status with color-coded feedback
- **User Management**: Individual agent control per user account

### 📊 Live Operations Dashboard  
- **Route Tracking**: Monitor active shipments, drivers, and delivery status
- **ETA Analysis**: Compare expected vs actual arrival times
- **Delay Detection**: Visual indicators for routes running behind schedule
- **Auto-Refresh**: Updates every 30 seconds without page reload
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### 🚨 Advanced Alert System
- **Severity Classification**: High, Medium, Low risk categorization
- **Real-time Notifications**: Instant alerts for detected anomalies
- **Detailed Reporting**: Timestamps, route IDs, and threat descriptions
- **Dismissible Alerts**: Clean up resolved issues with one click
- **Alert History**: Persistent storage for audit and compliance

### 🧪 Integrated Testing Suite
Generate realistic test data to validate the platform:

```bash
# Run from project root directory
npm run simulate         # Continuous simulation (60-second intervals)
npm run simulate:single  # Single route test for quick validation
```

## 📁 Project Architecture

```
project-root/
├── 📱 app/                          # Next.js App Router
│   ├── 🏠 page.tsx                 # Home page (redirects to dashboard)
│   ├── 📊 dashboard/               # Main application dashboard
│   │   └── page.tsx                # Dashboard UI with all components
│   └── 🔌 api/                     # Backend API endpoints
│       ├── 🤖 ai/route.ts          # AI analysis engine
│       ├── ⚙️ agent/toggle/route.ts # Agent control system
│       ├── 🚛 shipments/route.ts   # Shipment data management
│       └── 🚨 alerts/route.ts      # Alert system API
├── 🧩 components/                   # Reusable React components
│   ├── AgentToggle.tsx             # AI agent control panel
│   ├── ShipmentTable.tsx           # Live shipment tracking
│   └── AlertFeed.tsx               # Security alerts display
├── ✅ tests/                        # Manual/integration test scripts
│   ├── test-normal.js              # Normal (low-risk) case
│   ├── test-ai.js                  # High-risk anomaly case
│   └── final-test.js               # Combined activation & evaluation
├── 🔗 lib/                         # Shared utilities
│   └── prisma.ts                   # Database connection client
├── 🗄️ prisma/                      # Database configuration
│   └── schema.prisma               # Data models & relationships
├── 🧪 scripts/                     # Development tools
│   └── simulateRoutes.ts           # Test data generation
├── 📝 .env                         # Environment configuration
└── 📋 package.json                 # Dependencies & scripts
```

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
npm run simulate         # Generate continuous test data (60s intervals)
npm run simulate:single  # Generate single test route for validation
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
- Verify API key is correct in `.env` file
- Check your OpenRouter account credits at [openrouter.ai](https://openrouter.ai)
- Ensure no extra spaces in the API key string

**🚫 "No alerts generating"**
- Ensure AI agent is toggled ON (green status)
- Wait 10-15 seconds after running simulation  
- Check browser console for API errors (F12 → Console)

### Reset Everything
```bash
# Complete reset if nothing works
rm -rf node_modules .next
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
