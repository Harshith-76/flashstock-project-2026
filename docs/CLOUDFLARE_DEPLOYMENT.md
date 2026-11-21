# Cloudflare Deployment Guide

This guide prepares the existing FlashStock application for a single-origin Cloudflare Workers deployment. It does not authorize a deployment or a database migration. The API and frontend share the existing Worker, and the Worker keeps the existing D1 binding.

## Architecture

```text
Browser
  └── Cloudflare Worker: flashstock-api
      ├── /api and /api/* → Hono API
      ├── /assets/*       → Vite static build
      ├── other files     → Vite static build
      └── unknown page navigation → index.html (React Router)
                                └── D1 binding DB → flashstock-db
```

Wrangler reads the frontend from `apps/web/dist` (relative to the API config). The `/api` and `/api/*` patterns run through Hono first, so unknown API routes return JSON 404 responses rather than the SPA document. Unmatched non-API navigation requests use the SPA fallback. The frontend continues using same-origin `/api/v1` requests; its local Vite proxy remains configured for development.

The deployed Worker configuration keeps database ID `90b77993-51a2-4b83-834e-4966c5c06e4d`. Do not change this binding to a new database during deployment.

## Local development

Install dependencies from the repository root:

```powershell
npm ci
npm --prefix apps/api ci
npm --prefix apps/web ci
```

Apply migrations only to the local Wrangler D1 database when setting up a fresh local environment, after reviewing the SQL files:

```powershell
npx wrangler d1 migrations apply flashstock-db --local --config apps/api/wrangler.jsonc
```

Start the API and Vite in separate terminals:

```powershell
npm run dev:api
npm run dev:web
```

The API dev script marks the Worker environment as `development`. This permits the localhost origins used by Vite’s `/api` proxy. Production defaults to `ENVIRONMENT=production`, where localhost origins are not allowed by CORS.

## Build and local deployment preview

Build the frontend before starting Wrangler so the configured assets directory exists:

```powershell
npm --prefix apps/web run build
```

Run a local Worker preview using the existing local D1 state:

```powershell
npx wrangler dev --config apps/api/wrangler.jsonc --var ENVIRONMENT:development
```

Before any deployment, validate the production bundle without publishing it:

```powershell
npm test
.\apps\api\node_modules\.bin\tsc.cmd --noEmit -p apps\api\tsconfig.json
npm --prefix apps/web run build
npx wrangler deploy --dry-run --config apps/api/wrangler.jsonc
```

## Environment variables and secrets

| Name | Kind | Required | Purpose |
|---|---|---:|---|
| `ENVIRONMENT` | Non-secret Worker variable | Configured | Set to `production` in Wrangler config; local dev command overrides it to `development`. CORS localhost origins and demo seeding are enabled only in development. |
| `CORS_ALLOWED_ORIGINS` | Non-secret Worker variable | Only for cross-origin clients | Comma-separated exact origins explicitly approved for credentialed CORS. No production origin is assumed. Same-origin hosting does not need a production CORS allow-list. |
| `DB` | Cloudflare D1 binding | Yes | Existing database binding for `flashstock-db`; it is not a secret. |

No Cloudflare secret is currently required by the application. Authentication uses random server-side sessions and secure password hashes. Payment is simulated; no card data or payment-provider credentials are used. Do not place passwords, API keys, or `.dev.vars` values in Wrangler `vars`, source files, or Git.

The session cookie is `HttpOnly`, `SameSite=Lax`, and marked `Secure` for HTTPS. Keeping the storefront and API on the same origin avoids cross-origin cookie requirements.

`CORS_ALLOWED_ORIGINS` controls browser origin access; it does not make a `SameSite=Lax` cookie available to an unrelated cross-site frontend. If a future design uses a different site for the storefront and API, review the cookie and credential policy as a separate security change. No production domain or cross-site cookie policy is assumed here.

## Cloudflare setup and deployment

1. Authenticate Wrangler with an account permitted to deploy Workers and access the existing D1 database. `npx wrangler whoami` checks the active account.
2. In **Workers & Pages → D1**, verify the existing database is `flashstock-db` and that its ID matches the ID in `apps/api/wrangler.jsonc`. Do not create or replace it.
3. Review the Worker configuration: `flashstock-api`, `src/index.ts`, D1 binding `DB`, Static Assets directory, SPA mode, `/api` Worker-first routes, and the reservation cleanup cron.
4. Configure `CORS_ALLOWED_ORIGINS` only if a real, selected cross-origin client will call the API. Enter its exact origin in the Worker’s non-secret Variables settings. Do not use guessed domains or `*` with credentials.
5. Build and run all checks below. Inspect the Wrangler dry-run output and confirm it lists both the D1 binding and the Vite asset bundle.
6. Only after the database history and schema have been reviewed, deploy using:

   ```powershell
   npm --prefix apps/web run build
   npx wrangler deploy --config apps/api/wrangler.jsonc
   ```

This command is documented for a future deployment and was not run during this task.

## Remote D1 migration safety procedure

Local D1 state is separate from remote D1. Commands carrying `--local` operate against the local Wrangler database. Commands carrying `--remote` address Cloudflare D1. This task did not run any remote command.

Before an approved production migration:

1. Inspect the existing migration ledger (read-only):

   ```powershell
   npx wrangler d1 migrations list flashstock-db --remote --config apps/api/wrangler.jsonc
   ```

2. Inspect only remote schema metadata (read-only; do not query customer/order rows):

   ```powershell
   npx wrangler d1 execute flashstock-db --remote --config apps/api/wrangler.jsonc --command "SELECT type, name, sql FROM sqlite_master WHERE type IN ('table', 'index', 'trigger') ORDER BY type, name;"
   ```

3. Compare both results with `apps/api/migrations/0001_initial_schema.sql` through `0005_order_shipping_address.sql` and `apps/api/src/db/schema.ts`. Resolve any missing ledger entries or schema drift manually before applying anything. Do not assume the migration ledger proves that the live schema is correct.
4. Obtain a reviewed backup and explicit approval before applying a migration. Then apply only the intended migration set:

   ```powershell
   npx wrangler d1 migrations apply flashstock-db --remote --config apps/api/wrangler.jsonc
   ```

That last command modifies remote schema and was not run. Do not run it merely because the Worker deployment is ready. Keep future migration files additive and backward-compatible where possible. Drizzle is configured to generate under `apps/api/migrations/drizzle`, while Wrangler’s migration source is the top-level `apps/api/migrations` folder; coordinate generated migrations before treating them as deployable.

## Rollback

Workers versions include code, static assets, bindings, and compatibility settings. In **Workers & Pages → flashstock-api → Deployments**, choose the last known-good version and roll it back. Alternatively, after confirming the desired version ID, run:

```powershell
npx wrangler rollback <VERSION_ID> --config apps/api/wrangler.jsonc
```

A Worker rollback does not reverse D1 data or schema changes. Do not roll back application code across a migration unless that old code remains compatible with the current database. Treat any data repair as a separate reviewed operation.

## Deployment checklist

- [ ] Verify production D1 name and ID; do not create a replacement.
- [ ] Review remote migration history and schema without applying migrations.
- [ ] Confirm frontend navigation, API 404 responses, login cookies, and database-backed pages on the local Worker preview.
- [ ] Set only the actual cross-origin allow-list if required.
- [ ] Keep demo seed tooling out of production and verify its endpoint is unavailable outside development.
- [ ] Run tests, API TypeScript, frontend build, `git diff --check`, and Wrangler dry-run.
- [ ] Capture the current Worker version and an approved D1 backup before deployment/migration.
- [ ] Deploy only after explicit release approval.
