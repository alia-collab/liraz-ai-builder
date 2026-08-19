# Deploy lirazai.com (Squarespace DNS + Vercel)

Hebrew-friendly English. The app is **not live on the domain** until you point DNS and Vercel verifies it.

**Hard rules**

- Registrar: **Squarespace**. There is **no** Squarespace website. Do **not** create/publish a Squarespace site. Do **not** use “Connect domain to Squarespace”.
- **Email already works.** Never touch, replace, delete, or overwrite **MX** or **TXT** (SPF / DKIM / DMARC). Website DNS is **A + CNAME only**.
- Do **not** change nameservers to Vercel (that would move email DNS too).
- Canonical host: **`lirazai.com`**. **`www.lirazai.com` → `https://lirazai.com`** (308).

---

## Why DNS is failing right now (checked 19 Aug 2026)

Live records (nameservers stay at Squarespace — that part is correct):

| Record | Current | Problem |
|--------|---------|---------|
| Nameservers | `nsc1`–`nsc4.squarespacedns.com` | Keep these. Do **not** switch to Vercel. |
| `lirazai.com` **A** | `216.24.57.1` (**Render**, not Vercel) | Vercel will never verify while this IP stays. |
| `www.lirazai.com` | **does not exist** | Add the `www` CNAME. |
| MX | `smtp.google.com` | Leave it. This is Gmail / Google Workspace. |
| TXT | `v=spf1 include:_spf.google.com ~all` | Leave it. Do not edit this row. |

**Fix:** delete the Render A record and any **Squarespace Defaults** website rows, then add only the two Vercel rows below. Email rows stay.

Official Squarespace rule: the domain **cannot** point to another host while **Squarespace Defaults** exist. Trash that whole block (website A/CNAME only). It does **not** delete Google MX/TXT.

---

## Domain map

| Host | Role | Now? |
|------|------|------|
| `lirazai.com` | Marketing + app (login, dashboard, admin) | **Yes — today** |
| `www.lirazai.com` | Redirect to apex | **Yes — today** |
| `{slug}.preview.lirazai.com` | Published customer sites | **Later** — extra A/CNAME on a subdomain, still never MX/TXT |

Session cookies are **host-only** on `lirazai.com` so they will not leak to preview hosts later.

---

## Exact Squarespace DNS (A + CNAME only)

Official Vercel values ([custom domain](https://vercel.com/docs/domains/set-up-custom-domain), [A record](https://vercel.com/kb/guide/a-record-and-caa-with-vercel)):

| Type | Host / Name | Data / Points to | TTL |
|------|-------------|------------------|-----|
| **A** | `@` (or blank) | `76.76.21.21` | 300 or Auto |
| **CNAME** | `www` | `cname.vercel-dns-0.com` | 300 or Auto |

After you add the domain in Vercel, open **Settings → Domains** and **copy the domain card** if it shows a different A IP (some projects use e.g. `216.198.79.1`) or a unique CNAME (e.g. `xxxx.vercel-dns-017.com`). The card wins over this table.

**Do this in Squarespace** ([official pointing guide](https://support.squarespace.com/hc/en-us/articles/215744668-Pointing-a-Squarespace-domain))

1. Open [account.squarespace.com](https://account.squarespace.com) → **Domains** → `lirazai.com` → **DNS** → **DNS Settings**.
2. **Squarespace Defaults** (the website block): click the **red trash can** on the whole block, confirm + password/2FA. This only removes Squarespace website A/CNAME. It does not remove Google mail.
3. Under **Custom records**, **delete** any existing **A** with host `@` that is **not** Vercel — including `216.24.57.1` (Render) and `198.185.159.*` / `198.49.23.*` (Squarespace parking).
4. **Add Record** → Type **A** → Host **`@`** (not `lirazai.com`) → Data **`76.76.21.21`** (or the IP on the Vercel domain card) → **Save**.
5. **Add Record** → Type **CNAME** → Host **`www`** (not `www.lirazai.com`) → Data **`cname.vercel-dns-0.com`** (or the CNAME on the Vercel card; no `https://`) → **Save**.
6. **Leave MX, TXT, SPF, DKIM, DMARC, Google Workspace rows exactly as they are.** Do not change nameservers.

Squarespace Host field auto-appends `.lirazai.com`. If you type the full domain you get `lirazai.com.lirazai.com` and the record will fail.

**Do not**

- Create a Squarespace site or click website-connect.
- Edit MX or existing TXT (including Google SPF).
- Add AAAA for the apex.
- Change nameservers.
- Leave more than **one** A record on `@` (Vercel verification fails if leftover IPs remain).

If Vercel later asks for a **new** `_vercel` TXT (only when another Vercel account already claimed the domain): add a **new** row with host `_vercel` — do **not** edit existing SPF/DKIM/DMARC TXT. If you are unsure, stop and keep mail intact.

---

## What to click / paste today

### A. Vercel — add domains + env (you must be logged in)

Dashboard: **Project → Settings → Domains**

- Add `lirazai.com`
- Add `www.lirazai.com`
- Set redirect: **www → lirazai.com** (repo `vercel.json` already does this too)

Dashboard: **Project → Settings → Environment Variables** (Production):

```
NEXT_PUBLIC_APP_URL=https://lirazai.com
NEXTAUTH_URL=https://lirazai.com
PLATFORM_DOMAIN=lirazai.com
DEPLOY_BASE_DOMAIN=preview.lirazai.com
CORS_ALLOWED_ORIGINS=https://lirazai.com,https://www.lirazai.com
```

Also set the usual secrets there (`DATABASE_URL`, `NEXTAUTH_SECRET`, …). Local `.env` stays on `http://localhost:3000` for this Windows machine.

If the Vercel CLI is installed and logged in (from this repo):

```powershell
cd C:\Users\LIRAZ\Projects\liraz-ai-builder
npx.cmd vercel login
npx.cmd vercel link
npx.cmd vercel domains add lirazai.com
npx.cmd vercel domains add www.lirazai.com
npx.cmd vercel domains inspect lirazai.com
```

`vercel dns add` is **not** used here — Squarespace holds DNS, not Vercel nameservers.

Redeploy after env changes.

### B. Squarespace — paste the two website records

See the table above. Save. Wait.

### C. SSL

Vercel issues Let's Encrypt after DNS is valid. Usually **a few minutes**; can take **up to ~1 hour** (rarely longer). Until then HTTPS may fail. Do not claim the site is live until `https://lirazai.com` loads.

### D. Optional after DNS is green

- Google OAuth redirect: `https://lirazai.com/api/auth/callback/google`
- Payment webhooks: `https://lirazai.com/api/webhooks/paypal` (PayPal Developer Dashboard — see `docs/PAYPAL.md`)

---

## Preview / published customer sites (later — not today)

App-generated sites are designed as `{slug}.preview.lirazai.com` (`DEPLOY_BASE_DOMAIN`).

**Later DNS (still never MX/TXT):** a CNAME (or A) for host `preview` or `*.preview` → the target Vercel shows. Do **not** switch nameservers for a wildcard.

Skip this until the main app is live on `lirazai.com`.

---

## Email (do not change)

MX + TXT (SPF/DKIM/DMARC) stay as they are. Connecting the website via A + CNAME does not replace mail. If mail breaks, you edited the wrong records — revert only A/CNAME, not MX/TXT.

---

## Checklist

- [ ] Vercel project deployed (even on `*.vercel.app` first)
- [ ] Production env vars set (URLs above + secrets)
- [ ] `lirazai.com` and `www.lirazai.com` added in Vercel Domains
- [ ] Squarespace Defaults website block deleted (trash can)
- [ ] Old A `@` → `216.24.57.1` (Render) deleted
- [ ] Squarespace: **only one** A `@` → `76.76.21.21` (or domain-card IP)
- [ ] Squarespace: CNAME `www` → `cname.vercel-dns-0.com` (or domain-card target)
- [ ] MX / TXT untouched
- [ ] Vercel domain card = Valid Configuration
- [ ] SSL issued
- [ ] `https://lirazai.com` loads
- [ ] `https://www.lirazai.com` redirects to apex
- [ ] Login works (NEXTAUTH_URL = `https://lirazai.com`)

**Cannot be done from this repo:** logging into Squarespace or Vercel for you, changing live DNS, or proving the domain is live before those two accounts are updated.
