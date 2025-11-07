-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ANALYST', 'OPERATOR', 'ADMIN');

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "expectedETA" TIMESTAMP(3) NOT NULL,
    "actualETA" TIMESTAMP(3),
    "routeStatus" TEXT NOT NULL DEFAULT 'in-progress',
    "origin" TEXT,
    "destination" TEXT,
    "gpsOnline" BOOLEAN,
    "lastKnownAt" TIMESTAMP(3),
    "lastKnownLat" DOUBLE PRECISION,
    "lastKnownLng" DOUBLE PRECISION,
    "speedKph" INTEGER,
    "headingDeg" INTEGER,
    "cargoName" TEXT,
    "cargoQuantity" INTEGER,
    "cargoUnitCost" DOUBLE PRECISION,
    "cargoTotalValue" DOUBLE PRECISION,
    "predictedDelay" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertFeedback" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "riskScoreAccurate" BOOLEAN NOT NULL,
    "attackTypeCorrect" BOOLEAN NOT NULL,
    "actualAttackType" TEXT,
    "actualRiskScore" INTEGER,
    "notes" TEXT,
    "valuePreference" TEXT,
    "aiRiskScore" INTEGER NOT NULL,
    "aiAttackType" TEXT NOT NULL,
    "shipmentContext" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shipmentContext" TEXT NOT NULL,
    "analyzed" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisFeedback" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "riskScoreAccurate" BOOLEAN NOT NULL,
    "attackTypeCorrect" BOOLEAN NOT NULL,
    "actualAttackType" TEXT,
    "actualRiskScore" INTEGER,
    "notes" TEXT,
    "valuePreference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "agentActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "Role" NOT NULL DEFAULT 'ANALYST',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "targetShipment" TEXT,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionalRiskProfile" (
    "id" TEXT NOT NULL,
    "regionKey" TEXT NOT NULL,
    "totalAnalyses" INTEGER NOT NULL DEFAULT 0,
    "highCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "lowCount" INTEGER NOT NULL DEFAULT 0,
    "avgRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastRiskScore" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegionalRiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlertFeedback_alertId_key" ON "AlertFeedback"("alertId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisFeedback_analysisId_key" ON "AnalysisFeedback"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "RegionalRiskProfile_regionKey_key" ON "RegionalRiskProfile"("regionKey");

-- AddForeignKey
ALTER TABLE "AlertFeedback" ADD CONSTRAINT "AlertFeedback_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisFeedback" ADD CONSTRAINT "AnalysisFeedback_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
