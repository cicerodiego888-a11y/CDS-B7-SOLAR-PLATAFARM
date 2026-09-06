-- CreateEnum
CREATE TYPE "AlertResolutionType" AS ENUM ('MANUAL', 'AUTOMATIC');

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN "inverterId" TEXT;
ALTER TABLE "Alert" ADD COLUMN "ruleCode" TEXT;
ALTER TABLE "Alert" ADD COLUMN "fingerprint" TEXT;
ALTER TABLE "Alert" ADD COLUMN "acknowledgedAt" TIMESTAMP(3);
ALTER TABLE "Alert" ADD COLUMN "acknowledgedBy" TEXT;
ALTER TABLE "Alert" ADD COLUMN "resolvedBy" TEXT;
ALTER TABLE "Alert" ADD COLUMN "resolutionType" "AlertResolutionType";
ALTER TABLE "Alert" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Alert" SET "ruleCode" = COALESCE("ruleCode", "type");
UPDATE "Alert" SET "fingerprint" = COALESCE("fingerprint", "type" || ':' || "id");

ALTER TABLE "Alert" ALTER COLUMN "ruleCode" SET NOT NULL;
ALTER TABLE "Alert" ALTER COLUMN "fingerprint" SET NOT NULL;

-- CreateTable
CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alert_inverterId_status_idx" ON "Alert"("inverterId", "status");

-- CreateIndex
CREATE INDEX "Alert_fingerprint_status_idx" ON "Alert"("fingerprint", "status");

-- CreateIndex
CREATE INDEX "Alert_ruleCode_status_idx" ON "Alert"("ruleCode", "status");

-- CreateIndex
CREATE INDEX "AlertEvent_alertId_createdAt_idx" ON "AlertEvent"("alertId", "createdAt");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_inverterId_fkey" FOREIGN KEY ("inverterId") REFERENCES "Inverter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
