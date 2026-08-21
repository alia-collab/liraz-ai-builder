# Production Checklist — Liraz AI Builder

Use this checklist before accepting paying customers.

## Infrastructure

- [ ] Node.js 20+ installed on production servers
- [ ] PostgreSQL provisioned with automated daily backups
- [ ] Redis provisioned (queues, rate limiting)
- [ ] S3-compatible storage configured
- [ ] CDN configured for static assets and published sites
- [ ] SSL/TLS certificates for main domain and preview subdomains
- [ ] Separate staging and production environments
- [ ] Secrets stored in vault (not in git or plain env files on disk)

## Environment Variables

- [ ] `NEXTAUTH_SECRET` — unique, 32+ bytes random
- [ ] `ENCRYPTION_KEY` — for MFA secrets
- [ ] `DATABASE_URL` — production PostgreSQL with SSL
- [ ] `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` — **live** app (not sandbox)
- [ ] `PAYPAL_MODE=live`
- [ ] `PAYPAL_WEBHOOK_ID` — production webhook endpoint
- [ ] `PAYPAL_MONTHLY_PLAN_ID` / `PAYPAL_YEARLY_PLAN_ID` — live plans
- [ ] `ANTHROPIC_API_KEY` (Claude)
- [ ] `S3_*` — production bucket with restricted IAM
- [ ] `SMTP_*` — transactional email provider
- [ ] `DEPLOY_BASE_DOMAIN` — `preview.lirazai.com` (wildcard DNS later)
- [ ] `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` — `https://lirazai.com` in Vercel Production
- [ ] `CORS_ALLOWED_ORIGINS` — `https://lirazai.com,https://www.lirazai.com`
- [ ] `SENTRY_DSN` — error tracking (recommended)
- [ ] Remove `SUPER_ADMIN_PASSWORD` from env after bootstrap

## Security

- [ ] Super Admin MFA enabled
- [ ] All admin accounts have MFA
- [ ] Rate limiting active (Redis-backed)
- [ ] CSRF protection verified on mutations
- [ ] CSP headers reviewed for production
- [ ] Dependency audit: `npm audit`
- [ ] Penetration test completed
- [ ] Audit logs verified as append-only
- [ ] Support access flow tested (customer approval required)
- [ ] No hardcoded secrets in codebase (`grep -r sk_live`, `grep -r api_key`)

## Legal & Compliance

- [ ] Terms of Service reviewed by attorney
- [ ] Privacy Policy reviewed by attorney
- [ ] Refund Policy reviewed by attorney
- [ ] Cookie Policy + consent banner compliant with local law
- [ ] DPA available for business customers
- [ ] GDPR/CCPA data export and deletion flows tested

## Billing

- [ ] PayPal live REST app created on the Business account that receives funds
- [ ] Live product + monthly ($35) and yearly ($420 / 12 months) plans created
- [ ] Webhook endpoint registered (`/api/webhooks/paypal`) and signature verify tested
- [ ] Trial period configured in Plan + matching PayPal plan cycles
- [ ] Failed payment flow tested
- [ ] Cancellation → read-only grace period tested
- [ ] Invoice/receipt emails working (PayPal notifications)
- [ ] Tax handling reviewed for your jurisdiction (PayPal does not replace legal tax advice)

## Functional Testing

Run all tests with Node.js installed:

```bash
npm test
npm run test:e2e
npm run typecheck
npm run build
```

Manual acceptance tests:

- [ ] Registration (email + password)
- [ ] Login (credentials + Google OAuth if enabled)
- [ ] Password reset email flow
- [ ] AI project generation (Hebrew + English prompts)
- [ ] Visual editor + AI chat edits
- [ ] Publish to subdomain
- [ ] Custom domain connection
- [ ] Version rollback
- [ ] Monthly + yearly subscription purchase (PayPal sandbox → live)
- [ ] Webhook: subscription created/updated/deleted
- [ ] User isolation (User A cannot see User B projects)
- [ ] All RBAC roles (Owner/Admin/Editor/Viewer)
- [ ] Admin panel access (MFA required)
- [ ] Audit log entries for sensitive actions
- [ ] Mobile responsive + RTL Hebrew
- [ ] Accessibility spot check (keyboard nav, contrast)

## Monitoring & Operations

- [ ] Error tracking (Sentry) configured
- [ ] Uptime monitoring on main app + API
- [ ] Log aggregation (structured JSON logs)
- [ ] AI cost alerts (daily spend threshold)
- [ ] Database connection pool sized correctly
- [ ] Backup restore tested successfully
- [ ] Disaster recovery runbook documented
- [ ] On-call rotation defined

## Business Decisions Needed

| Item | Status | Notes |
|------|--------|-------|
| Production domain | **Chosen** | `lirazai.com` (www redirects to apex) |
| Brand name final | Configurable | Via admin SystemSettings |
| Pricing confirmation | Configurable | Default $35/mo, $420/yr |
| Trial length | Configurable | Default 14 days |
| Support email | **Required** | e.g., `support@yourdomain.com` |
| Company legal entity | **Required** | For Terms & PayPal |
| Tax jurisdiction | **Required** | For invoices / tax |
| AI provider | Anthropic Claude only | Set `ANTHROPIC_API_KEY` |
| Hosting provider | **Required** | Vercel/Railway/AWS |
| Email provider | **Required** | SendGrid/Resend/SES |

## Estimated Monthly Operating Costs (approximate)

| Service | Est. Cost |
|---------|-----------|
| Hosting (Vercel Pro) | $20–50 |
| PostgreSQL (Neon/RDS) | $25–100 |
| Redis (Upstash) | $10–30 |
| S3 + CDN | $10–50 |
| PayPal fees | See current PayPal Business rates |
| Anthropic Claude API | $50–500+ (usage dependent) |
| Email (SendGrid) | $15–50 |
| Domain + SSL | $15/year |
| Monitoring (Sentry) | $0–26 |
| **Total baseline** | **~$150–400/mo** + transaction fees + AI usage |

## Post-Launch

- [ ] Remove seed Super Admin password from all env files
- [ ] Enable maintenance mode feature flag for updates
- [ ] Set up status page
- [ ] Configure automated CI/CD with test gate
- [ ] Schedule weekly backup verification
- [ ] Review AI usage costs weekly

---

**Do not claim production-ready until every critical item above is checked.**
