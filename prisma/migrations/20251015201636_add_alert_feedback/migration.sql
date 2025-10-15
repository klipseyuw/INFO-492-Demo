-- CreateTable
CREATE TABLE "AlertFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertId" TEXT NOT NULL,
    "riskScoreAccurate" BOOLEAN NOT NULL,
    "attackTypeCorrect" BOOLEAN NOT NULL,
    "actualAttackType" TEXT,
    "actualRiskScore" INTEGER,
    "notes" TEXT,
    "aiRiskScore" INTEGER NOT NULL,
    "aiAttackType" TEXT NOT NULL,
    "shipmentContext" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertFeedback_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AlertFeedback_alertId_key" ON "AlertFeedback"("alertId");
