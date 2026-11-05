CREATE TYPE "ResourceCategory" AS ENUM ('CURRICULUM','SCHEME_OF_WORK','LESSON_NOTE','LESSON_PLAN','ASSIGNMENT','WORKSHEET','QUESTION_PAPER','PRESENTATION','REFERENCE','OTHER');
CREATE TYPE "ResourceVisibility" AS ENUM ('PRIVATE','WORKSPACE');
CREATE TYPE "ResourceReviewStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
CREATE TABLE "ResourceAsset" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "uploadedBy" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "category" "ResourceCategory" NOT NULL DEFAULT 'OTHER',
  "visibility" "ResourceVisibility" NOT NULL DEFAULT 'PRIVATE',
  "reviewStatus" "ResourceReviewStatus" NOT NULL DEFAULT 'PENDING',
  "extractedText" TEXT,
  "fileData" BYTEA NOT NULL,
  "reviewedBy" UUID,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResourceAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResourceAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ResourceAsset_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ResourceAsset_organizationId_reviewStatus_visibility_idx" ON "ResourceAsset"("organizationId","reviewStatus","visibility");
CREATE INDEX "ResourceAsset_uploadedBy_createdAt_idx" ON "ResourceAsset"("uploadedBy","createdAt");
