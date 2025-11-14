import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import simulationManager from "@/lib/simulationManager";

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    const guard = requireRole(session, ["ADMIN", "ANALYST"]);
    if (!guard.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if any admin has continuous simulation enabled in DB
    const adminWithSimActive = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
        continuousSimActive: true,
      },
      select: { id: true, name: true, email: true },
    });

    // Get actual runtime status from simulation manager
    const status = simulationManager.getStatus();

    return NextResponse.json({
      success: true,
      continuousSimActive: !!adminWithSimActive,
      isRunning: status.isRunning,
      activatedBy: adminWithSimActive || null,
    });
  } catch (error) {
    console.error("Simulation status error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
