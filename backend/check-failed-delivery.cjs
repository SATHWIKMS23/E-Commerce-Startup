const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const migration = await p.$queryRaw`
    SELECT migration_name, started_at, finished_at, rolled_back_at, logs
    FROM "_prisma_migrations"
    WHERE migration_name = '20261110180000_add_delivery_system'
    ORDER BY started_at DESC
  `;

  const tables = await p.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'delivery_assignments', 'delivery_timeline_events',
        'delivery_ratings', 'delivery_incidents', 'rider_strikes',
        'external_delivery_shops', 'delivery_global_settings',
        'delivery_settings_audit_logs', 'rider_payouts',
        'rider_documents', 'delivery_zones'
      )
    ORDER BY table_name
  `;

  const enums = await p.$queryRaw`
    SELECT t.typname AS enum_name, e.enumlabel AS enum_value
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname IN (
      'DeliveryStatus', 'ConversationType', 'MessageSenderType'
    )
    ORDER BY t.typname, e.enumsortorder
  `;

  console.log("MIGRATION:", JSON.stringify(migration, null, 2));
  console.log("CREATED TABLES:", JSON.stringify(tables, null, 2));
  console.log("ENUMS:", JSON.stringify(enums, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
