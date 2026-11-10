const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const version = await prisma.$queryRawUnsafe(
    "SELECT version() AS version"
  );

  const counts = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT COUNT(*)::int FROM deliveries) AS deliveries,
      (SELECT COUNT(*)::int FROM delivery_partners) AS delivery_partners,
      (SELECT COUNT(*)::int FROM conversations) AS conversations
  `);

  const constraints = await prisma.$queryRawUnsafe(`
    SELECT
      conrelid::regclass::text AS table_name,
      conname AS constraint_name,
      pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid IN (
        'deliveries'::regclass,
        'conversations'::regclass
      )
    ORDER BY table_name, constraint_name
  `);

  const columns = await prisma.$queryRawUnsafe(`
    SELECT
      table_name,
      column_name,
      is_nullable,
      column_default,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'deliveries' AND column_name IN (
          'sellerOrderId', 'deliveryPartnerId',
          'pickupSellerAddressId', 'dropoffCustomerAddressId',
          'assignedAt', 'status'
        ))
        OR
        (table_name = 'delivery_partners' AND column_name = 'isAvailable')
      )
    ORDER BY table_name, column_name
  `);

  const enumValues = await prisma.$queryRawUnsafe(`
    SELECT t.typname AS enum_name, e.enumlabel AS enum_value
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname IN (
      'DeliveryStatus', 'ConversationType',
      'MessageSenderType', 'RiderVerificationStatus'
    )
    ORDER BY t.typname, e.enumsortorder
  `);

  console.log("DATABASE VERSION:", JSON.stringify(version, null, 2));
  console.log("EXISTING ROW COUNTS:", JSON.stringify(counts, null, 2));
  console.log("EXISTING FOREIGN KEYS:", JSON.stringify(constraints, null, 2));
  console.log("RELEVANT COLUMN DEFINITIONS:", JSON.stringify(columns, null, 2));
  console.log("ENUM VALUES:", JSON.stringify(enumValues, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
