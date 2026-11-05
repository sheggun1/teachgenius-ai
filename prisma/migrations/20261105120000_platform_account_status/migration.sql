-- Add platform-wide account suspension without changing existing accounts.
CREATE TYPE "PlatformAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
ALTER TABLE "UserProfile"
  ADD COLUMN "accountStatus" "PlatformAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" TEXT;
