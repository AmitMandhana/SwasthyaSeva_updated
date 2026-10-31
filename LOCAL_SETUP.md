# Local Setup

Run SwasthyaSeva from a fresh clone. No Render, Vercel, or domain needed.

## Prerequisites

- Node.js 20.9+ (22/24 tested)
- npm 10+
- Git
- A Supabase project (Postgres)

## 1. Clone and install

```bash
git clone https://github.com/AmitMandhana/SwasthyaSeva_updated.git
cd SwasthyaSeva_updated

# frontends + shared packages (workspaces)
npm install

# backend is a separate package
cd backend && npm install && cd ..
```

## 2. Backend environment

```bash
cp .env.example backend/.env
```

Fill `backend/.env` with:

| Variable | Local value |
|---|---|
| `NODE_ENV` | `development` |
| `PORT` | `5000` |
| `DEV_MODE` | `false` |
| `OTP_BYPASS` | `true` (OTP is always `123456`, no SMS/email sent) |
| `SUPABASE_URL` | `https://<PROJECT_REF>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` (server-side only) |
| `SUPABASE_JWKS_URL` | `https://<PROJECT_REF>.supabase.co/auth/v1/.well-known/jwks.json` |
| `DATABASE_URL` | see below |
| `TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` (test key, always passes) |
| `TURNSTILE_SECRET_KEY` | `1x0000000000000000000000000000000AA` (test key) |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003` |
| `ADMIN_USERNAME` | your admin username |
| `ADMIN_PASSWORD` | your admin password (12+ chars) |

Generate the two crypto secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it twice and use one value for `JWT_SECRET` and one for `PII_SECRET`.

### Database URL

Supabase Dashboard -> Project Settings -> Database -> Connection string.

Use the **pooler** host (the direct `db.<ref>.supabase.co` host is IPv6-only on some networks):

```ini
DATABASE_URL=postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@<REGION>.pooler.supabase.com:5432/postgres?uselibpqcompat=true&sslmode=require
```

`uselibpqcompat=true` keeps `sslmode=require` working on machines with an intercepting TLS proxy. In a normal network, `?sslmode=require` alone is enough.

Optional for image uploads:

```ini
CLOUDINARY_URL=cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>
```

## 3. Create the database and first admin

```bash
cd backend
node scripts/initFreshDb.js <admin-username> <admin-password>
```

Or omit the arguments and use `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `backend/.env`.

If tables already exist and you want a clean rebuild (destructive):

```bash
FORCE=true node scripts/initFreshDb.js <admin-username> <admin-password>
```

## 4. Frontend environment

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
cp apps/doctor/.env.example apps/doctor/.env.local
cp apps/clinic/.env.example apps/clinic/.env.local
```

These point the apps at `http://localhost:5000` and use the Cloudflare Turnstile test key. Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` only if you need maps.

## 5. Run

Two terminals:

```bash
# Terminal 1 - API
cd backend
npm run dev
```

```bash
# Terminal 2 - all four frontends (from the repo root)
npm run dev
```

| App | URL |
|---|---|
| Public site | http://localhost:3000 |
| Admin | http://localhost:3001 |
| Doctor | http://localhost:3002 |
| Clinic | http://localhost:3003 |
| API health | http://localhost:5000/health |

## 6. OTP

With `OTP_BYPASS=true`, every OTP is **`123456`** and is printed in the backend terminal. No provider call is made.

To use real MSG91 delivery, set `OTP_BYPASS=false` and fill the `MSG91_*` variables. SMS uses `MSG91_SMS_TEMPLATE_ID` with variables `##name##`, `##otp##`, `##detail##`; email templates are created by `node utils/email/syncEmailTemplates.js`.

## Troubleshooting

- **`getaddrinfo ENOTFOUND db.<ref>.supabase.co`** — use the pooler URL above.
- **`self-signed certificate in certificate chain`** — add `uselibpqcompat=true` to `DATABASE_URL`.
- **`Database already has tables`** — rerun with `FORCE=true` or use a new Supabase project.
- **Port already in use** — stop the old process or change `PORT` / the `next dev --port` values.
- **Turnstile widget missing** — set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in the app's `.env.local`.

## Security

- `backend/.env` and `apps/*/.env.local` are gitignored. Never commit them.
- `OTP_BYPASS` and `DEV_MODE` throw if `NODE_ENV=production` or `RENDER=true`.
- Rotate any key that has been shared in chat or logs.
