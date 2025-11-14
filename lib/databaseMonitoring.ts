// lib/databaseMonitoring.ts
import { prisma } from "./prisma";

type Role = "ANALYST" | "OPERATOR" | "ADMIN";

// Map US regions roughly based on time zones or geographic areas
const REGION_MAP: Record<string, string> = {
  // Pacific
  CA: "PNW", WA: "PNW", OR: "PNW", NV: "PNW", AK: "PNW", HI: "PNW",
  // Southwest
  AZ: "SW", NM: "SW", TX: "SW", OK: "SW",
  // Midwest
  IL: "MW", IN: "MW", MI: "MW", OH: "MW", WI: "MW", MN: "MW", 
  IA: "MW", MO: "MW", ND: "MW", SD: "MW", NE: "MW", KS: "MW",
  // Northeast
  NY: "NE", PA: "NE", MA: "NE", CT: "NE", RI: "NE", NH: "NE", 
  VT: "NE", ME: "NE", NJ: "NE", DE: "NE", MD: "NE",
  // Southeast
  FL: "SE", GA: "SE", NC: "SE", SC: "SE", VA: "SE", WV: "SE",
  AL: "SE", MS: "SE", TN: "SE", KY: "SE", LA: "SE", AR: "SE",
};

function getRegionFromLocation(location: string): string {
  // Extract state code from "City, ST" format
  const match = location.match(/,\s*([A-Z]{2})\b/);
  if (match) {
    const stateCode = match[1];
    return REGION_MAP[stateCode] || "MW"; // Default to Midwest if unknown
  }
  return "MW"; // Default region
}

export async function trackLoginAttempt({
  email,
  role,
  success,
  ip,
  location,
  userAgent,
}: {
  email: string;
  role: Role;
  success: boolean;
  ip: string;
  location: string;
  userAgent?: string;
}) {
  try {
    const region = getRegionFromLocation(location);

    // Find or create DatabaseUser
    let dbUser = await prisma.databaseUser.findUnique({
      where: { email },
    });

    if (!dbUser) {
      dbUser = await prisma.databaseUser.create({
        data: {
          name: email.split("@")[0],
          email,
          role,
          region,
        },
      });
    }

    // Update last login info on success
    if (success) {
      await prisma.databaseUser.update({
        where: { id: dbUser.id },
        data: {
          lastLoginIP: ip,
          lastLoginLocation: location,
          lastLoginAt: new Date(),
        },
      });
    }

    // Create login attempt record
    await prisma.loginAttempt.create({
      data: {
        userId: dbUser.id,
        success,
        ip,
        location,
        userAgent: userAgent || "Unknown",
      },
    });

    // Check for anomalies only on successful logins
    if (success) {
      await checkLoginAnomalies(dbUser.id, ip, location);
    }

    return { success: true, dbUserId: dbUser.id };
  } catch (error) {
    console.error("[DATABASE-MONITORING] Error tracking login:", error);
    // Don't fail the login if monitoring fails
    return { success: false, error };
  }
}

async function checkLoginAnomalies(userId: string, ip: string, location: string) {
  try {
    const user = await prisma.databaseUser.findUnique({
      where: { id: userId },
      include: {
        loginAttempts: {
          where: { success: true },
          orderBy: { timestamp: "desc" },
          take: 10,
        },
      },
    });

    if (!user) return;

    // Check for new geographic location
    const recentLocations = user.loginAttempts.map((a) => a.location);
    const isNewLocation = !recentLocations.slice(1).includes(location);

    if (isNewLocation && recentLocations.length > 1) {
      await prisma.databaseAnomaly.create({
        data: {
          userId,
          type: "NEW_GEO_LOGIN",
          severity: "MEDIUM",
          description: `Login from new location: ${location} (previous: ${recentLocations[1] || "unknown"})`,
          metadata: JSON.stringify({ ip, location, previousLocations: recentLocations.slice(1, 4) }),
        },
      });
    }

    // Check for brute force attempts (multiple failed attempts recently)
    const recentAttempts = await prisma.loginAttempt.findMany({
      where: {
        userId,
        timestamp: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
        },
      },
      orderBy: { timestamp: "desc" },
    });

    const failedCount = recentAttempts.filter((a) => !a.success).length;
    if (failedCount >= 3) {
      await prisma.databaseAnomaly.create({
        data: {
          userId,
          type: "LOGIN_BRUTE_FORCE",
          severity: "HIGH",
          description: `${failedCount} failed login attempts in last 10 minutes before successful login`,
          metadata: JSON.stringify({ failedCount, ip, location }),
        },
      });
    }
  } catch (error) {
    console.error("[DATABASE-MONITORING] Error checking anomalies:", error);
  }
}

export async function trackDatabaseAccess({
  email,
  action,
  tableName,
  estSizeMB,
  ip,
  location,
}: {
  email: string;
  action: string;
  tableName: string;
  estSizeMB?: number;
  ip: string;
  location: string;
}) {
  try {
    const dbUser = await prisma.databaseUser.findUnique({
      where: { email },
    });

    if (!dbUser) {
      console.warn(`[DATABASE-MONITORING] User ${email} not found for access tracking`);
      return { success: false };
    }

    await prisma.databaseAccessEvent.create({
      data: {
        userId: dbUser.id,
        action,
        tableName,
        estSizeMB,
        ip,
        location,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[DATABASE-MONITORING] Error tracking access:", error);
    return { success: false, error };
  }
}
