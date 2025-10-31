-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN "destination" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "gpsOnline" BOOLEAN;
ALTER TABLE "Shipment" ADD COLUMN "headingDeg" INTEGER;
ALTER TABLE "Shipment" ADD COLUMN "lastKnownAt" DATETIME;
ALTER TABLE "Shipment" ADD COLUMN "lastKnownLat" REAL;
ALTER TABLE "Shipment" ADD COLUMN "lastKnownLng" REAL;
ALTER TABLE "Shipment" ADD COLUMN "origin" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "speedKph" INTEGER;

-- CreateTable
CREATE TABLE "AgentActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "targetShipment" TEXT,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
