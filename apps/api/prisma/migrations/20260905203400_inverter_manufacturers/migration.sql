-- CreateEnum
CREATE TYPE "ManufacturerIntegrationStatus" AS ENUM ('PLANNED', 'READY', 'ACTIVE');

-- CreateEnum
CREATE TYPE "InverterOperationalStatus" AS ENUM ('ONLINE', 'OFFLINE', 'WARNING', 'ERROR', 'UNKNOWN');

-- CreateTable
CREATE TABLE "InverterManufacturer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "integrationStatus" "ManufacturerIntegrationStatus" NOT NULL DEFAULT 'PLANNED',
    "capabilities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InverterManufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InverterManufacturer_code_key" ON "InverterManufacturer"("code");
