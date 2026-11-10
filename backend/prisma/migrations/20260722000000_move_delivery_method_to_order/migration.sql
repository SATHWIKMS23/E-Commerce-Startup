-- AlterTable: Add delivery assignment fields to seller_orders
ALTER TABLE "seller_orders" ADD COLUMN "deliveryAssignedAt" TIMESTAMP(3),
    ADD COLUMN "deliveryAssignedBy" VARCHAR(50);

-- AlterTable: Drop deliveryMethod from products
ALTER TABLE "products" DROP COLUMN "deliveryMethod";

-- DropEnum: Remove ProductDeliveryMethod enum
DROP TYPE "ProductDeliveryMethod";
