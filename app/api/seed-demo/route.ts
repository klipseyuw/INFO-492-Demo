// app/api/seed-demo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "default-no-store";

// tiny utils
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

// --- AUTH GATE: allow ADMIN cookie or x-seed-key header ---
async function isAuthorized(req: NextRequest) {
  // 1) Header secret
  const seedHeader = req.headers.get("x-seed-key");
  if (seedHeader && process.env.SEED_SECRET && seedHeader === process.env.SEED_SECRET) {
    return true;
  }

  // 2) JWT cookie with ADMIN role
  const cookie = req.cookies.get("auth")?.value;
  if (!cookie) return false;

  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "dev-secret");
    const { payload } = await jwtVerify(cookie, secret);
    // payload.role was set when you issued the token
    return payload && (payload as any).role === "ADMIN";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);

    // tunable params via query string
    const nShipments = Math.min(parseInt(searchParams.get("n") || "200", 10) || 200, 2000);
    const alertRate  = Math.max(0, Math.min(parseFloat(searchParams.get("alertRate") || "0.35"), 1)); // 0..1

    // Ensure demo users
    const [admin, analyst, operator] = await Promise.all([
      prisma.user.upsert({
        where: { email: "admin@example.com" },
        update: {},
        create: { email: "admin@example.com", name: "Admin", role: "ADMIN", agentActive: true },
      }),
      prisma.user.upsert({
        where: { email: "analyst@example.com" },
        update: {},
        create: { email: "analyst@example.com", name: "Analyst", role: "ANALYST", agentActive: true },
      }),
      prisma.user.upsert({
        where: { email: "operator@example.com" },
        update: {},
        create: { email: "operator@example.com", name: "Operator", role: "OPERATOR", agentActive: false },
      }),
    ]);

    // Generate data
    const drivers = ["Lopez","Singh","Chen","Garcia","Patel","Ibrahim","Nguyen","Smith"];
    const cities  = ["Seattle, WA","Portland, OR","Spokane, WA","Boise, ID","Tacoma, WA","Eugene, OR"];
    const cargos  = ["Batteries","Chips","Textiles","Electronics","Perishables","Medical","Hardware"];

    const now = Date.now();
    const shipmentsData = Array.from({ length: nShipments }).map((_, i) => {
      const hoursAhead = randInt(1, 36);
      const expected   = new Date(now + hoursAhead * 3600 * 1000);
      const status     = pick<"in-progress" | "completed" | "delayed">(["in-progress","completed","delayed"]);
      const actualETA  = status === "completed" ? new Date(expected.getTime() + randInt(-30, 90) * 60 * 1000) : null;
      const predictedDelay = Math.random() < 0.4 ? randInt(5, 75) : null;

      const cargoQuantity = randInt(10, 300);
      const cargoUnitCost = randInt(5, 500);

      return {
        routeId: `R-${1000 + i}`,
        driverName: pick(drivers),
        expectedETA: expected,
        actualETA,
        routeStatus: status,
        origin: pick(cities),
        destination: pick(cities),
        gpsOnline: Math.random() > 0.05,
        lastKnownAt: new Date(now - randInt(0, 180) * 60 * 1000),
        lastKnownLat: 47 + Math.random(),
        lastKnownLng: -122 - Math.random(),
        speedKph: randInt(0, 105),
        headingDeg: randInt(0, 359),
        cargoName: pick(cargos),
        cargoQuantity,
        cargoUnitCost,
        cargoTotalValue: cargoQuantity * cargoUnitCost,
        predictedDelay,
        createdAt: new Date(now - randInt(0, 5 * 24 * 60) * 60 * 1000),
      };
    });

    // Bulk insert shipments
    const BATCH = 250;
    const batches = [];
    for (let i = 0; i < shipmentsData.length; i += BATCH) {
      batches.push(prisma.shipment.createMany({ data: shipmentsData.slice(i, i + BATCH) }));
    }
    const results = await prisma.$transaction(batches);
    const insertedShipments = results.reduce((sum, r) => sum + (r?.count || 0), 0);

    // Read back recent shipments to build alerts
    const recentShipments = await prisma.shipment.findMany({
      orderBy: { createdAt: "desc" },
      take: nShipments,
      select: { id: true, routeId: true },
    });

    const alertTypes = ["GPS_TAMPER","ROUTE_DEVIATION","DATA_EXFIL","UNAUTHORIZED_ACCESS","LOAD_ANOMALY"];
    const severities = ["low","medium","high"];
    const alertsData = recentShipments
      .filter(() => Math.random() < alertRate)
      .map((s) => ({
        shipmentId: s.id,
        type: pick(alertTypes),
        severity: pick(severities),
        description: `Automated alert for ${s.routeId} — ${new Date().toLocaleString()}`,
      }));

    const alertBatches = [];
    for (let i = 0; i < alertsData.length; i += BATCH) {
      alertBatches.push(prisma.alert.createMany({ data: alertsData.slice(i, i + BATCH) }));
    }
    const alertResults = alertBatches.length ? await prisma.$transaction(alertBatches) : [];
    const insertedAlerts = alertResults.reduce((sum, r) => sum + (r?.count || 0), 0);

    return NextResponse.json({
      success: true,
      params: { nShipments, alertRate },
      inserted: { users: 3, shipments: insertedShipments, alerts: insertedAlerts },
    });
  } catch (e) {
    console.error("seed-demo error", e);
    return NextResponse.json({ success: false, error: "seed failed" }, { status: 500 });
  }
}
