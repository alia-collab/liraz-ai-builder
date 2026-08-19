# Architecture — Liraz AI Builder

> **Status:** MVP foundation with production-oriented architecture.  
> Brand name, logo, domain, colors, and pricing are configurable via `SystemSetting` — never hardcoded.

## 1. Overview

Liraz AI Builder is a multi-tenant SaaS platform that lets non-technical users create websites and web applications using natural language (Hebrew/English) and a visual drag-and-drop editor.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Client (Browser / PWA)                          │
│  Marketing │ Auth │ Dashboard │ AI Chat │ Visual Editor │ Admin Panel   │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ HTTPS
┌──────────────────────────────────▼──────────────────────────────────────┐
│                      Next.js 15 App Router (Monolith)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌─────────────────┐ │
│  │ API Routes  │  │ Middleware   │  │ i18n (he/en)│  │ Server Actions  │ │
│  └──────┬──────┘  └──────────────┘  └────────────┘  └─────────────────┘ │
│         │                                                                 │
│  ┌──────▼──────────────────────────────────────────────────────────────┐ │
│  │                        Service Layer                                │ │
│  │  Auth │ Billing │ AI Engine │ Projects │ Deploy │ Quotas │ Audit   │ │
│  └──────┬──────────────────────────────────────────────────────────────┘ │
└─────────┼─────────────────────────────────────────────────────────────────┘
          │
    ┌─────┴─────┬────────────┬────────────┬──────────────┐
    │           │            │            │              │
┌───▼───┐  ┌───▼───┐   ┌────▼────┐  ┌────▼────┐   ┌────▼─────┐
│Postgres│  │ Redis │   │ PayPal  │  │ S3/R2   │   │ AI APIs  │
│Prisma  │  │ BullMQ│   │ Webhooks│  │ Storage │   │ OpenAI…  │
└────────┘  └───────┘   └─────────┘  └─────────┘   └──────────┘
```

## 2. Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js 15 + TypeScript | SSR, API routes, App Router, production-ready |
| UI | Tailwind CSS + Radix UI (shadcn pattern) | Accessible, RTL/LTR, dark mode |
| i18n | next-intl | Hebrew RTL + English LTR |
| Database | PostgreSQL + Prisma | Relational integrity, migrations, type safety |
| Auth | NextAuth.js v4 | OAuth (Google/Apple), credentials, MFA hooks |
| Payments | PayPal Checkout + Subscriptions | Recurring monthly/yearly, verified webhooks |
| Queue | BullMQ + Redis | AI jobs, deployments, async tasks |
| Storage | S3-compatible (AWS/R2/MinIO) | Assets, exports, backups |
| AI | Provider abstraction layer | Swap OpenAI/Anthropic/Google without refactor |
| Testing | Vitest + Playwright | Unit/integration + E2E |
| Monitoring | Sentry (optional) + structured logs | Error tracking, metrics |

## 3. Multi-Tenancy & Isolation

Every resource is scoped:

```
User → Organization → Project → Pages/Assets/Deployments
```

- **Row-level isolation:** All queries filter by `organizationId` / `userId`.
- **Project sandbox:** Generated apps run in isolated subdomains; no cross-project DB access.
- **API middleware:** Validates membership role before any mutation.
- **AI context:** Never includes data from other tenants.

## 4. User Roles & Permissions

### Global Roles (platform-wide)

| Role | Capabilities |
|------|-------------|
| Visitor | Marketing pages only |
| Registered User | Create projects (within free/trial limits) |
| Paying Customer | Full subscription features |
| Team Member | Invited to org projects |
| Support Agent | Support panel, time-limited customer access |
| Administrator | Admin panel (RBAC scoped) |
| Super Administrator | Full system control + MFA required |

### Project Roles (per organization)

| Role | Create | Edit | Publish | Delete | Invite | Billing |
|------|--------|------|---------|--------|--------|---------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Editor | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Viewer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## 5. AI Engine Architecture

```
User Prompt (he/en)
       │
       ▼
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Intent Parser│────▶│ Clarification   │────▶│ Project      │
│ (NLU)        │     │ Engine          │     │ Generator    │
└──────────────┘     └─────────────────┘     └──────┬───────┘
                                                    │
                    ┌───────────────────────────────┼────────────────┐
                    │                               │                │
              ┌─────▼─────┐                  ┌──────▼──────┐  ┌─────▼─────┐
              │ Structure │                  │ Design/Theme│  │ Backend   │
              │ (pages)   │                  │ (colors)    │  │ (DB/API)  │
              └───────────┘                  └─────────────┘  └───────────┘
                                                    │
                                              ┌─────▼─────┐
                                              │ Version   │
                                              │ Snapshot  │
                                              └───────────┘
```

### AI Provider Abstraction

```typescript
interface AIProvider {
  name: string;
  generateProject(prompt: string, context: AIContext): Promise<ProjectSnapshot>;
  editProject(snapshot: ProjectSnapshot, instruction: string): Promise<ProjectSnapshot>;
  generateContent(type: ContentType, params: object): Promise<string>;
  validateOutput(output: unknown): ValidationResult;
}
```

Providers: `OpenAIProvider`, `AnthropicProvider`, `GoogleProvider`, `MockProvider` (dev/test).

### Safety Rules

- Never delete/replace without creating a recoverable version first.
- Preview before destructive changes.
- Code sanitization (no eval, no external script injection).
- Rate limiting + quota enforcement per plan.
- Audit every AI request.

## 6. Visual Editor

Component tree stored as JSON in `Page.components`:

```json
{
  "id": "root",
  "type": "Section",
  "props": { "padding": "lg", "background": "#ffffff" },
  "children": [
    { "id": "h1", "type": "Heading", "props": { "text": "ברוכים הבאים", "level": 1 } }
  ]
}
```

Features:
- Drag & drop (react-dnd pattern)
- Undo/redo stack (in-memory + version snapshots)
- Responsive breakpoints (desktop/tablet/mobile)
- RTL/LTR per page
- Auto-save (debounced API calls)
- SEO panel per page

## 7. Billing Flow

```
Register → Trial (configurable days) → Select Plan → PayPal Checkout / Subscriptions
    → Webhook (verified): subscription activated → Update DB → Enable quotas
    → Monthly/Yearly renewal via PayPal
    → Failed payment → grace period → read-only mode → export option
```

Prices stored in `Plan` table + `SystemSetting` — admin can change without deploy.

## 8. Deployment Pipeline

```
Publish Request → Queue Job → Build static/SSR output → Upload to storage
    → Assign subdomain `{slug}.preview.lirazbuilder.app`
    → SSL via Let's Encrypt / Cloudflare
    → Status webhook → Update Deployment record
```

Environments: `DEVELOPMENT`, `PREVIEW`, `PRODUCTION`.

## 9. Security Model

- bcrypt password hashing (cost 12)
- MFA (TOTP) for admins (required) and optional for users
- CSRF tokens on mutations
- CSP headers (configured in next.config)
- Rate limiting (Redis sliding window)
- Input validation (Zod on all API routes)
- File upload scanning (MIME + size limits)
- Secrets in env vars only — never in git
- Audit logs are append-only (`isImmutable: true`)
- Support access: time-limited, customer-approved, minimal permissions

## 10. Admin Panel

Separate route group `(admin)` with:
- Mandatory MFA for admin roles
- RBAC middleware
- No backdoors — Super Admin created via secure CLI seed only
- Full audit trail on every action

## 11. Directory Structure

```
liraz-ai-builder/
├── docs/                    # Architecture, checklists
├── prisma/                  # Schema, migrations, seed
├── public/                  # Static assets
├── src/
│   ├── app/
│   │   ├── (marketing)/     # Landing, pricing, features
│   │   ├── (auth)/          # Login, register, verify
│   │   ├── (dashboard)/     # Customer dashboard
│   │   ├── (admin)/         # Super admin panel
│   │   ├── (legal)/         # Terms, privacy, etc.
│   │   └── api/             # REST API routes
│   ├── components/
│   │   ├── ui/              # shadcn-style primitives
│   │   ├── marketing/
│   │   ├── dashboard/
│   │   ├── editor/
│   │   └── admin/
│   ├── lib/
│   │   ├── ai/              # Provider abstraction
│   │   ├── auth/            # NextAuth config
│   │   ├── payments/        # PayPal REST + webhooks
│   │   ├── db/              # Prisma client
│   │   ├── deploy/          # Deployment engine
│   │   ├── quotas/          # Usage limits
│   │   ├── audit/           # Audit logging
│   │   ├── settings/        # System settings reader
│   │   └── security/        # Rate limit, CSRF, sanitize
│   ├── i18n/                # Translations he/en
│   └── types/               # Shared TypeScript types
├── tests/                   # Vitest + Playwright
├── .env.example
└── README.md
```

## 12. Phased Delivery (this build)

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 1 | Architecture + DB schema | ✅ |
| 2 | Auth + registration + MFA hooks | ✅ |
| 3 | PayPal billing (sandbox) | ✅ (not live until credentials set) |
| 4 | AI project generator (mock + OpenAI ready) | ✅ |
| 5 | Visual editor + preview | ✅ |
| 6 | Publish + subdomain | ✅ |
| 7 | Admin panel | ✅ |
| 8 | Legal docs + tests + README | ✅ |

## 13. What Requires External Setup

See `docs/PRODUCTION_CHECKLIST.md` and `.env.example` for the full list of API keys, domains, and business decisions needed before accepting paying customers.
