# Database Schema Reference — Liraz AI Builder

## Entity Relationship Overview

```
User ──┬── Account (OAuth)
       ├── Session
       ├── Membership ── Organization ── Project ──┬── Page
       │                                            ├── ProjectVersion
       ├── Subscription ── Plan                     ├── Asset
       │       ├── Payment                          ├── Domain
       │       └── Invoice                          └── Deployment
       ├── AIRequest
       ├── UsageRecord
       ├── Notification
       ├── SupportTicket
       └── AuditLog

AdminAction ── User (admin)
SupportAccessRequest ── User (agent + customer)
SystemSetting (key-value, brand/pricing/quotas)
FeatureFlag
Template
AIProviderConfig
Coupon
```

## Key Design Decisions

### Soft Delete
- `User.deletedAt`, `Project.deletedAt` — data retained for export/recovery period.
- Hard delete only after configurable retention via admin job.

### Versioning
- Every AI edit creates a new `ProjectVersion` with full JSON snapshot.
- Rollback = restore snapshot + create new version (never overwrite history).

### Pricing Flexibility
- `Plan.monthlyPriceUsd` / `yearlyPriceUsd` in cents.
- `SystemSetting` keys: `brand.name`, `brand.logo`, `brand.primaryColor`, `pricing.defaultPlan`, etc.
- Admin UI edits these — no code deploy needed.

### Quotas (stored in Plan.quotas JSON)
```json
{
  "projects": 10,
  "deployments": 50,
  "storageMb": 5120,
  "aiRequests": 500,
  "bandwidthGb": 100,
  "teamMembers": 5,
  "domains": 3,
  "versions": 100
}
```

### Subscription Lifecycle
```
TRIALING → ACTIVE → (PAST_DUE → READ_ONLY) → CANCELED
```
- On cancel/end: projects move to `READ_ONLY` for `readOnlyGraceDays` (SystemSetting).
- User can export or resubscribe.

### Audit Log Immutability
- `AuditLog.isImmutable = true` — application layer rejects UPDATE/DELETE.
- Each entry has unique `auditId` for external correlation.

### Support Access
- Requires customer approval (except emergency flag per ToS).
- Time-limited (`expiresAt`).
- Cannot view passwords, payment details, or private keys.
- All actions logged in AuditLog.

## Indexes

All foreign keys indexed. Additional indexes on:
- `User.email`, `User.globalRole`, `User.isBlocked`
- `Project.organizationId`, `Project.status`, `Project.subdomain`
- `Subscription.status`, `Subscription.paypalSubscriptionId`
- `AuditLog.createdAt`, `AuditLog.action`
- `UsageRecord.userId + metric + periodStart`
- `AIRequest.createdAt`

## Seed Data

Run `npm run db:seed` to create:
- Default plan ($35/mo, $420/yr)
- System settings (brand, quotas, trial days)
- Feature flags
- Sample templates
- Super Admin (via env vars only — see README)
