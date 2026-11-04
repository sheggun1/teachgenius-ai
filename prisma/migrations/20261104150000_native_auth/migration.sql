-- Additive authentication migration for TeachGenius AI.
-- Run the duplicate-email preflight query in the deployment guide before applying.

CREATE TYPE "PlatformRole" AS ENUM ('USER', 'PLATFORM_ADMIN');

ALTER TABLE "UserProfile"
  ALTER COLUMN "authUserId" DROP NOT NULL,
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");

CREATE TABLE "AuthSession" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

ALTER TABLE "AuthSession"
  ADD CONSTRAINT "AuthSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "UserProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
