-- Reconcile account-status types and columns after the earlier migration.
-- The first migration created UserAccountStatus and added accountStatus.
-- A previous attempt at this migration may also have created
-- PlatformAccountStatus before failing. Handle either state safely.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserAccountStatus')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlatformAccountStatus') THEN
    -- Renaming the enum also updates any existing column using it.
    ALTER TYPE "UserAccountStatus" RENAME TO "PlatformAccountStatus";
  ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserAccountStatus')
     AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlatformAccountStatus') THEN
    -- Both enum types exist: convert the existing column if it still uses
    -- the old enum. Drop its default first so PostgreSQL can change the type.
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'UserProfile'
        AND column_name = 'accountStatus'
        AND udt_name = 'UserAccountStatus'
    ) THEN
      ALTER TABLE "UserProfile" ALTER COLUMN "accountStatus" DROP DEFAULT;
      ALTER TABLE "UserProfile"
        ALTER COLUMN "accountStatus" TYPE "PlatformAccountStatus"
        USING ("accountStatus"::text::"PlatformAccountStatus");
      ALTER TABLE "UserProfile"
        ALTER COLUMN "accountStatus" SET DEFAULT 'ACTIVE'::"PlatformAccountStatus";
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlatformAccountStatus') THEN
    CREATE TYPE "PlatformAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
  END IF;
END $$;

ALTER TABLE "UserProfile"
  ADD COLUMN IF NOT EXISTS "accountStatus" "PlatformAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
