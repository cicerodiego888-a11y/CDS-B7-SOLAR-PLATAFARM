-- CreateEnum
CREATE TYPE "IntegrationBindingStatus" AS ENUM ('NOT_CONFIGURED', 'READY', 'CONNECTED', 'AUTH_ERROR', 'COMMUNICATION_ERROR');

-- CreateTable
CREATE TABLE "IntegrationBinding" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "manufacturerId" TEXT,
    "inverterId" TEXT NOT NULL,
    "externalId" TEXT,
    "status" "IntegrationBindingStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "secretRef" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationBinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationBinding_inverterId_provider_key" ON "IntegrationBinding"("inverterId", "provider");

-- CreateIndex
CREATE INDEX "IntegrationBinding_provider_idx" ON "IntegrationBinding"("provider");

-- CreateIndex
CREATE INDEX "IntegrationBinding_externalId_idx" ON "IntegrationBinding"("externalId");

-- AddForeignKey
ALTER TABLE "IntegrationBinding" ADD CONSTRAINT "IntegrationBinding_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "InverterManufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationBinding" ADD CONSTRAINT "IntegrationBinding_inverterId_fkey" FOREIGN KEY ("inverterId") REFERENCES "Inverter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
