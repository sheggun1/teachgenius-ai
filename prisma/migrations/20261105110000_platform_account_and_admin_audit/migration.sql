-- Platform account suspension, audit history, and workspace membership controls.
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
ALTER TABLE "UserProfile" ADD COLUMN "accountStatus" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE "PlatformAdminAuditLog" (
  "id" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "targetUserId" UUID,
  "organizationId" UUID,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformAdminAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlatformAdminAuditLog_actorUserId_createdAt_idx" ON "PlatformAdminAuditLog"("actorUserId", "createdAt");
CREATE INDEX "PlatformAdminAuditLog_targetUserId_createdAt_idx" ON "PlatformAdminAuditLog"("targetUserId", "createdAt");
CREATE INDEX "PlatformAdminAuditLog_organizationId_createdAt_idx" ON "PlatformAdminAuditLog"("organizationId", "createdAt");
