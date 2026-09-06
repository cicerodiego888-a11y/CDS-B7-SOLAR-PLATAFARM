-- AlterTable
ALTER TABLE "MonitoringReading" ADD COLUMN "sourceProvider" TEXT;
ALTER TABLE "MonitoringReading" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringReading_idempotencyKey_key" ON "MonitoringReading"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MonitoringReading_inverterId_sourceProvider_collectedAt_idx" ON "MonitoringReading"("inverterId", "sourceProvider", "collectedAt");
