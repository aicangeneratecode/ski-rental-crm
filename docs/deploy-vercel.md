# TOP RIDE — production deployment on Vercel

This guide applies to branch `main` of `aicangeneratecode/ski-rental-crm`.

## Prerequisites

- Vercel project connected to the GitHub repository, **Production Branch: `main`**.
- Node.js 24 (or at least 22.12), Next.js detected automatically.
- A **persistent cloud PostgreSQL**, for example Prisma Postgres from Vercel Storage.
- A verified database backup and a documented restore method before touching real rental/customer data.
- A Vercel plan permitting commercial use (Hobby is limited to personal non-commercial use).

## 1. Create/connect PostgreSQL

In Vercel open your project → **Storage** → **Connect Database** and choose
a PostgreSQL provider, such as **Prisma Postgres**. Connect it to this project.
Verify in **Settings → Environment Variables** that `DATABASE_URL` is available
in **Production**.

For Prisma 7 schema migrations, `DIRECT_URL` is optional but recommended
when the provider offers a direct, non-pooled URL. `prisma.config.ts` uses
`DIRECT_URL` for migrations if it exists, otherwise `DATABASE_URL`.
The application at runtime uses `DATABASE_URL` only.

**Never connect Preview deployments to the production database.** Either
connect a separate test database for Preview or leave Preview without DB access.

## 2. Set production environment variables

In the Vercel project → **Settings → Environment Variables** set:

| Variable | Value |
|---|---|
| `DATABASE_URL` | PostgreSQL connection URI, preferably from your Storage integration |
| `DIRECT_URL` | Optional direct PostgreSQL URI from the database provider for migrations |
| `BETTER_AUTH_URL` | Exact canonical production URL, e.g. `https://top-ride-abc.vercel.app` |
| `BETTER_AUTH_SECRET` | Strong randomly generated secret (at least 32 bytes of entropy) |

To generate `BETTER_AUTH_SECRET` in a terminal with Node.js, run:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Do not use a sample secret in production. Do not commit credentials to GitHub,
paste connection URLs into chat, or use the local Docker URL
`postgresql://...@localhost:5432/...` in Vercel. The serverless Vercel
environment cannot access your personal computer's local PostgreSQL.

When you change Vercel variables, **Redeploy**. Changes do not alter an older
deployment retroactively.

## 3. Build configuration

The project's `vercel.json` runs:

```bash
npm run db:generate && npm run build
```

Vercel must install dependencies using `npm ci` (default npm detection).
Do **not** add `npm run db:setup` to the Vercel Build Command: migration
permissions/availability should be managed explicitly and Preview should
not be able to change the production schema. Keep Vercel Framework Preset
**Next.js**, Root Directory **repository root**, and Output Directory **automatic**.

> **Если у вас уже есть локальные клиенты, снаряжение и брони:** не начинайте с `db:setup` в облаке. Сначала откройте [перенос всей базы без потерь](transfer-local-to-vercel.md): резервная копия, восстановление в новую пустую PostgreSQL, проверка всех таблиц, затем `db:setup` и создание аккаунта владельца. Эта последовательность заменяет шаг 4 ниже для существующих данных.

## 4. Initialize database explicitly — one time per environment

**Important: the following command changes whichever PostgreSQL is bound to
the production environment.** Ensure this is the intended new database and
create/verify a backup before executing.

On your Windows computer:

```powershell
cd C:\Users\sasha\ski-rental-crm
git switch main
git pull --ff-only origin main
npm ci
npx vercel link
npx vercel env run -e production -- npm run db:setup
npx vercel env run -e production -- npm run db:doctor
```

If an integration's production secret cannot be read by the CLI, use a direct
connection string through a secure local secret manager without printing or
committing it. Run migration commands only on the intended database.
**Never run** `prisma migrate reset` or `prisma db push --force-reset`
against real customer data.

If you already have bookings, customers and an account in local PostgreSQL,
the cloud database starts **empty**: the above migrations create schema,
**not your data**. Restore a reviewed backup into a clean production database
or use a controlled import workflow before relying on the cloud CRM.
Do not overwrite populated production tables during restoration.

If you start from an empty database, there are no credentials to log in
because public registration is deliberately disabled. Better Auth's Admin
plugin supports a one-time CLI to create the first admin:

```powershell
npx vercel env run -e production -- npx auth@latest create-admin --email YOUR_EMAIL --name "TOP RIDE" --role admin
```

Use your real email (never a default) and choose a strong unique password
when prompted. Run this **only if the production database has no existing
account**. Confirm the CLI version supports the command before use.
Use a single owner account; do not enable public registration.

## 5. Deploy

In Vercel **Deployments**, redeploy the latest commit of `main` after
setting production variables and initializing the database. Test the
canonical URL at `/login`; then check read/write access, booking
creation, inventory statuses, payments, reports and the calendar.

Do not assume a successful build proves database connectivity or end-to-end
functionality. Test on dedicated sample records before importing real data.

## Common errors

| Build/runtime message | Likely cause / remedy |
|---|---|
| `DATABASE_NOT_CONFIGURED`, missing `DATABASE_URL` | Set cloud `DATABASE_URL` for Production and redeploy |
| `P1001`, timeout / can't reach database | Database sleeping, wrong host/port, IP allowlist, TLS or network |
| `P1000`, authentication failed | Wrong username/password in connection URI |
| `P3009`, failed migration | Inspect Prisma migration logs; do not reset a production DB |
| `relation ... does not exist` | Migrations not applied to the same database used at runtime |
| Missing `BETTER_AUTH_SECRET` or auth URL mismatch | Set both auth variables for canonical production URL and redeploy |
| `@/generated/prisma/client` missing | Ensure `prisma generate` runs at install/build |
| Node engine / Next.js compatibility | Choose Node 24 (minimum 22.12) in Vercel Settings |

For an unidentified failure, open **Vercel → Project → Deployments →
failed deployment → Build Logs**, and copy the **first genuine error** plus
20–30 surrounding lines. Remove all passwords, token values and database URIs
before sharing. For a 500 after successful deployment, inspect
**Runtime Logs** instead.
