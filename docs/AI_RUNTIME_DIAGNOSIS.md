# AI Runtime Diagnosis — Why generated “apps” were only screens

> Restore point: existing Next.js 15 + Prisma + PostgreSQL stack is kept. Generated sites remain JSON snapshots, not a second git repo. The upgrade adds a real **runtime** (leads API + preview router + QA) on that snapshot.

## Can the AI write files?

**No — not to a per-project filesystem.**  
(and Anthropic Claude when `ANTHROPIC_API_KEY` is set) returns a `ProjectSnapshot`. `createProjectFromSnapshot()` writes:

- `Project` row
- `Page.components` JSON
- `ProjectVersion.snapshot` JSON

There is no `fs.writeFile` into an isolated app folder, no generated `package.json`, no per-tenant Next.js app.

## Can it run commands / migrations for generated apps?

**No.** There is no sandbox, no `prisma migrate` per customer project, no shell for generated code. The platform DB is shared PostgreSQL. Generated “tables” in `snapshot.backend.tables` were documentation only.

## Isolated runtime per generated project?

**Partial, now being completed.**  
Tenant isolation exists for **platform** data (`organizationId` filters). Generated apps had **no** isolated process, env, or database. Isolation for leads/forms is row-level: `ProjectLead.projectId`.

## Real preview?

**Previously no.** Editor rendered JSON in-place. Publish assigned a URL string (`{slug}.{DEPLOY_BASE_DOMAIN}`) without serving pages. Navigation used `#contact` hashes. Refresh on a “page” was not a real route.

## Errors fed back to the AI?

**No.** Failed generate/edit stored `AIRequest.errorMessage` for humans. There was no QA report → fixer loop, no console/API error ingest.

## Multi-step tasks + project memory?

**No.** One-shot `generateProject(prompt)`. Edits received the last snapshot only if `/api/ai/edit` loaded `ProjectVersion` — **no** spec, protected regions, or changelog in memory. `Project.settings` held theme colors only.

## Does AI receive existing code before edits?

**Partially.** `/api/ai/edit` loads the latest `ProjectVersion.snapshot` (JSON components), not source files. Regex `applyEdit()` then often only changed colors or appended a products page — ignoring the user’s actual request and the rest of the spec.

## QA / fixer agent?

**No.** Success was “JSON was saved.” Forms used `type="button"` and did not POST. Build was marked complete without link checks.

## Does the current prompt/pipeline only produce UI?

**Yes — that is the root cause.**


| Layer     | What it did                                |
| --------- | ------------------------------------------ |
| Planner   | Missing — prompt went straight to template |
| Spec      | Missing                                    |
| Blueprint | Generic Hero / Features / ContactForm      |
| Data      | `backend.tables` unused                    |
| Runtime   | None                                       |
| QA        | None                                       |


Without `ANTHROPIC_API_KEY`, AI routes fail with a clear configuration error (no local/fake fallback).

### ContactForm (broken)

```tsx
<button type="button">  // never submits
```

No `action`, no `projectId`, no API.

### Navigation (broken)

CTA `ctaLink: "#contact"` — not a page slug.

## What we will change (upgrade, not rewrite)

1. **Planner** → `BuildSpec` before any pages are created.
2. **Memory** in `Project.settings` (`spec`, changelog, protected, tasks).
3. **Blueprint from spec** (technician + WhatsApp → services, booking, wa.me, admin leads).
4. `ProjectLead` **+** `/api/runtime/leads`.
5. **Preview routes** `/preview/[projectId]/[pageSlug]`.
6. **QA gate** — build not complete if dead links / inert buttons.
7. **Surgical edits** using memory + version + rollback.
8. **Checkout** keeps `callbackUrl` / JWT; no fake PayPal success.

Still **not** a per-project VM or generated git repo. That remains a later isolation milestone.