-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'INVESTIDOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CONSUMIDOR';

-- CreateTable
CREATE TABLE "UserMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "customerId" TEXT,
    "plantId" TEXT,
    "scopeKey" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserMembership_userId_status_idx" ON "UserMembership"("userId", "status");

-- CreateIndex
CREATE INDEX "UserMembership_customerId_idx" ON "UserMembership"("customerId");

-- CreateIndex
CREATE INDEX "UserMembership_plantId_idx" ON "UserMembership"("plantId");

-- CreateIndex
CREATE INDEX "UserMembership_role_status_idx" ON "UserMembership"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserMembership_userId_role_scopeKey_key" ON "UserMembership"("userId", "role", "scopeKey");

-- AddForeignKey
ALTER TABLE "UserMembership" ADD CONSTRAINT "UserMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMembership" ADD CONSTRAINT "UserMembership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMembership" ADD CONSTRAINT "UserMembership_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
