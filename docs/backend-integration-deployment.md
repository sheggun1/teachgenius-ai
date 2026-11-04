# Backend integration deployment guide

This branch adds the first backend slice for authentication, workspaces, curriculum management, and curriculum-grounded AI generation. It is additive: it does not replace existing school, class, subject, document, credit, or usage-ledger tables.

## Included API routes

- `POST /api/auth/register` — create a teacher personal workspace or a school workspace.
- `POST /api/auth/login` — sign in with email and password.
- `POST /api/auth/logout` — revoke the current session.
- `GET /api/auth/me` — return the signed-in user.
- `GET /api/workspaces` — list active workspaces for the signed-in user.
- `POST /api/workspaces/:organizationId/members` — a school administrator adds an already-registered teacher or student.
- `GET|POST /api/workspaces/:organizationId/curricula` — list or create a draft curriculum with structured topics and learning objectives.
- `POST /api/workspaces/:organizationId/curricula/:curriculumId/versions` — add a new draft version while preserving earlier versions.
- `POST /api/workspaces/:organizationId/curricula/:curriculumId/publish` — publish the latest version with administrator approval.
- `POST /api/ai/generate` — generate an editable JSON document from a topic in a published, approved curriculum only.

## Database migration — do this before deploying the branch

The Prisma schema has been extended with password/session fields and an authentication session table. The migration is additive.

1. Open the Neon project used by the live Render service.
2. Open **SQL Editor**.
3. Run this preflight query first:

```sql
SELECT lower("email") AS normalized_email, count(*)
FROM "UserProfile"
WHERE "email" IS NOT NULL
GROUP BY lower("email")
HAVING count(*) > 1;
```

4. If the query returns any rows, stop and resolve those duplicate email addresses before proceeding. Do not delete accounts just to make the migration pass.
5. Open `prisma/migrations/20261104150000_native_auth/migration.sql` in this branch, copy its complete SQL, and run it in the Neon SQL Editor.
6. Confirm it completes successfully. Do not run `prisma db push` against the production database.

## Render environment variables

Keep the existing `DATABASE_URL` and `DIRECT_URL` values unchanged. Add:

- `OPENAI_API_KEY` — your private OpenAI API key (never put it in GitHub).
- `OPENAI_MODEL` — optional; defaults to `gpt-4.1-mini`.

The application already uses `NODE_ENV=production` on Render. The session cookie is HttpOnly, Secure in production, SameSite=Lax, and expires after seven days.

## Current limitations before public launch

- Email verification, password reset, anti-abuse/rate limiting, and automated account recovery are not included yet. Add these before allowing unrestricted public signups.
- School member creation currently attaches an existing registered account by email; invitation email delivery is a later integration.
- Curriculum creation accepts structured topic data and extracted text. Actual spreadsheet/PDF/DOCX upload, private file storage, and file parsing are not wired yet; they require a private storage provider and an extraction pipeline.
- AI generation returns structured JSON and saves a document plus its first version. It does not yet render/export PDF or DOCX.
- AI usage charging is intentionally not connected yet; do not assume credits are being deducted by this endpoint.

## Safe rollout

1. Run the database preflight and migration above.
2. Add the OpenAI environment variables in Render.
3. Open a pull request from `feature/auth-workspaces-curriculum-ai` into `main`.
4. Wait for build checks and review the changed files.
5. Merge only after checks pass. Render will then deploy from `main`.
6. Verify `/api/health` and `/api/database`, then test registration and login with a test account before inviting real users.
