-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PackingFeeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable packing_fee_requests
CREATE TABLE IF NOT EXISTS "packing_fee_requests" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "status" "PackingFeeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "supportingNotes" TEXT,
    "rejectionReason" TEXT,
    "reviewedByAdminId" VARCHAR(30),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestedMaxFee" DECIMAL(10, 2),
    "approvedMaxFee" DECIMAL(10, 2),

    CONSTRAINT "packing_fee_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "packing_fee_requests_shopId_idx" ON "packing_fee_requests"("shopId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "packing_fee_requests_status_idx" ON "packing_fee_requests"("status");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "packing_fee_requests" ADD CONSTRAINT "packing_fee_requests_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "packing_fee_requests" ADD CONSTRAINT "packing_fee_requests_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable packing_fee_requests
ALTER TABLE "packing_fee_requests" ADD COLUMN IF NOT EXISTS "requestedMaxFee" DECIMAL(10, 2);
ALTER TABLE "packing_fee_requests" ADD COLUMN IF NOT EXISTS "approvedMaxFee" DECIMAL(10, 2);

-- AlterTable shops
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "packingFeeApprovedMaxAmount" DECIMAL(10, 2);
