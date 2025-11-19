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

// Simulation scenarios matching simulate-attack patterns
const SIMULATION_SCENARIOS = [
  // ATTACK SCENARIOS (50% probability)
  {
    type: "Route Manipulation",
    delayMinutes: () => Math.floor(Math.random() * 60) + 30, // 30-90 minutes
    routeStatus: "critical",
    gpsAnomalies: true,
    isAttack: true
  },
  {
    type: "ETA Manipulation", 
    delayMinutes: () => Math.floor(Math.random() * 120) + 60, // 60-180 minutes
    routeStatus: "critical",
    gpsAnomalies: false,
    isAttack: true
  },
  {
    type: "Cargo Tampering",
    delayMinutes: () => Math.floor(Math.random() * 45) + 15, // 15-60 minutes
    routeStatus: "suspicious",
    gpsAnomalies: false,
    isAttack: true
  },
  {
    type: "Cyber Attack",
    delayMinutes: () => Math.floor(Math.random() * 30) + 5, // 5-35 minutes
    routeStatus: "critical",
    gpsAnomalies: true,
    isAttack: true
  },
  {
    type: "Driver Impersonation",
    delayMinutes: () => Math.floor(Math.random() * 90) + 20, // 20-110 minutes
    routeStatus: "suspicious",
    gpsAnomalies: false,
    isAttack: true
  },
  // NORMAL OPERATIONS (50% probability)
  {
    type: "Normal Operation",
    delayMinutes: () => Math.floor(Math.random() * 10) - 5, // -5 to +5 minutes
    routeStatus: "in-progress",
    gpsAnomalies: false,
    isAttack: false
  },
  {
    type: "Traffic Delay",
    delayMinutes: () => Math.floor(Math.random() * 20) + 5, // 5-25 minutes
    routeStatus: "delayed",
    gpsAnomalies: false,
    isAttack: false
  },
  {
    type: "Weather Delay",
    delayMinutes: () => Math.floor(Math.random() * 15) + 10, // 10-25 minutes
    routeStatus: "delayed",
    gpsAnomalies: false,
    isAttack: false
  },
  {
    type: "Fuel Stop",
    delayMinutes: () => Math.floor(Math.random() * 15) + 5, // 5-20 minutes
    routeStatus: "in-progress",
    gpsAnomalies: false,
    isAttack: false
  }
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
    // Detect the appropriate base URL for API calls
    // Priority: NEXTAUTH_URL > RENDER_EXTERNAL_URL > VERCEL_URL > localhost
    let baseUrl = process.env.NEXTAUTH_URL || process.env.RENDER_EXTERNAL_URL || process.env.VERCEL_URL;
    
    if (baseUrl) {
      // Ensure it has a protocol
      this.apiBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    } else if (process.env.NODE_ENV === 'production') {
      // In production without explicit URL, try to construct from RENDER_SERVICE_NAME
      const serviceName = process.env.RENDER_SERVICE_NAME;
      if (serviceName) {
        this.apiBaseUrl = `https://${serviceName}.onrender.com`;
      } else {
        console.error('[Simulation] ⚠️  WARNING: Running in production but no base URL configured!');
        this.apiBaseUrl = "http://localhost:3000";
      }
    } else {
      // Development environment
      this.apiBaseUrl = "http://localhost:3000";
    }
    console.log(`[Simulation] Initialized with API base URL: ${this.apiBaseUrl}`);
  }

  /**
   * Initialize simulation state from database on server startup
   * Called automatically when the manager is first accessed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log(`[Simulation] Initializing... Environment check:`);
    console.log(`[Simulation] - NEXTAUTH_URL: ${process.env.NEXTAUTH_URL ? 'SET' : 'NOT SET'}`);
    console.log(`[Simulation] - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`[Simulation] - API Base URL: ${this.apiBaseUrl}`);
    
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
    
    // Expected ETA: 1-3 hours from now
    const expectedMinutes = Math.floor(Math.random() * 120) + 60;
    const expectedETA = new Date(now.getTime() + expectedMinutes * 60 * 1000);
    
    // Select random scenario (50% attack, 50% normal)
    const scenario = SIMULATION_SCENARIOS[Math.floor(Math.random() * SIMULATION_SCENARIOS.length)];
    const delayMinutes = scenario.delayMinutes();
    const actualETA = new Date(expectedETA.getTime() + delayMinutes * 60 * 1000);
    const routeStatus = scenario.routeStatus;

    // Generate telemetry based on scenario
    const origin = CITIES[Math.floor(Math.random() * CITIES.length)];
    let destination = CITIES[Math.floor(Math.random() * CITIES.length)];
    if (destination === origin) {
      destination = CITIES[(CITIES.indexOf(origin) + 3) % CITIES.length];
    }
    
    let gpsOnline = true;
    let lastKnownLat = 45 + Math.random() * 5;
    let lastKnownLng = -123 + Math.random() * 5;
    let lastKnownAt = new Date(now.getTime() - Math.floor(Math.random() * 10) * 60 * 1000).toISOString();
    let speedKph = Math.max(0, Math.round(80 + (Math.random() - 0.5) * 40));
    let headingDeg = Math.floor(Math.random() * 360);

    // Apply GPS anomalies for certain attack types
    if (scenario.gpsAnomalies) {
      if (scenario.type === "Cyber Attack") {
        gpsOnline = false;
        lastKnownAt = new Date(now.getTime() - 40 * 60 * 1000).toISOString();
        speedKph = 0;
      } else if (scenario.type === "Route Manipulation") {
        // GPS spoofing - suspicious coordinates or speed
        speedKph = Math.round(Math.random() * 20); // Very slow or stopped
        lastKnownAt = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
      }
    } else if (scenario.type === "Cargo Tampering") {
      // Stopped at unexpected location
      speedKph = 0;
      lastKnownAt = new Date(now.getTime() - 45 * 60 * 1000).toISOString();
    } else if (scenario.type === "Fuel Stop") {
      // Normal stop
      speedKph = 0;
      lastKnownAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    }

    return {
      routeId: this.generateRandomRoute(),
      driverName: this.generateRandomDriver(),
      expectedETA: expectedETA.toISOString(),
      actualETA: actualETA.toISOString(),
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
        'Referer': this.apiBaseUrl, // Add Referer header like simulate-attack does
      };
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }

      const apiUrl = `${this.apiBaseUrl}/api/ai`;
      console.log(`[Simulation] 🤖 Calling AI analysis for ${shipmentData.routeId}...`);
      console.log(`[Simulation] API URL: ${apiUrl}`);
      console.log(`[Simulation] Has cookie: ${!!cookieHeader}`);
      
      const response = await axios.post(apiUrl, {
        ...shipmentData,
        userId: userId
      }, { 
        headers,
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        maxRedirects: 0 // Don't follow redirects
      });
      
      if (response.status >= 400) {
        console.error(`[Simulation] ❌ AI API returned error status ${response.status}:`, response.data);
        return;
      }
      
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
      const config = error?.config;
      console.error(`[Simulation] ❌ AI analysis failed for ${shipmentData.routeId}:`, {
        status,
        message: error.message,
        data,
        url: config?.url,
        hasAuth: !!config?.headers?.Cookie,
        errorCode: error.code,
        errorStack: error.stack?.split('\n')[0]
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
