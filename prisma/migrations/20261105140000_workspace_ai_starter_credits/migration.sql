-- Give every existing workspace its one-time starter allowance.
-- ON CONFLICT makes this safe if a workspace account was already provisioned.
INSERT INTO "AiCreditAccount" ("id", "organizationId", "balance", "updatedAt")
SELECT gen_random_uuid(), o."id", 100, NOW()
FROM "Organization" o
ON CONFLICT ("organizationId") DO NOTHING;
