# TeachGenius AI — Backend Foundation

A fresh Next.js + TypeScript backend foundation for a public, multi-tenant educational platform.

## Included in this first milestone

- Next.js App Router project scaffold
- TypeScript strict mode
- Prisma + PostgreSQL schema foundation
- Initial organization, membership and role models
- Academic sessions, classes and subjects
- Curriculum documents, versions and topics
- Generated documents and document version history
- AI credit account and usage ledger foundations
- Health-check endpoint
- Environment-variable example

## Prerequisites

- Node.js 20.9 or newer
- npm
- A GitHub account
- A PostgreSQL database (Supabase can provide this)

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your PostgreSQL connection string.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Generate the Prisma client:

   ```bash
   npm run db:generate
   ```

5. For an initial local schema sync:

   ```bash
   npm run db:push
   ```

   For shared/production environments, use reviewed Prisma migrations instead of `db:push`.

6. Start the application:

   ```bash
   npm run dev
   ```

7. Visit `http://localhost:3000/api/health`.

## GitHub setup

Create a private repository named `teachgenius-ai`, then upload these project files or push them using Git.

Never commit `.env` or any API secret. Only `.env.example` belongs in GitHub.

## Important implementation notes

- Authentication is not wired yet. `UserProfile.authUserId` is designed to reference the authenticated user ID from the chosen auth provider.
- API authorization and tenant-isolation middleware must be implemented before exposing organization data.
- The schema is a starting foundation and must be validated with Prisma before production use.
- Do not expose the Supabase service-role key or AI provider keys in browser code.
- Credit deductions must be implemented using database transactions and idempotency keys.
- Student privacy, school consent, retention and deletion workflows must be completed before onboarding real students.

## Next milestone

Validate the schema against a real PostgreSQL database, then implement authentication, session handling, organization membership and server-side permission checks.
