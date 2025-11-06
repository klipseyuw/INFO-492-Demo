-- CreateTable
CREATE TABLE "RegionalRiskProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "regionKey" TEXT NOT NULL,
    "totalAnalyses" INTEGER NOT NULL DEFAULT 0,
    "highCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "lowCount" INTEGER NOT NULL DEFAULT 0,
    "avgRisk" REAL NOT NULL DEFAULT 0,
    "lastRiskScore" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "RegionalRiskProfile_regionKey_key" ON "RegionalRiskProfile"("regionKey");
