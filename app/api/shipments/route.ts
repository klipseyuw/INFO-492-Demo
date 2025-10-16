import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const shipments = await prisma.shipment.findMany({
      orderBy: { lastUpdated: 'desc' },
      take: 50, // Limit to 50 most recent shipments
      select: ({
        id: true,
        routeId: true,
        driverName: true,
        expectedETA: true,
        actualETA: true,
        routeStatus: true,
        origin: true,
        destination: true,
        gpsOnline: true,
        lastKnownAt: true,
        lastKnownLat: true,
        lastKnownLng: true,
        speedKph: true,
        headingDeg: true,
        // Cargo fields
        cargoName: true,
        cargoQuantity: true,
        cargoUnitCost: true,
        cargoTotalValue: true,
        predictedDelay: true,
        lastUpdated: true,
        createdAt: true,
      } as any),
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
    const {
      routeId,
      driverName,
      expectedETA,
      actualETA,
      routeStatus,
      // Optional telemetry fields
      origin,
      destination,
      gpsOnline,
      lastKnownAt,
      lastKnownLat,
      lastKnownLng,
      speedKph,
      headingDeg,
      // Cargo fields
      cargoName,
      cargoQuantity,
      cargoUnitCost,
      cargoTotalValue
    } = await req.json();

    if (!routeId || !driverName || !expectedETA) {
      return NextResponse.json(
        { error: "Missing required fields: routeId, driverName, expectedETA" },
        { status: 400 }
      );
    }

    // Cast to any to avoid transient Prisma type mismatch until prisma generate refreshes types
    const shipment = await prisma.shipment.create({
      data: ({
        routeId,
        driverName,
        expectedETA: new Date(expectedETA),
        actualETA: actualETA ? new Date(actualETA) : null,
        routeStatus: routeStatus || "in-progress",
        origin: origin || null,
        destination: destination || null,
        gpsOnline: typeof gpsOnline === 'boolean' ? gpsOnline : null,
        lastKnownAt: lastKnownAt ? new Date(lastKnownAt) : null,
        lastKnownLat: typeof lastKnownLat === 'number' ? lastKnownLat : null,
        lastKnownLng: typeof lastKnownLng === 'number' ? lastKnownLng : null,
        speedKph: typeof speedKph === 'number' ? Math.round(speedKph) : null,
        headingDeg: typeof headingDeg === 'number' ? Math.round(headingDeg) : null,
        // Cargo normalization
        cargoName: cargoName ? String(cargoName) : null,
        cargoQuantity: typeof cargoQuantity === 'number' ? Math.round(cargoQuantity) : null,
        cargoUnitCost: typeof cargoUnitCost === 'number' ? Number(cargoUnitCost) : (cargoUnitCost != null ? Number(cargoUnitCost) : null),
        cargoTotalValue: typeof cargoTotalValue === 'number'
          ? Number(cargoTotalValue)
          : (typeof cargoQuantity === 'number' && (typeof cargoUnitCost === 'number' || cargoUnitCost != null)
              ? Number(cargoQuantity) * Number(cargoUnitCost)
              : null),
      } as any),
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