// app/api/database/simulate/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest, requireRole } from "@/lib/auth";

const names = [
  "Avery", "Jordan", "Taylor", "Riley", "Dakota", "Skyler", "Harper", "Quinn",
  "Rowan", "Elliot", "Reese", "Alex", "Casey", "Jamir", "Mila", "Isla", "Kai",
  "Owen", "Noah", "Liam", "Maya", "Zoe", "Nina", "Ivy", "Beck",
];
const regions = ["PNW", "SW", "NE", "SE", "MW"];
const roles = ["ADMIN", "ANALYST", "OPERATOR"] as const;
const tables = [
  "Shipments", "Alerts", "Analyses", "Users", "Billing", "Drivers",
  "Vehicles", "Warehouses",
];
const cities = [
  "Seattle, US", "Portland, US", "San Jose, US", "Austin, US", "NYC, US",
  "Boston, US", "Miami, US", "Chicago, US",
];
const ips = [
  "10.0.0.1", "10.0.0.2", "54.12.33.9", "100.64.2.10", "34.201.99.4",
  "198.51.100.22", "203.0.113.55", "192.0.2.1",
];
const actions = ["SELECT", "UPDATE", "DELETE", "EXPORT"] as const;

const rand = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  const guard = requireRole(session, ["ANALYST", "ADMIN"]);
  if (!guard.ok)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const {
      userCount = 5,        // Reduced from 25 - real logins tracked separately
      loginCount = 10,       // Reduced from 50 - real logins tracked separately
      accessCount = 20,      // Reduced from 100 - minimal synthetic data
      runAgent = false,
    } = body;

    console.log("[DATABASE/SIMULATE] Starting simulation (minimal synthetic data)...");
    console.log("[DATABASE/SIMULATE] Note: Real login attempts are tracked automatically via auth endpoints");

    // Create users
    const users = await Promise.all(
      Array.from({ length: userCount }, async (_, i) => {
        const first = rand(names);
        const last = rand(names);
        const email = `${first}.${last}.${i}@example.com`
          .toLowerCase()
          .replace(/\s+/g, "");

        // Check if user exists
        const existing = await prisma.databaseUser.findUnique({
          where: { email },
        });

        if (existing) return existing;

        return prisma.databaseUser.create({
          data: {
            name: `${first} ${last}`,
            email,
            role: rand([...roles]) as "ADMIN" | "ANALYST" | "OPERATOR",
            region: rand(regions),
            lastLoginIP: rand(ips),
            lastLoginLocation: rand(cities),
            lastLoginAt: new Date(Date.now() - Math.random() * 3600000), // Last hour
          },
        });
      })
    );

    console.log(`[DATABASE/SIMULATE] Created ${users.length} users`);

    // Create login attempts
    const logins = await Promise.all(
      Array.from({ length: loginCount }, () => {
        const user = rand(users);
        const success = Math.random() > 0.15; // 85% success rate

        return prisma.loginAttempt.create({
          data: {
            userId: user.id,
            success,
            ip: rand(ips),
            location: rand(cities),
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            timestamp: new Date(
              Date.now() - Math.random() * 600000 // Last 10 minutes
            ),
          },
        });
      })
    );

    console.log(`[DATABASE/SIMULATE] Created ${logins.length} login attempts`);

    // Create access events
    const events = await Promise.all(
      Array.from({ length: accessCount }, () => {
        const user = rand(users);
        const action = (Math.random() < 0.1 ? "EXPORT" : rand([...actions])) as string;
        const tableName = rand(tables);
        const isBig = Math.random() < 0.15;
        const estSizeMB =
          action === "EXPORT" || isBig
            ? 10 + Math.random() * 500
            : Math.random() * 8;

        return prisma.databaseAccessEvent.create({
          data: {
            userId: user.id,
            action,
            tableName,
            estSizeMB,
            ip: rand(ips),
            location: rand(cities),
            timestamp: new Date(
              Date.now() - Math.random() * 900000 // Last 15 minutes
            ),
          },
        });
      })
    );

    console.log(`[DATABASE/SIMULATE] Created ${events.length} access events`);

    // Optionally run the agent to detect anomalies
    let anomaliesDetected = 0;
    if (runAgent) {
      anomaliesDetected = await detectAnomalies();
      console.log(
        `[DATABASE/SIMULATE] Agent detected ${anomaliesDetected} anomalies`
      );
    }

    return NextResponse.json({
      success: true,
      message: "Simulation completed",
      stats: {
        users: users.length,
        loginAttempts: logins.length,
        accessEvents: events.length,
        anomaliesDetected,
      },
    });
  } catch (error) {
    console.error("[DATABASE/SIMULATE] Error:", error);
    return NextResponse.json(
      { error: "Simulation failed", message: String(error) },
      { status: 500 }
    );
  }
}

async function detectAnomalies(): Promise<number> {
  const now = new Date();
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

  const users = await prisma.databaseUser.findMany();
  let anomalyCount = 0;

  const BRUTE_FORCE_THRESHOLD = 5;
  const SENSITIVE_BURST_MB = 100;
  const EXPORT_SPIKE_MB = 200;
  const OPERATOR_FORBIDDEN = ["Users", "Billing"];

  for (const user of users) {
    // Rule 1: Brute force detection
    const failedLogins = await prisma.loginAttempt.count({
      where: {
        userId: user.id,
        success: false,
        timestamp: { gte: tenMinAgo },
      },
    });

    if (failedLogins >= BRUTE_FORCE_THRESHOLD) {
      await prisma.databaseAnomaly.create({
        data: {
          userId: user.id,
          type: "LOGIN_BRUTE_FORCE",
          severity: failedLogins >= BRUTE_FORCE_THRESHOLD + 2 ? "CRITICAL" : "HIGH",
          description: `Detected ${failedLogins} failed logins in last 10m.`,
        },
      });
      anomalyCount++;
    }

    // Rule 2: Sensitive data burst
    const sensitiveReads = await prisma.databaseAccessEvent.findMany({
      where: {
        userId: user.id,
        tableName: { in: ["Users", "Billing", "Analyses", "Alerts"] },
        timestamp: { gte: fiveMinAgo },
      },
      select: { estSizeMB: true },
    });

    const totalMB = sensitiveReads.reduce(
      (sum, e) => sum + (e.estSizeMB || 0),
      0
    );

    if (totalMB >= SENSITIVE_BURST_MB) {
      await prisma.databaseAnomaly.create({
        data: {
          userId: user.id,
          type: "SENSITIVE_READ_BURST",
          severity: totalMB > SENSITIVE_BURST_MB * 1.5 ? "HIGH" : "MEDIUM",
          description: `~${Math.round(totalMB)}MB sensitive reads in last 5m.`,
        },
      });
      anomalyCount++;
    }

    // Rule 3: RBAC violations (operators accessing forbidden tables)
    if (user.role === "OPERATOR") {
      const violations = await prisma.databaseAccessEvent.findMany({
        where: {
          userId: user.id,
          tableName: { in: OPERATOR_FORBIDDEN },
          timestamp: { gte: fiveMinAgo },
        },
      });

      for (const violation of violations) {
        await prisma.databaseAnomaly.create({
          data: {
            userId: user.id,
            type: "RBAC_VIOLATION",
            severity: "HIGH",
            description: `Operator accessed restricted table "${violation.tableName}".`,
            metadata: JSON.stringify({ tableName: violation.tableName }),
          },
        });
        anomalyCount++;
      }
    }
  }

  // Rule 4: Export spikes
  const largeExports = await prisma.databaseAccessEvent.findMany({
    where: {
      action: "EXPORT",
      estSizeMB: { gte: EXPORT_SPIKE_MB },
      timestamp: { gte: fiveMinAgo },
    },
    include: {
      user: true,
    },
  });

  for (const exportEvent of largeExports) {
    await prisma.databaseAnomaly.create({
      data: {
        userId: exportEvent.userId,
        type: "EXPORT_SPIKE",
        severity:
          (exportEvent.estSizeMB || 0) > EXPORT_SPIKE_MB * 2
            ? "CRITICAL"
            : "HIGH",
        description: `Large data export ~${Math.round(exportEvent.estSizeMB || 0)}MB from "${exportEvent.tableName}".`,
        metadata: JSON.stringify({
          tableName: exportEvent.tableName,
          sizeMB: exportEvent.estSizeMB,
        }),
      },
    });
    anomalyCount++;
  }

  return anomalyCount;
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  const guard = requireRole(session, ["ADMIN"]);
  if (!guard.ok)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // Clear all database monitoring data
    await prisma.databaseAnomaly.deleteMany({});
    await prisma.databaseAccessEvent.deleteMany({});
    await prisma.loginAttempt.deleteMany({});
    await prisma.databaseUser.deleteMany({});

    return NextResponse.json({
      success: true,
      message: "All database monitoring data cleared",
    });
  } catch (error) {
    console.error("[DATABASE/SIMULATE] Clear error:", error);
    return NextResponse.json(
      { error: "Failed to clear data" },
      { status: 500 }
    );
  }
}
