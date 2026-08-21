# Liraz AI Builder

AI-powered website builder for non-technical users. Describe your site in Hebrew or English — AI handles design, content, and publishing.

> **Note:** This project is under active development and is not production-ready.

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 20+ |
| npm | 10+ |
| PostgreSQL | 14+ |
| Git | optional (recommended) |
| Redis | optional (queues/rate limiting) |

## Quick Start

```bash
# 1. Clone or open the project
cd liraz-ai-builder

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL, NEXTAUTH_SECRET, and SUPER_ADMIN_* (see below)

# 3. Install & initialize database
npm install
npm run db:push
npm run db:seed

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### First login (super admin)

Set these in `.env` before seeding:

```env
SUPER_ADMIN_EMAIL=you@example.com
SUPER_ADMIN_PASSWORD=your-strong-password-min-12-chars
SUPER_ADMIN_NAME="Super Admin"
```

Then run `npm run db:seed`. Log in at `/login` with those credentials. You can access `/admin` as a super administrator.

> Remove `SUPER_ADMIN_PASSWORD` from `.env` after first login.

## AI Provider Setup

This platform uses **Anthropic Claude only**.

```env
AI_DEFAULT_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

Without `ANTHROPIC_API_KEY`, AI routes return an error. There is no mock or OpenAI fallback.

Claude is used for:

- **Project generation** — create full site structure from a natural language prompt
- **Project editing** — modify existing projects via chat instructions (versioned before destructive edits)
- **Design refinement** — colors, fonts, and naming

All AI output passes through `sanitizeProjectOutput()`.

After seeding, visit `/admin/ai` to see the Anthropic provider config.

## PayPal (Billing)

Platform subscriptions are charged with **PayPal Checkout** and **PayPal Subscriptions** (not Stripe). Configure sandbox first:

```env
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=
PAYPAL_MONTHLY_PLAN_ID=
PAYPAL_YEARLY_PLAN_ID=
```

- Checkout: `/dashboard/billing` → `POST /api/billing/checkout`
- Cancel: `POST /api/billing/portal`
- Confirm after return: `POST /api/billing/confirm` (server talks to PayPal; the return URL alone does not grant access)
- Webhooks: `POST /api/webhooks/paypal` (signature verified before any subscription change)

Create sandbox plans:

```powershell
npm.cmd run paypal:setup-plans
```

Or use Super Admin → Settings. Full steps: [`docs/PAYPAL.md`](docs/PAYPAL.md).

Do not claim production-ready PayPal until sandbox credentials, plan IDs, and the webhook ID are configured and tested. Switch to live with `PAYPAL_MODE=live` and **live** Client ID / Secret / plan IDs / webhook ID.

Without PayPal keys, billing pages render but checkout is disabled with a clear message.

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Local: `http://localhost:3000`. Vercel Production: `https://lirazai.com` |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as `NEXTAUTH_URL` |
| `PLATFORM_DOMAIN` | No | `lirazai.com` |
| `AI_DEFAULT_PROVIDER` | No | Default: `anthropic` |
| `ANTHROPIC_API_KEY` | For Claude | Anthropic API key |
| `PAYPAL_CLIENT_ID` | For billing | PayPal REST Client ID (sandbox, then live) |
| `PAYPAL_CLIENT_SECRET` | For billing | PayPal REST secret (never commit) |
| `PAYPAL_WEBHOOK_ID` | For billing | PayPal webhook ID for signature verify |
| `PAYPAL_MONTHLY_PLAN_ID` / `PAYPAL_YEARLY_PLAN_ID` | For billing | Subscription plan IDs (`P-...`) |
| `SUPER_ADMIN_EMAIL` | Seed only | Bootstrap super admin |
| `SUPER_ADMIN_PASSWORD` | Seed only | Bootstrap super admin password |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed plans, settings, AI providers, templates, super admin |
| `npm run db:studio` | Open Prisma Studio |
| `npm.cmd run paypal:setup-plans` | Create PayPal sandbox product + monthly/yearly plans |
| `npm run typecheck` | TypeScript check |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |

## Architecture

- **Next.js 15** App Router with route groups: `(marketing)`, `(auth)`, `(dashboard)`, `(editor)`, `(admin)`
- **Prisma** + PostgreSQL for data
- **NextAuth** for authentication
- **next-intl** for Hebrew RTL / English LTR
- **Tailwind CSS** + shadcn-style components

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for details.

## Production domain (`lirazai.com`)

Canonical URL is **https://lirazai.com**. `www.lirazai.com` redirects to the apex.

- Registrar is **Squarespace DNS only** (no Squarespace website). Website records are **A + CNAME**. **Do not change MX or TXT** — email already works.
- Local `.env` stays on `http://localhost:3000`. Set production URLs in **Vercel Environment Variables**.
- Full Squarespace + Vercel checklist: [`docs/DEPLOY-lirazai.com.md`](docs/DEPLOY-lirazai.com.md)

## Known Limitations

- **Not production-ready** — MFA, email verification, Redis queues, and S3 storage are scaffolded but not fully wired
- **Google AI provider** — planned, not yet implemented
- **Deployment pipeline** — publish creates preview URLs; real CDN/hosting integration is stubbed
- **Team collaboration** — UI exists; invite flows are partial
- **Visual editor** — undo/redo and component tree are basic; drag-and-drop not implemented
- **Rate limiting** — configured via env but requires Redis for enforcement
- **Maintenance mode** — set `FEATURE_MAINTENANCE_MODE=true` to show 500 page for non-admin routes

## License

Private — All rights reserved.
