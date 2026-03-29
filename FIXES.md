# Stackbase — Production Environment Variables (Render + Supabase + Vercel)

## What Was Fixed

### Bug 1: SSL Certificate Error
`self-signed certificate in certificate chain`

Supabase's Transaction Pooler uses a self-signed cert. The raw `pg` pool now has:
```js
ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
```

### Bug 2: Rate Limiter Crash
`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`

Render runs behind a reverse proxy. Added:
```js
app.set('trust proxy', 1);  // BEFORE rate limit middleware
```

### Bug 3: DB Query on Every Auth Request
`prisma.user.findUnique()` was called on every protected route.
When Supabase free tier pool was busy, every request returned 500.

Fixed: JWT payload is now trusted directly — no DB query per request.
The user's id/email/role is already encoded in the signed JWT.

---

## Correct Environment Variables for Render

Set these in Render → Your Service → Environment:

```
# Server
PORT=10000
NODE_ENV=production
CORS_ORIGIN=https://stackbase-navy.vercel.app

# JWT
JWT_SECRET=<generate a long random string — keep it secret>
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10

# Supabase — Transaction Pooler URL (for runtime queries)
# Go to: Supabase Dashboard → Project → Settings → Database → Connection String
# Choose: "Transaction Pooler" mode → copy the URI
# MUST add: ?pgbouncer=true&sslmode=require&connection_limit=1
DATABASE_URL=postgresql://postgres.YOURREF:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=1

# Supabase — Direct Connection URL (used by Prisma migrate only)
# Choose: "Session Pooler" or "Direct" mode
DIRECT_URL=postgresql://postgres.YOURREF:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require

# Deployment (Docker not available on Render free tier — use simulated)
DEPLOY_PROVIDER=local
API_BASE_URL=https://stackbase-backend.onrender.com
CONTAINER_PORT_START=5000
CONTAINER_PORT_END=5999
```

## Critical: DATABASE_URL must have ?pgbouncer=true

The Transaction Pooler (port 6543) REQUIRES `?pgbouncer=true` in the connection string.
Without it, Prisma will try to use prepared statements which pgbouncer doesn't support.

If you use port 5432 (Session Pooler), you don't need pgbouncer=true but it's slower.

## Supabase Connection String Locations

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click Settings → Database
4. Scroll to "Connection String"
5. Select "Transaction" tab for DATABASE_URL (port 6543)
6. Select "Session" tab for DIRECT_URL (port 5432)
7. Click "Copy" and replace [YOUR-PASSWORD] with your actual password

## Vercel Frontend Environment Variables

```
NEXT_PUBLIC_API_URL=https://stackbase-backend.onrender.com
```

## After Deploying

Run Prisma migrations via the Render Shell or locally with DIRECT_URL:
```bash
DATABASE_URL=$DIRECT_URL npx prisma migrate deploy
```

Or add a build command in Render:
```
npm install && npx prisma generate && npx prisma migrate deploy
```
