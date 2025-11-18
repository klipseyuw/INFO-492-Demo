import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import simulationManager from "@/lib/simulationManager";

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    const guard = requireRole(session, ["ADMIN"]);
    if (!guard.ok) {
      return NextResponse.json({ error: "Forbidden. Admin only." }, { status: 403 });
    }

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { active } = await req.json();

    if (typeof active !== "boolean") {
      return NextResponse.json({ error: "Invalid request. 'active' must be boolean." }, { status: 400 });
    }

    // Update the admin user's continuousSimActive flag
    await prisma.user.update({
      where: { id: session.sub },
      data: { continuousSimActive: active },
    });

    // Control the actual simulation manager
    const cookieHeader = req.headers.get('cookie') || undefined;
    if (active) {
      simulationManager.start(session.sub, cookieHeader);
    } else {
      await simulationManager.stop(session.sub);
    }

    console.log(`[Simulation] Continuous simulation ${active ? 'ENABLED' : 'DISABLED'} by admin ${session.sub}`);

    return NextResponse.json({
      success: true,
      continuousSimActive: active,
      message: `Continuous simulation ${active ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    console.error("Simulation toggle error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
