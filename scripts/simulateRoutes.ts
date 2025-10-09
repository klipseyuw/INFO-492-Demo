import axios from "axios";
import { config } from "dotenv";

// Load environment variables
config();

const API_BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const DEMO_USER_ID = "user-1";

// Sample driver names for realistic simulation
const DRIVERS = [
  "John Martinez", "Sarah Johnson", "Mike Chen", "Lisa Rodriguez",
  "David Thompson", "Emma Wilson", "Carlos Sanchez", "Maya Patel",
  "Robert Kim", "Jessica Brown", "Alex Garcia", "Sophia Lee"
];

// Sample route patterns
const ROUTE_PREFIXES = ["RT-", "LG-", "DL-", "WH-", "TR-"];

interface ShipmentData {
  routeId: string;
  driverName: string;
  expectedETA: string;
  actualETA?: string;
  routeStatus: string;
  // Optional telemetry (not persisted in DB; used for AI context only)
  origin?: string;
  destination?: string;
  gpsOnline?: boolean;
  lastKnownLat?: number;
  lastKnownLng?: number;
  lastKnownAt?: string;
  speedKph?: number;
  headingDeg?: number;
}

function generateRandomRoute(): string {
  const prefix = ROUTE_PREFIXES[Math.floor(Math.random() * ROUTE_PREFIXES.length)];
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}${number}`;
}

function generateRandomDriver(): string {
  return DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
}

function generateShipmentData(): ShipmentData {
  const now = new Date();
  const baseDelay = Math.random() * 120; // 0-120 minutes base time
  
  // Expected ETA: 15-60 minutes from now
  const expectedMinutes = Math.floor(Math.random() * 45) + 15;
  const expectedETA = new Date(now.getTime() + expectedMinutes * 60 * 1000);
  
  // Simulate different scenarios
  const scenario = Math.random();
  let actualETA: Date | undefined;
  let routeStatus = "in-progress";
  
  if (scenario < 0.6) {
    // 60% chance: Normal delivery with slight variation
    const variation = (Math.random() - 0.5) * 20; // ±10 minutes
    actualETA = new Date(expectedETA.getTime() + variation * 60 * 1000);
    routeStatus = Math.random() < 0.3 ? "delivered" : "in-progress";
  } else if (scenario < 0.75) {
    // 15% chance: Minor delay (15-30 minutes) 
    const delay = Math.floor(Math.random() * 15) + 15;
    actualETA = new Date(expectedETA.getTime() + delay * 60 * 1000);
    routeStatus = "delayed";
  } else if (scenario < 0.9) {
    // 15% chance: Moderate delay (30-60 minutes)
    const delay = Math.floor(Math.random() * 30) + 30;
    actualETA = new Date(expectedETA.getTime() + delay * 60 * 1000);
    routeStatus = "delayed";
  } else if (scenario < 0.97) {
    // 7% chance: Major delay - potential threat (60-120 minutes)
    const delay = Math.floor(Math.random() * 60) + 60;
    actualETA = new Date(expectedETA.getTime() + delay * 60 * 1000);
    routeStatus = "delayed";
  } else {
    // 3% chance: Critical threat - route manipulation (120+ minutes or early arrival)
    const isEarlyAttack = Math.random() < 0.3;
    if (isEarlyAttack) {
      // Suspiciously early arrival (data tampering)
      const earlyBy = Math.floor(Math.random() * 60) + 30;
      actualETA = new Date(expectedETA.getTime() - earlyBy * 60 * 1000);
      routeStatus = "suspicious";
    } else {
      // Major delay (route hijacking/manipulation)
      const delay = Math.floor(Math.random() * 120) + 120;
      actualETA = new Date(expectedETA.getTime() + delay * 60 * 1000);
      routeStatus = "critical";
    }
  }

  // Generate lightweight telemetry
  const cities = [
    'Seattle, WA', 'Tacoma, WA', 'Spokane, WA', 'Portland, OR', 'Boise, ID',
    'Missoula, MT', 'Yakima, WA', 'Eugene, OR', 'Salem, OR', 'Bellingham, WA'
  ];
  const origin = cities[Math.floor(Math.random() * cities.length)];
  let destination = cities[Math.floor(Math.random() * cities.length)];
  if (destination === origin) {
    destination = cities[(cities.indexOf(origin) + 3) % cities.length];
  }
  const gpsOnline = Math.random() < 0.9; // 10% chance GPS offline
  const lastKnownLat = 45 + Math.random() * 5; // rough PNW band
  const lastKnownLng = -123 + Math.random() * 5;
  const lastKnownAt = new Date(now.getTime() - Math.floor(Math.random() * 60) * 60 * 1000).toISOString();
  const speedKph = Math.max(0, Math.round(80 + (Math.random() - 0.5) * 60)); // 50-110 kph approx
  const headingDeg = Math.floor(Math.random() * 360);

  return {
    routeId: generateRandomRoute(),
    driverName: generateRandomDriver(),
    expectedETA: expectedETA.toISOString(),
    actualETA: actualETA?.toISOString(),
    routeStatus,
    origin,
    destination,
    gpsOnline,
    lastKnownLat,
    lastKnownLng,
    lastKnownAt,
    speedKph,
    headingDeg
  };
}

async function createShipment(shipmentData: ShipmentData): Promise<boolean> {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/shipments`, shipmentData);
    console.log(`✓ Created shipment: ${shipmentData.routeId} (${shipmentData.driverName})`);
    return response.data.success;
  } catch (error) {
    console.error(`✗ Failed to create shipment: ${shipmentData.routeId}`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function analyzeWithAI(shipmentData: ShipmentData): Promise<void> {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/ai`, {
      ...shipmentData,
      userId: DEMO_USER_ID
    });
    
    if (response.data.analyzed) {
      const risk = response.data.riskScore || 0;
      const riskLevel = risk > 70 ? "HIGH" : risk > 40 ? "MEDIUM" : "LOW";
      console.log(`🤖 AI Analysis: ${shipmentData.routeId} - Risk: ${risk}% (${riskLevel})`);
      
      if (response.data.alertType && risk > 20) {
        console.log(`🚨 Alert Generated: ${response.data.alertType} - ${response.data.description}`);
      }
    } else {
      console.log(`ℹ️  AI Agent inactive for: ${shipmentData.routeId}`);
    }
  } catch (error) {
    console.error(`✗ AI analysis failed for: ${shipmentData.routeId}`, error instanceof Error ? error.message : error);
  }
}

async function simulateRoute(): Promise<void> {
  console.log("\n--- Simulating new logistics route ---");
  
  const shipmentData = generateShipmentData();
  
  // Create the shipment
  const created = await createShipment(shipmentData);
  
  if (created) {
    // Analyze with AI if the agent is active
    await analyzeWithAI(shipmentData);
  }
  
  console.log("--- Route simulation complete ---\n");
}

async function runContinuousSimulation(): Promise<void> {
  console.log("🚛 Starting Logistics Defense AI Simulation");
  console.log(`📊 Connecting to API at: ${API_BASE_URL}`);
  console.log("👤 Demo User ID:", DEMO_USER_ID);
  console.log("🔄 Generating new routes every 60 seconds...\n");
  
  // Initial simulation
  await simulateRoute();
  
  // Continue simulation every 60 seconds
  setInterval(async () => {
    await simulateRoute();
  }, 60000); // 60 seconds
}

async function runSingleSimulation(): Promise<void> {
  console.log("🚛 Running single route simulation");
  await simulateRoute();
  process.exit(0);
}

// Main execution
async function main(): Promise<void> {
  const mode = process.argv[2] || "continuous";
  
  if (mode === "single") {
    await runSingleSimulation();
  } else {
    await runContinuousSimulation();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Simulation stopped by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Simulation terminated');
  process.exit(0);
});

// Run the simulation
main().catch((error) => {
  console.error("❌ Simulation error:", error);
  process.exit(1);
});