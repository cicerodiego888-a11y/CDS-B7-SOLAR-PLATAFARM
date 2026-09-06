-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('INVERSOR', 'DATALOGGER', 'GATEWAY', 'MEDIDOR', 'COMUNICACAO', 'OUTRO');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Inverter" ADD COLUMN "manufacturerId" TEXT;
ALTER TABLE "Inverter" ADD COLUMN "ratedPowerKw" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "plantId" TEXT NOT NULL,
    "inverterId" TEXT,
    "type" "EquipmentType" NOT NULL,
    "manufacturerName" TEXT,
    "model" TEXT,
    "serialNumber" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Plant_customerId_idx" ON "Plant"("customerId");

-- CreateIndex
CREATE INDEX "Plant_status_idx" ON "Plant"("status");

-- CreateIndex
CREATE INDEX "Inverter_plantId_idx" ON "Inverter"("plantId");

-- CreateIndex
CREATE INDEX "Inverter_manufacturerId_idx" ON "Inverter"("manufacturerId");

-- CreateIndex
CREATE INDEX "Inverter_serialNumber_idx" ON "Inverter"("serialNumber");

-- CreateIndex
CREATE INDEX "Inverter_status_idx" ON "Inverter"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Inverter_plantId_serialNumber_key" ON "Inverter"("plantId", "serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_plantId_serialNumber_key" ON "Equipment"("plantId", "serialNumber");

-- CreateIndex
CREATE INDEX "Equipment_plantId_idx" ON "Equipment"("plantId");

-- CreateIndex
CREATE INDEX "Equipment_type_idx" ON "Equipment"("type");

-- CreateIndex
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");

-- CreateIndex
CREATE INDEX "Equipment_inverterId_idx" ON "Equipment"("inverterId");

-- AddForeignKey
ALTER TABLE "Inverter" ADD CONSTRAINT "Inverter_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "InverterManufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_inverterId_fkey" FOREIGN KEY ("inverterId") REFERENCES "Inverter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
