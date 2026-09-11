-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CPF', 'CNPJ');

-- CreateTable
CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cnpj" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consumer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consumer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerUnit" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "address" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsumerUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Distributor_code_key" ON "Distributor"("code");

-- CreateIndex
CREATE INDEX "Distributor_status_idx" ON "Distributor"("status");

-- CreateIndex
CREATE INDEX "Distributor_name_idx" ON "Distributor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Consumer_document_key" ON "Consumer"("document");

-- CreateIndex
CREATE INDEX "Consumer_status_idx" ON "Consumer"("status");

-- CreateIndex
CREATE INDEX "Consumer_name_idx" ON "Consumer"("name");

-- CreateIndex
CREATE INDEX "ConsumerUnit_consumerId_idx" ON "ConsumerUnit"("consumerId");

-- CreateIndex
CREATE INDEX "ConsumerUnit_distributorId_idx" ON "ConsumerUnit"("distributorId");

-- CreateIndex
CREATE INDEX "ConsumerUnit_status_idx" ON "ConsumerUnit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerUnit_distributorId_number_key" ON "ConsumerUnit"("distributorId", "number");

-- AddForeignKey
ALTER TABLE "ConsumerUnit" ADD CONSTRAINT "ConsumerUnit_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "Consumer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerUnit" ADD CONSTRAINT "ConsumerUnit_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
