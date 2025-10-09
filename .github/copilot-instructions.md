# DO NOT USE EMOJIS IN CODE

## 🚀 Project Overview

**Title:** Logistics Defense AI Platform
**Goal:** Build a cybersecurity defense webapp for the **warehouse logistics industry**, capable of detecting route manipulation, data anomalies, and cyber-physical disruptions.
**Stack:**

* **Framework:** Next.js 15 (App Router, TypeScript)
* **Database:** PostgreSQL (via Prisma ORM)
* **AI Model:** OpenRouter – `deepseek/deepseek-chat-v3.1:free`
* **UI:** TailwindCSS
* **Hosting:** Vercel (Frontend + API) + Neon.tech (DB)

This project supports **Agentic AI Defense Systems** that autonomously monitor logistics shipments and detect potential anomalies in real time.

---

## 🧩 Functional Requirements

1. **Shipment Tracking Dashboard**

   * Displays current routes, drivers, ETAs, and delivery status.
   * Shows alerts if anomalies are detected.

2. **AI Defense Agent**

   * Runs via `/api/ai/route.ts`.
   * Analyzes shipment data for anomalies (delays, route deviations, suspicious data).
   * Uses OpenRouter’s `deepseek-chat-v3.1:free`.
   * Must be off by default and only run when toggled ON by the user.

3. **Agent Control Panel**

   * Allows the user to enable/disable the AI agent.
   * Shows whether the agent is active.
   * Stored persistently in the database (`agentActive` boolean on `User` model).

4. **Alert System**

   * Saves detected issues to an `Alert` table.
   * Categorizes alerts by severity (`low`, `medium`, `high`).

5. **Simulation Tool**

   * Generates mock shipment data every few minutes to simulate real-world logistics activity.
   * Calls the AI API to evaluate anomalies when agent is active.

---

## ⚙️ Technical Setup

### 1. Initialize Project

```bash
npx create-next-app project-name --typescript --eslint
cd project-name
npm install prisma @prisma/client tailwindcss postcss autoprefixer axios dotenv openai
npx prisma init
```

---

### 2. Configure Prisma Schema

In `/prisma/schema.prisma`:

```prisma
model Shipment {
  id            String   @id @default(cuid())
  routeId       String
  driverName    String
  expectedETA   DateTime
  actualETA     DateTime?
  routeStatus   String   @default("in-progress")
  lastUpdated   DateTime @updatedAt
}

model Alert {
  id          String   @id @default(cuid())
  shipmentId  String
  type        String
  severity    String
  description String
  createdAt   DateTime @default(now())
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String?
  agentActive Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

Run migration:

```bash
npx prisma migrate dev --name init
```

---

### 3. Setup Environment Variables

In `.env`:

```bash
DATABASE_URL="postgresql://user:password@host:port/dbname"
OPENROUTER_API_KEY="your_openrouter_key_here"
```

---

### 4. Create `/lib/prisma.ts`

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ log: ["query"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
```

---

### 5. Implement AI Agent Endpoint (`/app/api/ai/route.ts`)

```ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import axios from "axios";

export async function POST(req: Request) {
  const { routeId, expectedETA, actualETA, userId } = await req.json();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.agentActive) {
    return NextResponse.json({ message: "Agent inactive" });
  }

  const prompt = `
    You are a cybersecurity defense AI for logistics.
    Analyze shipment data for possible route manipulation or cyber anomalies.
    Data:
    - Route ID: ${routeId}
    - Expected ETA: ${expectedETA}
    - Actual ETA: ${actualETA}
    Return JSON only:
    { "riskScore": <0-100>, "alertType": "<type>", "description": "<summary>" }
  `;

  const aiRes = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "deepseek/deepseek-chat-v3.1:free",
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    }
  );

  const output = aiRes.data.choices?.[0]?.message?.content || "{}";
  const result = JSON.parse(output);

  await prisma.alert.create({
    data: {
      shipmentId: routeId,
      type: result.alertType,
      severity: result.riskScore > 70 ? "high" : "low",
      description: result.description,
    },
  });

  return NextResponse.json(result);
}
```

---

### 6. Agent Toggle API (`/app/api/agent/toggle.ts`)

```ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId, activate } = await req.json();

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { agentActive: activate },
  });

  return NextResponse.json(updated);
}
```

---

### 7. Frontend Components

Create these in `/components`:

#### AgentToggle.tsx

```tsx
"use client";
import { useState } from "react";
import axios from "axios";

export default function AgentToggle({ userId, active }: { userId: string; active: boolean }) {
  const [isActive, setIsActive] = useState(active);

  const toggleAgent = async () => {
    const newState = !isActive;
    setIsActive(newState);
    await axios.post("/api/agent/toggle", { userId, activate: newState });
  };

  return (
    <button
      onClick={toggleAgent}
      className={`px-4 py-2 rounded-lg ${isActive ? "bg-green-600" : "bg-gray-400"}`}
    >
      {isActive ? "🟢 Agent Active" : "⚪ Agent Inactive"}
    </button>
  );
}
```

#### ShipmentTable.tsx

Displays live shipments (fake or real) and their statuses.

#### AlertFeed.tsx

Displays alerts in descending order of severity.

---

### 8. Real-Time Simulation (`/scripts/simulateRoutes.ts`)

```ts
import axios from "axios";

async function simulate() {
  const sample = {
    routeId: "R-" + Math.floor(Math.random() * 10000),
    expectedETA: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    actualETA: new Date(Date.now() + 1000 * 60 * (25 + Math.random() * 20)).toISOString(),
    userId: "<replace_with_user_id>",
  };
  await axios.post("http://localhost:3000/api/ai/route", sample);
  console.log("Simulated route:", sample.routeId);
}

setInterval(simulate, 60000);
```

---

### 9. UI Pages

In `/app/dashboard/page.tsx`:

```tsx
import AgentToggle from "@/components/AgentToggle";

export default function Dashboard() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Logistics Defense AI Dashboard</h1>
      <AgentToggle userId="<replace_with_user_id>" active={false} />
      {/* Add ShipmentTable and AlertFeed here */}
    </main>
  );
}
```

---

### 🔒 10. Safety and Persistence Rules

* Agent must **default to OFF** for all users.
* Only call OpenRouter API if agent is **active**.
* Store all alerts persistently in the database.
* Use minimal token calls to conserve credit (batch process if needed).

---

## 🧠 Optional Advanced Agents

* **Route Integrity Agent:** Detect mismatched GPS and ETA.
* **Payroll Integrity Agent:** Detect tampering with driver logs.
* **API Defense Agent:** Monitor suspicious API access patterns.

---

## 📁 Recommended Folder Layout

```
/app
  /dashboard
  /api
    /ai/route.ts
    /agent/toggle.ts
/components
  AgentToggle.tsx
  ShipmentTable.tsx
  AlertFeed.tsx
/lib
  prisma.ts
/prisma
  schema.prisma
/scripts
  simulateRoutes.ts
.env
COPILOT_INSTRUCTIONS.md
```

---

### ✅ Copilot Goals

* Follow this structure strictly.
* Minimize API token use.
* Generate only persistent, controlled AI interactions.
* Prefer clarity and observability (logs, dashboards).
* Do not auto-enable the AI agent; require explicit user action.
