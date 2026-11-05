# TeachGenius AI

TeachGenius AI is a multi-tenant teaching and learning workspace built with Next.js, TypeScript, Prisma and PostgreSQL. It supports independent teacher workspaces and school workspaces with role-based access.

## Platform capabilities

- Email and password registration and sign-in with server-side sessions.
- Personal teacher and school workspaces.
- Platform Admin, School Admin and Teacher roles.
- Workspace membership management and account suspension controls.
- Curriculum and scheme-of-work uploads, extraction and draft conversion with Gemini.
- Curriculum review and publishing by School Admins.
- AI document generation scoped to approved curriculum topics.
- Resource library with private/workspace visibility, moderation and permission-aware downloads.
- Versioned teaching documents.
- Workspace AI credit balances, usage ledger, starter allowance and audited Platform Admin grants.
- Database-backed health endpoint at `/api/health`.

## Technology

- Node.js 20.9+
- Next.js 15 App Router
- React 19
- TypeScript
- Prisma 6
- PostgreSQL
- Gemini Interactions API

## Environment variables

Configure these in your local environment and your hosting provider. Never commit real secrets.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma at runtime |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection used by Prisma migrations |
| `GEMINI_API_KEY` | For AI features | Server-side Gemini API key |
| `GEMINI_MODEL` | No | Gemini model override; the application has a default |

Keep database credentials and the Gemini key in the hosting provider's secret/environment settings. Do not expose them through `NEXT_PUBLIC_*` variables or browser code.

## Local development

1. Install Node.js 20.9 or newer and Yarn.
2. Create a local `.env` file containing `DATABASE_URL` and `DIRECT_URL`. Add `GEMINI_API_KEY` to use AI features.
3. Install dependencies:

   ```bash
   yarn install
   ```

4. Generate the Prisma client:

   ```bash
   npx prisma generate
   ```

5. Apply committed migrations to your local database:

   ```bash
   npx prisma migrate deploy
   ```

6. Start the development server:

   ```bash
   yarn dev
   ```

7. Open `http://localhost:3000`. Check database connectivity at `http://localhost:3000/api/health`.

Useful scripts:

- `yarn dev` — local development server.
- `yarn typecheck` — TypeScript validation.
- `yarn lint` — ESLint.
- `yarn build` — production build.
- `yarn start` — run the production server after building.
- `npx prisma generate` — generate Prisma Client.
- `npx prisma migrate deploy` — apply committed migrations.

## Production deployment

For Render or another Node.js host:

1. Connect the Git repository and deploy the `main` branch.
2. Set `DATABASE_URL`, `DIRECT_URL` and `GEMINI_API_KEY` in the host's environment settings. Set `GEMINI_MODEL` only when intentionally overriding the application default.
3. Use this build command:

   ```bash
   yarn install --production=false && npx prisma generate && npx prisma migrate deploy && yarn build
   ```

4. Use this start command:

   ```bash
   yarn start
   ```

5. After deployment, verify the service startup logs and visit `/api/health`. A healthy response confirms the application can execute a database probe; it does not replace a functional sign-in and workflow check.

Production databases must be upgraded with reviewed Prisma migrations. Do not use `prisma migrate reset` or `prisma db push` against production. If a migration reports a failed state, inspect the migration and actual database state before choosing a recovery action. Never mark a migration rolled back or applied without verifying what happened in the database.

## Authentication and access

- Passwords are stored as salted scrypt hashes.
- Session tokens are random, stored as hashes in PostgreSQL and delivered in HTTP-only cookies.
- Workspace APIs check the signed-in user's active membership and role.
- Platform Admin actions are restricted to Platform Admin accounts and audited.
- Curriculum publication is restricted to School Admins and Platform Admins.
- AI generation requires a topic from a published and approved curriculum.
- Uploaded resources are private by default unless workspace sharing and review rules permit access.

## AI credits

- New workspaces receive a starter allowance of 100 AI credits.
- Successful document generation uses one credit.
- Successful curriculum conversion uses one credit.
- Failed AI operations refund their reserved credit.
- Platform Admin credit grants are recorded in the usage ledger and audit log.
- Credits are workspace allowances; this repository does not implement automatic paid subscriptions or payment collection.

## Resource library notes

Uploads are limited to 8 MB. Supported file types are PDF, DOCX, DOC, PPTX, XLSX, TXT, CSV, JPG and PNG. Text extraction for AI context currently supports PDF, DOCX, TXT and CSV. Other accepted formats can be stored and downloaded but are not currently converted into AI-readable text.

Curriculum conversions are saved as drafts. A School Admin must review and publish a curriculum before it can guide AI document generation.

## CI verification

Pull requests targeting `main` run the Backend checks workflow. It installs dependencies, generates Prisma Client, runs TypeScript validation and builds the Next.js application. A passing build does not by itself prove that production environment variables, database migrations or third-party AI credentials are configured correctly.

## Data and operational safety

- Back up the PostgreSQL database using your database provider's supported backup/PITR facilities.
- Keep production secrets out of source control and logs.
- Review migrations before deployment.
- Test role changes and resource sharing with accounts representing the intended roles.
- Establish school consent, student privacy, retention and deletion policies before storing identifiable student information.
