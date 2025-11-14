/**
 * Initialize continuous simulation on server startup
 * Checks if any admin user has continuousSimActive enabled and starts simulation
 */

import prisma from "@/lib/prisma";
import simulationManager from "@/lib/simulationManager";

let initialized = false;

export async function initializeSimulation(): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    // Find admin user with continuous simulation enabled
    const adminWithSimActive = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
        continuousSimActive: true,
      },
      select: { id: true, email: true },
    });

    if (adminWithSimActive) {
      console.log(`[Simulation] 🔄 Restoring continuous simulation for admin: ${adminWithSimActive.email}`);
      simulationManager.start(adminWithSimActive.id);
    } else {
      console.log(`[Simulation] ⏸️  No active continuous simulation to restore`);
    }

    initialized = true;
  } catch (error) {
    console.error("[Simulation] ❌ Failed to initialize simulation:", error instanceof Error ? error.message : error);
  }
}
