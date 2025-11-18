/**
 * In-process continuous simulation manager
 * Runs simulation intervals when activated via toggle
 */

import axios from "axios";

const SIMULATION_INTERVAL_MS = 60000; // 60 seconds

// Sample data for simulation
const DRIVERS = [
  "John Martinez", "Sarah Johnson", "Mike Chen", "Lisa Rodriguez",
  "David Thompson", "Emma Wilson", "Carlos Sanchez", "Maya Patel",
  "Robert Kim", "Jessica Brown", "Alex Garcia", "Sophia Lee"
];

const ROUTE_PREFIXES = ["RT-", "LG-", "DL-", "WH-", "TR-"];

const CITIES = [
  'Seattle, WA', 'Tacoma, WA', 'Spokane, WA', 'Portland, OR', 'Boise, ID',
  'Missoula, MT', 'Yakima, WA', 'Eugene, OR', 'Salem, OR', 'Bellingham, WA'
];

interface ShipmentData {
  routeId: string;
  driverName: string;
  expectedETA: string;
  actualETA?: string;
  routeStatus: string;
  origin?: string;
  destination?: string;
  gpsOnline?: boolean;
  lastKnownLat?: number;
  lastKnownLng?: number;
  lastKnownAt?: string;
  speedKph?: number;
  headingDeg?: number;
}

class SimulationManager {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private apiBaseUrl: string;
  private initialized = false;
  private startTime: Date | null = null;
  private currentUserId: string | null = null;

  constructor() {
    this.apiBaseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  }

  /**
   * Initialize simulation state from database on server startup
   * Called automatically when the manager is first accessed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Dynamic import to avoid circular dependencies
      const { default: prisma } = await import("@/lib/prisma");
      
      // Find admin user with continuous simulation enabled
      const adminWithSimActive = await prisma.user.findFirst({
        where: {
          role: "ADMIN",
          continuousSimActive: true,
        },
        select: { id: true, email: true, role: true, agentActive: true },
      });

      if (adminWithSimActive) {
        console.log(`[Simulation] 🔄 Auto-starting continuous simulation for admin: ${adminWithSimActive.email}`);
        
        // Warn if agent is not active
        if (!adminWithSimActive.agentActive) {
          console.warn(`[Simulation] ⚠️  Warning: Admin has continuousSimActive=true but agentActive=false. AI analysis will not run. Enable the AI agent to see threat detection.`);
        }
        
        // Generate internal JWT for server-side auth
        const { createSession } = await import("@/lib/jwt");
        const token = await createSession({
          sub: adminWithSimActive.id,
          email: adminWithSimActive.email || '',
          role: adminWithSimActive.role as 'ADMIN',
        });
        const cookieHeader = `auth=${token}`;
        
        this.start(adminWithSimActive.id, cookieHeader);
      } else {
        console.log(`[Simulation] ℹ️  No active continuous simulation to restore`);
      }

      this.initialized = true;
    } catch (error) {
      console.error("[Simulation] ❌ Failed to initialize:", error instanceof Error ? error.message : error);
      this.initialized = true; // Mark as initialized even on error to prevent infinite retries
    }
  }

  private generateRandomRoute(): string {
    const prefix = ROUTE_PREFIXES[Math.floor(Math.random() * ROUTE_PREFIXES.length)];
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}${number}`;
  }

  private generateRandomDriver(): string {
    return DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
  }

  private generateShipmentData(): ShipmentData {
    const now = new Date();
    
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
      // 3% chance: Critical threat - route manipulation
      const isEarlyAttack = Math.random() < 0.3;
      if (isEarlyAttack) {
        const earlyBy = Math.floor(Math.random() * 60) + 30;
        actualETA = new Date(expectedETA.getTime() - earlyBy * 60 * 1000);
        routeStatus = "suspicious";
      } else {
        const delay = Math.floor(Math.random() * 120) + 120;
        actualETA = new Date(expectedETA.getTime() + delay * 60 * 1000);
        routeStatus = "critical";
      }
    }

    // Generate telemetry
    const origin = CITIES[Math.floor(Math.random() * CITIES.length)];
    let destination = CITIES[Math.floor(Math.random() * CITIES.length)];
    if (destination === origin) {
      destination = CITIES[(CITIES.indexOf(origin) + 3) % CITIES.length];
    }
    const gpsOnline = Math.random() < 0.9;
    const lastKnownLat = 45 + Math.random() * 5;
    const lastKnownLng = -123 + Math.random() * 5;
    const lastKnownAt = new Date(now.getTime() - Math.floor(Math.random() * 60) * 60 * 1000).toISOString();
    const speedKph = Math.max(0, Math.round(80 + (Math.random() - 0.5) * 60));
    const headingDeg = Math.floor(Math.random() * 360);

    return {
      routeId: this.generateRandomRoute(),
      driverName: this.generateRandomDriver(),
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

  private async createShipment(shipmentData: ShipmentData, cookieHeader?: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }

      const response = await axios.post(`${this.apiBaseUrl}/api/shipments`, shipmentData, { headers });
      console.log(`[Simulation] ✓ Created shipment: ${shipmentData.routeId} (${shipmentData.driverName})`);
      return response.data.success;
    } catch (error) {
      console.error(`[Simulation] ✗ Failed to create shipment:`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  private async analyzeWithAI(shipmentData: ShipmentData, userId: string, cookieHeader?: string): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }

      console.log(`[Simulation] 🤖 Calling AI analysis for ${shipmentData.routeId}...`);
      
      const response = await axios.post(`${this.apiBaseUrl}/api/ai`, {
        ...shipmentData,
        userId: userId
      }, { headers });
      
      if (response.data.analyzed) {
        const risk = response.data.riskScore || 0;
        const riskLevel = risk > 70 ? "HIGH" : risk > 40 ? "MEDIUM" : "LOW";
        console.log(`[Simulation] ✓ AI Analysis: ${shipmentData.routeId} - Risk: ${risk}% (${riskLevel})`);
        
        if (response.data.alertType && risk > 20) {
          console.log(`[Simulation] 🚨 Alert Generated: ${response.data.alertType}`);
        }
      } else if (response.data.message) {
        console.log(`[Simulation] ℹ️  ${response.data.message}`);
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.error(`[Simulation] ❍ AI analysis failed:`, {
        status,
        message: error.message,
        data
      });
    }
  }

  private async runSimulation(userId: string, cookieHeader?: string): Promise<void> {
    console.log(`[Simulation] Running simulation cycle at ${new Date().toISOString()}`);
    
    try {
      // Dynamic import to avoid circular dependencies
      const { default: prisma } = await import("@/lib/prisma");
      const { logActivity } = await import("@/lib/agentActivity");
      
      // Check if user exists and get agent status (like simulate-attack does)
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        console.error("[Simulation] User not found:", userId);
        return;
      }

      const shipmentData = this.generateShipmentData();
      
      // Create shipment directly in database (like simulate-attack does)
      const shipment = await prisma.shipment.create({
        data: {
          routeId: shipmentData.routeId,
          driverName: shipmentData.driverName,
          expectedETA: new Date(shipmentData.expectedETA),
          actualETA: shipmentData.actualETA ? new Date(shipmentData.actualETA) : null,
          routeStatus: shipmentData.routeStatus,
          lastUpdated: new Date(),
          origin: shipmentData.origin,
          destination: shipmentData.destination,
          gpsOnline: shipmentData.gpsOnline,
          lastKnownAt: shipmentData.lastKnownAt ? new Date(shipmentData.lastKnownAt) : null,
          lastKnownLat: shipmentData.lastKnownLat,
          lastKnownLng: shipmentData.lastKnownLng,
          speedKph: shipmentData.speedKph,
          headingDeg: shipmentData.headingDeg,
        } as any
      });
      
      console.log(`[Simulation] ✓ Created shipment: ${shipmentData.routeId} (${shipmentData.driverName})`);
      
      // Activity log for creation (BEFORE AI analysis - like simulate-attack does)
      const isHighRisk = shipmentData.routeStatus === 'critical' || shipmentData.routeStatus === 'suspicious';
      logActivity({
        userId,
        type: isHighRisk ? 'suspicious_shipment_created' : 'normal_shipment_created',
        status: 'completed',
        shipmentId: shipmentData.routeId,
        description: isHighRisk 
          ? `Suspicious shipment created (${shipmentData.routeStatus})` 
          : `Normal shipment created (${shipmentData.routeStatus})`,
        metadata: { routeStatus: shipmentData.routeStatus }
      });
      
      // Now trigger the defense agent to analyze this shipment (like simulate-attack does)
      if (user.agentActive) {
        console.log('[Simulation] Agent is active, triggering AI analysis');
        await this.analyzeWithAI(shipmentData, userId, cookieHeader);
      } else {
        console.log('[Simulation] Agent is NOT active, skipping AI analysis');
      }
      
    } catch (error) {
      console.error(`[Simulation] ❍ Simulation cycle failed:`, error instanceof Error ? error.message : error);
    }
  }

  start(userId: string, cookieHeader?: string): boolean {
    if (this.isRunning) {
      console.log("[Simulation] Already running");
      return false;
    }

    console.log(`[Simulation] ▶️  Starting continuous simulation (${SIMULATION_INTERVAL_MS / 1000}s interval)`);
    this.isRunning = true;
    this.startTime = new Date();
    this.currentUserId = userId;

    // Run immediately
    this.runSimulation(userId, cookieHeader).catch(err => {
      console.error("[Simulation] Error in initial run:", err);
    });

    // Start interval
    this.intervalId = setInterval(() => {
      this.runSimulation(userId, cookieHeader).catch(err => {
        console.error("[Simulation] Error in interval run:", err);
      });
    }, SIMULATION_INTERVAL_MS);

    return true;
  }

  async stop(userId?: string): Promise<boolean> {
    if (!this.isRunning) {
      console.log("[Simulation] Not running");
      return false;
    }

    console.log("[Simulation] ⏸️  Stopping continuous simulation");
    this.isRunning = false;
    this.startTime = null;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Update database to prevent auto-restart on server reload
    const userIdToUpdate = userId || this.currentUserId;
    if (userIdToUpdate) {
      try {
        const { default: prisma } = await import("@/lib/prisma");
        await prisma.user.update({
          where: { id: userIdToUpdate },
          data: { continuousSimActive: false },
        });
        console.log(`[Simulation] ✓ Database updated: continuousSimActive=false for user ${userIdToUpdate}`);
      } catch (error) {
        console.error("[Simulation] ❌ Failed to update database:", error instanceof Error ? error.message : error);
      }
    }

    this.currentUserId = null;
    return true;
  }

  getStatus() {
    // Auto-initialize on first status check
    if (!this.initialized) {
      this.initialize().catch(err => {
        console.error("[Simulation] Initialization error:", err);
      });
    }
    
    const uptimeMs = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    
    return {
      isRunning: this.isRunning,
      intervalMs: SIMULATION_INTERVAL_MS,
      startTime: this.startTime,
      uptimeMs,
      uptimeFormatted: this.formatUptime(uptimeMs),
    };
  }

  private formatUptime(ms: number): string {
    if (ms === 0) return "Not running";
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

// Singleton instance
const simulationManager = new SimulationManager();

// Auto-initialize when imported (runs once on server startup)
if (typeof window === 'undefined') {
  simulationManager.initialize().catch(err => {
    console.error("[Simulation] Auto-init failed:", err);
  });
}

export default simulationManager;
