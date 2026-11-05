-- Reconcile the earlier account-status migration with the Prisma schema.
-- The preceding migration introduced UserAccountStatus; the application schema
-- uses PlatformAccountStatus. Rename it when needed, or create it if absent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserAccountStatus')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlatformAccountStatus') THEN
    ALTER TYPE "UserAccountStatus" RENAME TO "PlatformAccountStatus";
  ELSIF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlatformAccountStatus') THEN
    CREATE TYPE "PlatformAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
  END IF;
END $$;

ALTER TABLE "UserProfile"
  ADD COLUMN IF NOT EXISTS "accountStatus" "PlatformAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT;
