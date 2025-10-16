-- AlterTable
ALTER TABLE "AlertFeedback" ADD COLUMN "valuePreference" TEXT;

-- AlterTable
ALTER TABLE "AnalysisFeedback" ADD COLUMN "valuePreference" TEXT;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN "cargoName" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "cargoQuantity" INTEGER;
ALTER TABLE "Shipment" ADD COLUMN "cargoTotalValue" REAL;
ALTER TABLE "Shipment" ADD COLUMN "cargoUnitCost" REAL;
