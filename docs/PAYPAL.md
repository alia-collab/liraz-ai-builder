# PayPal platform billing — Liraz AI Builder

Platform subscriptions (Liraz AI Builder itself) are charged through **PayPal Checkout** and **PayPal Subscriptions**. Money goes to the PayPal Business account tied to `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`.

This is **not production-ready** until sandbox credentials, plan IDs, and webhooks are configured and tested. Legal pages remain drafts.

Generated customer sites may still mention Stripe if a store template needs *their* payments. That is separate from platform billing.

## Environment

Copy from `.env.example` (leave secrets empty in git):

| Variable | Purpose |
|----------|---------|
| `PAYPAL_CLIENT_ID` | REST App Client ID |
| `PAYPAL_CLIENT_SECRET` | REST App Secret (never commit) |
| `PAYPAL_MODE` | `sandbox` (default) or `live` |
| `PAYPAL_WEBHOOK_ID` | Webhook ID from PayPal Developer Dashboard |
| `PAYPAL_MONTHLY_PLAN_ID` | Billing plan `P-...` for monthly |
| `PAYPAL_YEARLY_PLAN_ID` | Billing plan `P-...` for 12 months |
| `PAYPAL_PRODUCT_ID` | Optional catalog product `PROD-...` |
| `PAYPAL_BRAND_NAME` | Shown on PayPal checkout |
| `PAYPAL_RETURN_URL` / `PAYPAL_CANCEL_URL` | Optional; default to `/dashboard/billing` |

Plan IDs can also be stored on `Plan` and `SystemSetting` (`billing.paypalMonthlyPlanId` / `billing.paypalYearlyPlanId`) from **Admin → Settings**. Resolution order: Plan row → SystemSetting → env.

## Sandbox setup

1. Create a Business sandbox account and a REST API app: [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Put sandbox Client ID + Secret in `.env` with `PAYPAL_MODE=sandbox`.
3. Create plans (either):
   - `npm.cmd run paypal:setup-plans`
   - Super Admin → Settings → **Create sandbox plans via PayPal API**
   - Or create a Product + two Subscription plans in the dashboard ($35 monthly, $420 yearly / 12 months).
4. Add webhook URL: `https://<public-host>/api/webhooks/paypal`  
   For local tests use a tunnel (ngrok) so PayPal can POST. Copy the webhook ID into `PAYPAL_WEBHOOK_ID`.
5. Subscribe to at least:
   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.REFUNDED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `CUSTOMER.DISPUTE.CREATED`

## Live switch

1. Create a **live** REST app on the same Business account that should receive funds.
2. Recreate (or copy) live Product + Plans — sandbox IDs do not work in live.
3. Set `PAYPAL_MODE=live` and live Client ID, Secret, webhook ID, plan IDs.
4. Point the live webhook to `https://lirazai.com/api/webhooks/paypal`.

## Checkout flow

1. Signed-in user starts monthly or yearly checkout (`POST /api/billing/checkout`).
2. Server creates a PayPal Subscription and a local row with status `PENDING`.
3. User approves on PayPal. Cancel URL does **not** grant access.
4. Return URL shows **pending** until PayPal is verified (webhook signature, or server-side GET of the subscription).
5. Access / `PAYING_CUSTOMER` is granted only after PayPal reports `ACTIVE` (or a verified payment event).

## Webhooks

`POST /api/webhooks/paypal` is CSRF-exempt (middleware) but **must** verify via PayPal `verify-webhook-signature` before mutating state. Events are stored by unique `paypalEventId` (idempotent). Untrusted `PAYPAL-CERT-URL` hosts are rejected.

## Schema

After pulling this change, push Prisma:

```powershell
npm.cmd run db:push
```
