import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const shipments = await prisma.shipment.findMany({
      orderBy: { lastUpdated: 'desc' },
      take: 50, // Limit to 50 most recent shipments
    });

    return NextResponse.json({
      success: true,
      shipments
    });

  } catch (error) {
    console.error("Get Shipments Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipments", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { routeId, driverName, expectedETA, actualETA, routeStatus } = await req.json();

    if (!routeId || !driverName || !expectedETA) {
      return NextResponse.json(
        { error: "Missing required fields: routeId, driverName, expectedETA" },
        { status: 400 }
      );
    }

    const shipment = await prisma.shipment.create({
      data: {
        routeId,
        driverName,
        expectedETA: new Date(expectedETA),
        actualETA: actualETA ? new Date(actualETA) : null,
        routeStatus: routeStatus || "in-progress",
      },
    });

    return NextResponse.json({
      success: true,
      shipment
    });

  } catch (error) {
    console.error("Create Shipment Error:", error);
    return NextResponse.json(
      { error: "Failed to create shipment", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}