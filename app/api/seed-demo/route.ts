import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// tiny utils
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // tunable params via query string
    const nShipments = Math.min(parseInt(searchParams.get("n") || "200", 10) || 200, 2000);
    const alertRate  = Math.max(0, Math.min(parseFloat(searchParams.get("alertRate") || "0.35"), 1)); // 0..1

    // Ensure a few demo users exist
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

    // Generate shipment rows in-memory
    const drivers = ["Lopez","Singh","Chen","Garcia","Patel","Ibrahim","Nguyen","Smith"];
    const cities  = ["Seattle, WA","Portland, OR","Spokane, WA","Boise, ID","Tacoma, WA","Eugene, OR"];
    const cargos  = ["Batteries","Chips","Textiles","Electronics","Perishables","Medical","Hardware"];

    const now = Date.now();
    const shipmentsData = Array.from({ length: nShipments }).map((_, i) => {
      const hoursAhead = randInt(1, 36);
      const expected   = new Date(now + hoursAhead * 3600 * 1000);
      const status     = pick<"in-progress" | "completed" | "delayed">(["in-progress","completed","delayed"]);

      // completed ones get actualETA
      const actualETA  =
        status === "completed"
          ? new Date(expected.getTime() + randInt(-30, 90) * 60 * 1000)
          : null;

      // sprinkle predictedDelay on some
      const predictedDelay = Math.random() < 0.4 ? randInt(5, 75) : null;

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
        cargoQuantity: randInt(10, 300),
        cargoUnitCost: randInt(5, 500),
        cargoTotalValue: 0, // will recompute
        predictedDelay,
        createdAt: new Date(now - randInt(0, 5 * 24 * 60) * 60 * 1000),
      };
    }).map(s => ({ ...s, cargoTotalValue: s.cargoQuantity! * s.cargoUnitCost! }));

    // Bulk insert shipments
    const batches = [];
    const BATCH = 250;
    for (let i = 0; i < shipmentsData.length; i += BATCH) {
      batches.push(
        prisma.shipment.createMany({
          data: shipmentsData.slice(i, i + BATCH),
        })
      );
    }
    const createManyResults = await prisma.$transaction(batches);
    const insertedShipments = createManyResults.reduce((sum, r) => sum + (r?.count || 0), 0);

    // Read back IDs for alerts (SQLite createMany doesn't return IDs)
    const recentShipments = await prisma.shipment.findMany({
      orderBy: { createdAt: "desc" },
      take: nShipments,
      select: { id: true, routeStatus: true, routeId: true },
    });

    // Build alerts for a subset
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

    // Insert alerts in batches
    const alertBatches = [];
    for (let i = 0; i < alertsData.length; i += BATCH) {
      alertBatches.push(prisma.alert.createMany({ data: alertsData.slice(i, i + BATCH) }));
    }
    const alertResults = alertBatches.length ? await prisma.$transaction(alertBatches) : [];
    const insertedAlerts = alertResults.reduce((sum, r) => sum + (r?.count || 0), 0);

    return NextResponse.json({
      success: true,
      params: { nShipments, alertRate },
      inserted: {
        users: 3,
        shipments: insertedShipments,
        alerts: insertedAlerts,
      },
    });
  } catch (e) {
    console.error("seed-demo error", e);
    return NextResponse.json({ success: false, error: "seed failed" }, { status: 500 });
  }
}
