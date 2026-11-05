// Temporary, read-only Prisma migration diagnostic.
// This script does not modify database data or migration state.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== DATABASE MIGRATION DIAGNOSTIC (READ ONLY) ===");

  const migrationTable = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public."_prisma_migrations"')::text AS table_name`
  );
  console.log("\nMigration table:", JSON.stringify(migrationTable));

  if (migrationTable[0]?.table_name) {
    const migrations = await prisma.$queryRawUnsafe(
      `SELECT migration_name, started_at, finished_at, rolled_back_at, logs
       FROM public."_prisma_migrations"
       WHERE migration_name = $1
       ORDER BY started_at DESC
       LIMIT 3`,
      "20261105120000_platform_account_status"
    );
    console.log("\nTarget migration records:");
    for (const row of migrations) {
      const safeRow = {
        migration_name: row.migration_name,
        started_at: row.started_at,
        finished_at: row.finished_at,
        rolled_back_at: row.rolled_back_at,
        logs: row.logs ? String(row.logs).slice(0, 5000) : null,
      };
      console.log(JSON.stringify(safeRow, null, 2));
    }
  }

  const enumTypes = await prisma.$queryRawUnsafe(
    `SELECT t.typname AS type_name, e.enumlabel AS enum_value
     FROM pg_type t
     JOIN pg_enum e ON e.enumtypid = t.oid
     WHERE t.typname IN ('UserAccountStatus', 'PlatformAccountStatus')
     ORDER BY t.typname, e.enumsortorder`
  );
  console.log("\nAccount status enum types:");
  console.log(JSON.stringify(enumTypes, null, 2));

  const columns = await prisma.$queryRawUnsafe(
    `SELECT column_name, udt_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'UserProfile'
       AND column_name IN ('accountStatus', 'suspendedAt', 'suspensionReason')
     ORDER BY ordinal_position`
  );
  console.log("\nUserProfile account-status columns:");
  console.log(JSON.stringify(columns, null, 2));

  const auditTable = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public."PlatformAdminAuditLog"')::text AS table_name`
  );
  console.log("\nPlatformAdminAuditLog table:", JSON.stringify(auditTable));
  console.log("\n=== END READ-ONLY DIAGNOSTIC ===\n");
}

main()
  .catch((error) => {
    console.error("Diagnostic could not complete:", error?.message ?? String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
