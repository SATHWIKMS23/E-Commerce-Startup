-- CreateEnum
CREATE TYPE "RiderVerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ACTION_REQUIRED', 'SUSPENDED', 'BANNED');

-- AlterEnum
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


-- AlterEnum
-- DropForeignKey
ALTER TABLE "deliveries" DROP CONSTRAINT "deliveries_deliveryPartnerId_fkey";

-- DropForeignKey
ALTER TABLE "deliveries" DROP CONSTRAINT "deliveries_dropoffCustomerAddressId_fkey";

-- DropForeignKey
ALTER TABLE "deliveries" DROP CONSTRAINT "deliveries_pickupSellerAddressId_fkey";

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "deliveryPartnerId" TEXT;

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "additionalChargePaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "arrivedAtDropoffAt" TIMESTAMP(3),
ADD COLUMN     "arrivedAtPickupAt" TIMESTAMP(3),
ADD COLUMN     "baseChargePaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryFeePaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "deliveryOtpHash" TEXT,
ADD COLUMN     "deliveryOtpVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "distanceChargePaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "distanceKm" DECIMAL(6,2),
ADD COLUMN     "dropoffContactName" VARCHAR(100),
ADD COLUMN     "dropoffContactPhone" VARCHAR(20),
ADD COLUMN     "dropoffLat" DECIMAL(10,8),
ADD COLUMN     "dropoffLng" DECIMAL(11,8),
ADD COLUMN     "estimatedDurationMins" INTEGER,
ADD COLUMN     "externalShopId" TEXT,
ADD COLUMN     "inTransitAt" TIMESTAMP(3),
ADD COLUMN     "offeredAt" TIMESTAMP(3),
ADD COLUMN     "payoutStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "pickedUpAt" TIMESTAMP(3),
ADD COLUMN     "pickupContactName" VARCHAR(100),
ADD COLUMN     "pickupContactPhone" VARCHAR(20),
ADD COLUMN     "pickupLat" DECIMAL(10,8),
ADD COLUMN     "pickupLng" DECIMAL(11,8),
ADD COLUMN     "pickupOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "pickupOtpHash" TEXT,
ADD COLUMN     "pickupOtpVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "pickupQrToken" TEXT,
ADD COLUMN     "platformCommissionPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "riderPayoutPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "riderPayoutPercentage" DECIMAL(5,2) NOT NULL DEFAULT 90.00,
ADD COLUMN     "searchStartedAt" TIMESTAMP(3),
ALTER COLUMN "sellerOrderId" DROP NOT NULL,
ALTER COLUMN "deliveryPartnerId" DROP NOT NULL,
ALTER COLUMN "pickupSellerAddressId" DROP NOT NULL,
ALTER COLUMN "dropoffCustomerAddressId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'REQUESTED',
ALTER COLUMN "assignedAt" DROP NOT NULL,
ALTER COLUMN "assignedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "delivery_partners" ADD COLUMN     "aadhaarDeletedAt" TIMESTAMP(3),
ADD COLUMN     "aadhaarDocKey" VARCHAR(255),
ADD COLUMN     "aadhaarDocUrl" VARCHAR(2048),
ADD COLUMN     "aadhaarNumberMasked" VARCHAR(20),
ADD COLUMN     "aadhaarVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "bankAccountName" VARCHAR(100),
ADD COLUMN     "bankAccountNumber" VARCHAR(50),
ADD COLUMN     "bankIfsc" VARCHAR(20),
ADD COLUMN     "cancelledDeliveriesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "city" VARCHAR(100) DEFAULT 'Mysuru',
ADD COLUMN     "completedDeliveriesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "emergencyContactName" VARCHAR(100),
ADD COLUMN     "emergencyContactPhone" VARCHAR(20),
ADD COLUMN     "insuranceNumber" VARCHAR(50),
ADD COLUMN     "lastLocationUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "rcNumber" VARCHAR(50),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "residentialAddress" VARCHAR(500),
ADD COLUMN     "strikeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalDeliveriesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalRatings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "upiId" VARCHAR(100),
ADD COLUMN     "vehiclePhotoUrl" VARCHAR(2048),
ADD COLUMN     "verificationStatus" "RiderVerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verifiedByAdminId" VARCHAR(30),
ALTER COLUMN "isAvailable" SET DEFAULT false;

-- CreateTable
CREATE TABLE "delivery_assignments" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "deliveryPartnerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFERED',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_timeline_events" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_ratings" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "deliveryPartnerId" TEXT NOT NULL,
    "raterType" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "raterName" TEXT,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_incidents" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "deliveryPartnerId" TEXT NOT NULL,
    "reporterType" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reporterName" TEXT,
    "incidentType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "riderResponse" TEXT,
    "riderRespondedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "adminDecision" TEXT,
    "adminNotes" TEXT,
    "penaltyPercentage" DECIMAL(5,2),
    "payoutAdjustmentPaise" INTEGER,
    "strikeIssued" BOOLEAN NOT NULL DEFAULT false,
    "decidedAt" TIMESTAMP(3),
    "decidedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rider_strikes" (
    "id" TEXT NOT NULL,
    "deliveryPartnerId" TEXT NOT NULL,
    "incidentId" TEXT,
    "strikeNumber" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "issuedByAdminId" TEXT NOT NULL,
    "isAppealed" BOOLEAN NOT NULL DEFAULT false,
    "appealNotes" TEXT,
    "appealStatus" TEXT,
    "appealDecidedByAdminId" TEXT,
    "appealDecidedAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rider_strikes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_delivery_shops" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "contactPerson" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(320),
    "addressLine1" VARCHAR(300) NOT NULL,
    "addressLine2" VARCHAR(300),
    "city" VARCHAR(100) NOT NULL DEFAULT 'Mysuru',
    "state" VARCHAR(100) NOT NULL DEFAULT 'Karnataka',
    "postalCode" VARCHAR(20) NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pricingAgreementNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_delivery_shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_global_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "brandName" TEXT NOT NULL DEFAULT 'AtlasBasket Delivery',
    "brandLogoUrl" TEXT,
    "brandTagline" TEXT DEFAULT 'Local Delivery Fleet',
    "riderPayoutPercentage" DECIMAL(5,2) NOT NULL DEFAULT 90.00,
    "platformCommissionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "baseChargePaise" INTEGER NOT NULL DEFAULT 3000,
    "perKmChargePaise" INTEGER NOT NULL DEFAULT 1000,
    "minDeliveryChargePaise" INTEGER NOT NULL DEFAULT 4000,
    "maxDeliveryRadiusMeters" INTEGER NOT NULL DEFAULT 25000,
    "assignmentTimeoutSeconds" INTEGER NOT NULL DEFAULT 30,
    "searchRadiusMeters" INTEGER NOT NULL DEFAULT 5000,
    "maxAssignmentAttempts" INTEGER NOT NULL DEFAULT 3,
    "maxMonthlyRiderCancellations" INTEGER NOT NULL DEFAULT 5,
    "damagePenaltyPercentage" DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    "maxStrikesBeforeBan" INTEGER NOT NULL DEFAULT 3,
    "activeCity" TEXT NOT NULL DEFAULT 'Mysuru',
    "activeCities" TEXT[] DEFAULT ARRAY['Mysuru']::TEXT[],
    "supportedVehicles" TEXT[] DEFAULT ARRAY['BICYCLE', 'MOTORCYCLE', 'SCOOTER', 'EV']::TEXT[],
    "isDeliveryServiceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "heroBadgeText" TEXT DEFAULT 'Now Launching Across Mysuru City',
    "heroHeadingLine1" TEXT DEFAULT 'Deliver locally.',
    "heroHeadingLine2" TEXT DEFAULT 'Earn directly with every trip.',
    "heroDescription" TEXT DEFAULT 'Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in Mysuru. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts.',
    "showCardPayout" BOOLEAN NOT NULL DEFAULT true,
    "cardPayoutValue" TEXT NOT NULL DEFAULT '~90%',
    "cardPayoutLabel" TEXT NOT NULL DEFAULT 'Rider Payout',
    "cardPayoutDesc" TEXT NOT NULL DEFAULT 'Direct earnings share',
    "showCardCity" BOOLEAN NOT NULL DEFAULT true,
    "cardCityValue" TEXT NOT NULL DEFAULT 'Mysuru',
    "cardCityLabel" TEXT NOT NULL DEFAULT 'Active City',
    "cardCityDesc" TEXT NOT NULL DEFAULT 'Local delivery zones',
    "showCardFee" BOOLEAN NOT NULL DEFAULT true,
    "cardFeeValue" TEXT NOT NULL DEFAULT '₹0 Free',
    "cardFeeLabel" TEXT NOT NULL DEFAULT 'Registration Fee',
    "cardFeeDesc" TEXT NOT NULL DEFAULT 'No upfront fees',
    "showCardVehicles" BOOLEAN NOT NULL DEFAULT true,
    "cardVehiclesValue" TEXT NOT NULL DEFAULT 'Bikes & EVs',
    "cardVehiclesLabel" TEXT NOT NULL DEFAULT 'Vehicles Welcome',
    "cardVehiclesDesc" TEXT NOT NULL DEFAULT 'Bicycles welcome',
    "updatedByAdminId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_settings_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "settingKey" TEXT NOT NULL,
    "previousValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_settings_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rider_payouts" (
    "id" TEXT NOT NULL,
    "deliveryPartnerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalDeliveriesCount" INTEGER NOT NULL,
    "grossAmountPaise" INTEGER NOT NULL,
    "deductionsPaise" INTEGER NOT NULL DEFAULT 0,
    "netAmountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentReference" TEXT,
    "paymentMethod" TEXT,
    "approvedByAdminId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rider_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rider_documents" (
    "id" TEXT NOT NULL,
    "deliveryPartnerId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT,
    "documentUrl" VARCHAR(2048) NOT NULL,
    "fileKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "verifiedByAdminId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rider_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Mysuru',
    "centerLat" DECIMAL(10,8) NOT NULL,
    "centerLng" DECIMAL(11,8) NOT NULL,
    "radiusMeters" INTEGER NOT NULL DEFAULT 5000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "surgeMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_assignments_deliveryId_idx" ON "delivery_assignments"("deliveryId");

-- CreateIndex
CREATE INDEX "delivery_assignments_deliveryPartnerId_idx" ON "delivery_assignments"("deliveryPartnerId");

-- CreateIndex
CREATE INDEX "delivery_assignments_status_idx" ON "delivery_assignments"("status");

-- CreateIndex
CREATE INDEX "delivery_timeline_events_deliveryId_idx" ON "delivery_timeline_events"("deliveryId");

-- CreateIndex
CREATE INDEX "delivery_timeline_events_timestamp_idx" ON "delivery_timeline_events"("timestamp");

-- CreateIndex
CREATE INDEX "delivery_ratings_deliveryPartnerId_idx" ON "delivery_ratings"("deliveryPartnerId");

-- CreateIndex
CREATE INDEX "delivery_ratings_deliveryId_idx" ON "delivery_ratings"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_ratings_deliveryId_raterType_raterId_key" ON "delivery_ratings"("deliveryId", "raterType", "raterId");

-- CreateIndex
CREATE INDEX "delivery_incidents_deliveryId_idx" ON "delivery_incidents"("deliveryId");

-- CreateIndex
CREATE INDEX "delivery_incidents_deliveryPartnerId_idx" ON "delivery_incidents"("deliveryPartnerId");

-- CreateIndex
CREATE INDEX "delivery_incidents_status_idx" ON "delivery_incidents"("status");

-- CreateIndex
CREATE INDEX "rider_strikes_deliveryPartnerId_idx" ON "rider_strikes"("deliveryPartnerId");

-- CreateIndex
CREATE UNIQUE INDEX "external_delivery_shops_phone_key" ON "external_delivery_shops"("phone");

-- CreateIndex
CREATE INDEX "external_delivery_shops_phone_idx" ON "external_delivery_shops"("phone");

-- CreateIndex
CREATE INDEX "external_delivery_shops_status_idx" ON "external_delivery_shops"("status");

-- CreateIndex
CREATE INDEX "delivery_settings_audit_logs_timestamp_idx" ON "delivery_settings_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "rider_payouts_deliveryPartnerId_idx" ON "rider_payouts"("deliveryPartnerId");

-- CreateIndex
CREATE INDEX "rider_payouts_status_idx" ON "rider_payouts"("status");

-- CreateIndex
CREATE INDEX "rider_documents_deliveryPartnerId_idx" ON "rider_documents"("deliveryPartnerId");

-- CreateIndex
CREATE INDEX "rider_documents_documentType_idx" ON "rider_documents"("documentType");

-- CreateIndex
CREATE INDEX "rider_documents_isDeleted_idx" ON "rider_documents"("isDeleted");

-- CreateIndex
CREATE INDEX "delivery_zones_city_idx" ON "delivery_zones"("city");

-- CreateIndex
CREATE INDEX "conversations_deliveryPartnerId_idx" ON "conversations"("deliveryPartnerId");

-- CreateIndex
CREATE INDEX "deliveries_sellerOrderId_idx" ON "deliveries"("sellerOrderId");

-- CreateIndex
CREATE INDEX "deliveries_externalShopId_idx" ON "deliveries"("externalShopId");

-- CreateIndex
CREATE INDEX "deliveries_requestedAt_idx" ON "deliveries"("requestedAt");

-- CreateIndex
CREATE INDEX "delivery_partners_verificationStatus_idx" ON "delivery_partners"("verificationStatus");

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_timeline_events" ADD CONSTRAINT "delivery_timeline_events_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_ratings" ADD CONSTRAINT "delivery_ratings_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_ratings" ADD CONSTRAINT "delivery_ratings_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_incidents" ADD CONSTRAINT "delivery_incidents_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_incidents" ADD CONSTRAINT "delivery_incidents_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_strikes" ADD CONSTRAINT "rider_strikes_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_strikes" ADD CONSTRAINT "rider_strikes_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "delivery_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_payouts" ADD CONSTRAINT "rider_payouts_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_documents" ADD CONSTRAINT "rider_documents_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "delivery_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_dropoffCustomerAddressId_fkey" FOREIGN KEY ("dropoffCustomerAddressId") REFERENCES "customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_pickupSellerAddressId_fkey" FOREIGN KEY ("pickupSellerAddressId") REFERENCES "seller_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_externalShopId_fkey" FOREIGN KEY ("externalShopId") REFERENCES "external_delivery_shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

