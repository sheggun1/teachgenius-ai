-- Give every existing workspace its one-time starter allowance and record it.
-- Both writes are idempotent so deployment retries cannot duplicate grants.
WITH seeded AS (
  INSERT INTO "AiCreditAccount" ("id", "organizationId", "balance", "updatedAt")
  SELECT gen_random_uuid(), o."id", 100, NOW()
  FROM "Organization" o
  ON CONFLICT ("organizationId") DO NOTHING
  RETURNING "organizationId"
)
INSERT INTO "AiUsageLedger"
  ("id", "organizationId", "operation", "creditsDelta", "status", "idempotencyKey", "metadata", "createdAt")
SELECT
  gen_random_uuid(), seeded."organizationId", 'STARTER_GRANT', 100, 'COMPLETED',
  'starter-' || seeded."organizationId"::text,
  jsonb_build_object('reason', 'Initial workspace allowance'), NOW()
FROM seeded
ON CONFLICT ("idempotencyKey") DO NOTHING;
