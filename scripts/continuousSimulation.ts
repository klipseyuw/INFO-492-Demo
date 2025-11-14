import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { spawn } from "child_process";
import path from "path";

// Load environment variables
config();

const CHECK_INTERVAL_MS = 10000; // Check DB toggle every 10 seconds
const SIMULATION_INTERVAL_MS = 20000; // Run simulation every 20 seconds when active

const prisma = new PrismaClient();

/**
 * Runs a single simulation by spawning the simulateRoutes.ts script
 */
async function runSimulation(userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'simulateRoutes.ts');
    const child = spawn('npx', ['tsx', scriptPath, 'single'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, SIM_USER_ID: userId }
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Simulation exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkSimulationToggle(): Promise<{ id: string; email?: string | null } | null> {
  try {
    const adminWithSimActive = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
        agentActive: true, // Check agentActive instead of continuousSimActive
      },
      select: { id: true, name: true, email: true },
    });
    
    return adminWithSimActive;
  } catch (error) {
    console.error("❌ Failed to check simulation toggle:", error instanceof Error ? error.message : error);
    return null;
  }
}

async function runContinuousSimulation(): Promise<void> {
  console.log("🚛 Logistics Defense AI - Continuous Simulation Service");
  console.log(`🔄 Check interval: ${CHECK_INTERVAL_MS / 1000}s | Simulation interval: ${SIMULATION_INTERVAL_MS / 1000}s`);
  console.log("⏸️  Waiting for admin to enable continuous simulation...\n");
  
  let isRunning = false;
  let simulationInterval: NodeJS.Timeout | null = null;
  let currentUserId: string | null = null;

  // Check toggle state periodically
  setInterval(async () => {
    const adminUser = await checkSimulationToggle();
    
    if (adminUser && !isRunning) {
      console.log(`▶️  Continuous simulation ENABLED by admin (${adminUser.email})`);
      isRunning = true;
      currentUserId = adminUser.id;
      
      // Run initial simulation immediately
      await runSimulation(currentUserId);
      
      // Start interval simulation
      simulationInterval = setInterval(async () => {
        if (currentUserId) {
          await runSimulation(currentUserId);
        }
      }, SIMULATION_INTERVAL_MS);
      
    } else if (!adminUser && isRunning) {
      console.log("⏸️  Continuous simulation DISABLED by admin");
      isRunning = false;
      currentUserId = null;
      
      // Stop interval simulation
      if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
      }
    }
  }, CHECK_INTERVAL_MS);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Simulation service stopped by user');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Simulation service terminated');
  await prisma.$disconnect();
  process.exit(0);
});

// Run the simulation service
runContinuousSimulation().catch(async (error) => {
  console.error("❌ Simulation service error:", error);
  await prisma.$disconnect();
  process.exit(1);
});
