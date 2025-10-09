import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, activate } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Update or create user with agent status
    const updated = await prisma.user.upsert({
      where: { id: userId },
      update: { agentActive: activate },
      create: {
        id: userId,
        email: `user-${userId}@logistics-defense.com`,
        name: `User ${userId}`,
        agentActive: activate,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        agentActive: updated.agentActive,
        name: updated.name,
      }
    });

  } catch (error) {
    console.error("Agent Toggle Error:", error);
    return NextResponse.json(
      { error: "Failed to toggle agent status", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        agentActive: true,
        name: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error("Get Agent Status Error:", error);
    return NextResponse.json(
      { error: "Failed to get agent status", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}