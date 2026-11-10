const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const identity = await prisma.$queryRaw`
    SELECT
      current_database() AS database,
      current_user AS db_user,
      inet_server_addr() AS server_ip,
      inet_server_port() AS server_port
  `;

  const count = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS public_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  `;

  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
    LIMIT 30
  `;

  console.log("DATABASE IDENTITY:");
  console.log(identity);

  console.log("TABLE COUNT:");
  console.log(count);

  console.log("FIRST 30 TABLES:");
  console.log(tables);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
