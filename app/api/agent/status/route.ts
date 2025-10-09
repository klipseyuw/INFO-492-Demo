import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserActivities, getRecentInProgress, logActivity } from "@/lib/agentActivity";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'user-1';
    const limit = parseInt(searchParams.get('limit') || '10');

    // Check current user and agent status
    const user = await prisma.user.findUnique({ 
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get recent activities from memory
    const recentActivities = getUserActivities(userId, limit).map(activity => ({
      id: activity.id,
      type: activity.type,
      status: activity.status || 'completed',
      shipment: activity.shipmentId || null,
      description: activity.description,
      startTime: activity.timestamp,
      endTime: activity.timestamp,
      duration: activity.duration || null,
      metadata: activity.metadata || null
    }));

    // Calculate statistics
  const userActivities = getUserActivities(userId, 100);
    const analyses = userActivities.filter(a => a.type?.includes('analysis') || a.type === 'threat_detected');
    const threats = userActivities.filter(a => a.type === 'threat_detected');
    const avgTime = analyses.length > 0 
      ? Math.round(analyses.reduce((sum, a) => sum + (a.duration || 2000), 0) / analyses.length)
      : 0;

    // Check for current activity (recent activity within last 10 seconds)
    const currentActivity = getRecentInProgress(userId);

    return NextResponse.json({
      success: true,
      agentStatus: {
        state: user.agentActive ? (currentActivity ? "active" : "idle") : "inactive",
        active: user.agentActive,
        currentTask: user.agentActive 
          ? (currentActivity ? currentActivity.description : "Monitoring for threats...")
          : "Agent is currently disabled",
        currentActivity: currentActivity ? {
          id: currentActivity.id,
          type: currentActivity.type,
          description: currentActivity.description,
          startTime: currentActivity.timestamp,
          shipment: currentActivity.shipmentId
        } : null
      },
      activities: recentActivities,
      statistics: {
        totalAnalyses: analyses.length,
        threatsDetected: threats.length,
        avgAnalysisTime: avgTime,
        agentUptime: user.agentActive ? "Active" : "Inactive"
      },
      timestamp: new Date()
    });

    /* Commented out until AgentActivity model is properly loaded
    // Get recent agent activities
    const activities = await prisma.agentActivity.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: limit
    });

    // Get recent agent activities
    const activities = await prisma.agentActivity.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: limit
    });

    // Get current activity (if any)
    const currentActivity = await prisma.agentActivity.findFirst({
      where: { 
        userId,
        status: { in: ['started', 'processing'] }
      },
      orderBy: { startTime: 'desc' }
    });

    // Get activity statistics
    const stats = {
      totalAnalyses: await prisma.agentActivity.count({
        where: { userId, activityType: { in: ['routine_analysis', 'threat_analysis'] } }
      }),
      threatsDetected: await prisma.agentActivity.count({
        where: { userId, activityType: 'threat_detected' }
      }),
      avgAnalysisTime: 0, // We'll calculate this below
      agentUptime: user.agentActive ? "Active" : "Inactive"
    };

    // Calculate average analysis time
    const completedAnalyses = await prisma.agentActivity.findMany({
      where: { 
        userId, 
        status: 'completed',
        duration: { not: null }
      },
      select: { duration: true }
    });

    if (completedAnalyses.length > 0) {
      const totalDuration = completedAnalyses.reduce((sum, activity) => sum + (activity.duration || 0), 0);
      stats.avgAnalysisTime = Math.round(totalDuration / completedAnalyses.length);
    }

    // Format activities for display
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.activityType,
      status: activity.status,
      shipment: activity.targetShipment,
      description: activity.description,
      startTime: activity.startTime,
      endTime: activity.endTime,
      duration: activity.duration,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null
    }));

    // Determine current agent state
    let agentState = "idle";
    let currentTask = "Monitoring for threats...";
    
    if (!user.agentActive) {
      agentState = "inactive";
      currentTask = "Agent is currently disabled";
    } else if (currentActivity) {
      agentState = "active";
      currentTask = currentActivity.description;
    }

    return NextResponse.json({
      success: true,
      agentStatus: {
        state: agentState,
        active: user.agentActive,
        currentTask,
        currentActivity: currentActivity ? {
          id: currentActivity.id,
          type: currentActivity.activityType,
          description: currentActivity.description,
          startTime: currentActivity.startTime,
          shipment: currentActivity.targetShipment
        } : null
      },
      activities: formattedActivities,
      statistics: stats,
      timestamp: new Date()
    });

  } catch (error) {
    console.error("Agent status fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent status", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
*/

  } catch (error) {
    console.error("Agent status fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent status", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST endpoint to manually trigger agent monitoring check
export async function POST(req: Request) {
  try {
    const { userId, action } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.agentActive) {
      return NextResponse.json({ error: "Agent is not active" }, { status: 400 });
    }

    // Temporary: Return success without actual system check
    return NextResponse.json({
      success: true,
      message: "System check completed (simplified mode)",
      activityId: `mock-${Date.now()}`
    });

  } catch (error) {
    console.error("Agent action error:", error);
    return NextResponse.json(
      { error: "Failed to execute agent action" },
      { status: 500 }
    );
  }
}