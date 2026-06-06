# Boss Up Stripe + Attendance Admin Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Turn the Boss Up Bootcamp static landing page into a safe $25 paid reservation flow with durable attendee tracking and a password-gated admin dashboard.

**Architecture:** Keep the public site static, but add small Vercel serverless API endpoints for Stripe Checkout, Stripe webhooks, and admin reads. Store paid registrations in Supabase instead of exposing attendee data in frontend JavaScript. The BU logo can be an admin entry point, but security must come from server-side password/auth checks, not from a hidden link.

**Tech Stack:** Vercel static site + Vercel Node API functions, Stripe Checkout + webhook signature verification, Supabase Postgres via service-role key on server only, vanilla HTML/CSS/JS frontend.

---

## Non-negotiable safety rules

- Do not commit Stripe secret keys, webhook secrets, Supabase service-role keys, database passwords, or `.env.local`.
- Frontend may only see public links/config. All attendee records must be fetched through protected server API routes.
- Do not trust `success_url` redirect alone. Only Stripe webhook confirmation creates a paid attendee record.
- Admin dashboard must not embed attendee data in `app/data.js` or `app/index.html`.
- The BU icon may link to `/admin`, but the admin page must still be password gated.

---

## Phase 0: Accounts and secrets needed from Jonti

Before implementation, collect or create these:

- Stripe account access
- Stripe product/price: `Boss Up Bootcamp Seat`, `$25.00`, one-time payment
- Supabase project URL
- Supabase service-role key for server-only Vercel env var
- Supabase anon key only if a later frontend-safe feature needs it
- Admin password or passphrase for the first password gate

Expected Vercel environment variables:

```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_PASSWORD=...
PUBLIC_SITE_URL=https://boss-up-bootcamp.vercel.app
```

---

## Phase 1: Data model

### Task 1: Create Supabase attendee table migration

**Objective:** Define the durable source of truth for paid reservations.

**Files:**
- Create: `supabase/migrations/001_create_attendees.sql`
- Create: `docs/admin-attendance-schema.md`

**SQL draft:**

```sql
create table if not exists public.attendees (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  payment_status text not null default 'pending',
  amount_total integer,
  currency text,
  attendee_name text,
  attendee_email text,
  phone text,
  source text not null default 'stripe_checkout',
  checked_in boolean not null default false,
  notes text
);

create index if not exists attendees_created_at_idx on public.attendees (created_at desc);
create index if not exists attendees_email_idx on public.attendees (lower(attendee_email));
```

**Verification:**
- Apply migration in Supabase SQL editor or with CLI.
- Confirm table exists and contains zero rows.

---

## Phase 2: Server API setup

### Task 2: Add server dependencies and Vercel API routing

**Objective:** Allow the static app to use serverless API functions safely.

**Files:**
- Modify: `package.json`
- Modify: `vercel.json`
- Create directory: `api/`

**Dependencies:**

```bash
npm install stripe @supabase/supabase-js cookie
```

**Vercel config direction:**
- Add `api/**/*.js` handling with `@vercel/node`, or simplify config so Vercel auto-detects API functions while preserving static routes.
- Keep `/api/*` routed to API functions before the catch-all static route.

**Verification:**
- Add temporary `api/health.js` returning `{ ok: true }`.
- Deploy preview and verify `/api/health` returns `200`.
- Remove health endpoint later or keep as non-sensitive smoke check.

---

## Phase 3: Stripe Checkout

### Task 3: Create Checkout Session endpoint

**Objective:** Replace the current anchor-only reservation flow with a server-created Stripe Checkout session.

**Files:**
- Create: `api/create-checkout-session.js`
- Modify: `app/index.html`
- Modify: `app/app.js`
- Modify: `scripts/audit_site.js`

**Endpoint behavior:**

```text
POST /api/create-checkout-session
→ create Stripe Checkout session using STRIPE_PRICE_ID
→ collect customer email/name through Stripe Checkout
→ success_url: /success?session_id={CHECKOUT_SESSION_ID}
→ cancel_url: /#register
→ return { url }
```

**Frontend behavior:**
- `Reserve a Spot` button calls the endpoint.
- On success, set `window.location.href = data.url`.
- On failure, show a friendly message and keep the waitlist section accessible.

**Verification:**
- In Stripe test mode, click Reserve a Spot.
- Confirm Stripe Checkout opens for `$25`.
- Cancel returns to Boss Up page.

---

## Phase 4: Stripe webhook to Supabase

### Task 4: Add webhook endpoint

**Objective:** Save paid attendees only after Stripe confirms payment.

**Files:**
- Create: `api/stripe-webhook.js`
- Create: `api/_supabase.js`
- Modify: `vercel.json` if raw-body handling requires function config
- Modify: `docs/admin-attendance-schema.md`

**Webhook behavior:**
- Verify `stripe-signature` with `STRIPE_WEBHOOK_SECRET`.
- Handle `checkout.session.completed`.
- Upsert attendee by `stripe_checkout_session_id`.
- Save name/email/payment status/amount/currency/customer/payment intent.

**Verification:**
- Use Stripe CLI locally if available:

```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
stripe trigger checkout.session.completed
```

- Or verify through Stripe dashboard webhook event logs after deploy.
- Confirm Supabase row is created only for completed checkout.

---

## Phase 5: Confirmation page

### Task 5: Add success/confirmation page

**Objective:** Give paid users a clean confirmation screen after checkout.

**Files:**
- Create: `app/success.html`
- Modify: `vercel.json` route for `/success`
- Modify: `scripts/audit_site.js`

**Content:**
- Thank you / seat reserved message
- Explain they will receive follow-up details
- Link back to home
- Optional contact note

**Verification:**
- Stripe test payment redirects to `/success?session_id=...`.
- Page loads on production alias.

---

## Phase 6: Admin gate and dashboard

### Task 6: Add admin entry point from BU logo

**Objective:** Make admin discoverable for us without exposing data.

**Files:**
- Modify: `app/index.html`
- Create: `app/admin.html`
- Modify: `vercel.json` route for `/admin`

**Behavior:**
- BU logo remains visually normal but links to `/admin`.
- `/admin` shows password form first.
- No attendee data is embedded in the page.

**Verification:**
- Clicking BU logo opens `/admin`.
- `/admin` shows only password form when logged out.

### Task 7: Add admin login endpoint

**Objective:** Gate admin API access server-side.

**Files:**
- Create: `api/admin-login.js`
- Create: `api/admin-attendees.js`
- Create: `api/admin-logout.js`

**Behavior:**
- `POST /api/admin-login` compares submitted password to `ADMIN_PASSWORD`.
- On success, set `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- `GET /api/admin-attendees` checks cookie before reading Supabase.
- Return attendee summary and rows only when authorized.

**Verification:**
- Wrong password returns `401` and no data.
- Right password returns attendee list.
- Browser devtools should not show attendee data before login.

### Task 8: Render admin dashboard

**Objective:** Let admins monitor reservations.

**Files:**
- Create: `app/admin.js`
- Modify: `app/admin.html`
- Modify: `app/styles.css`
- Modify: `scripts/audit_site.js`

**Dashboard should show:**
- Paid count
- Seat limit: 20
- Seats remaining
- Revenue estimate: paid count × $25
- Attendee list: name, email, paid date, payment status
- Optional check-in status placeholder

**Verification:**
- With test attendees, dashboard counts correctly.
- Admin page is usable on phone.

---

## Phase 7: Seat limit protection

### Task 9: Prevent overselling after 20 paid seats

**Objective:** Stop new checkout sessions after the cap is reached.

**Files:**
- Modify: `api/create-checkout-session.js`
- Modify: `app/app.js`
- Modify: `scripts/audit_site.js`

**Behavior:**
- Before creating checkout, count paid attendees.
- If `>= 20`, return `409` with a sold-out message.
- Frontend displays sold-out message instead of opening Stripe.

**Verification:**
- Seed/count 20 paid rows in test DB.
- Checkout endpoint returns `409`.
- Button shows user-friendly sold-out message.

---

## Phase 8: Final production verification

### Task 10: End-to-end smoke test

**Objective:** Verify the full flow before announcing.

**Checklist:**

```text
Public site loads
Reserve a Spot opens Stripe Checkout
Stripe payment succeeds in test mode
Success page loads
Supabase attendee row is created
Admin page rejects bad password
Admin page accepts correct password
Admin dashboard shows new attendee
Seat count and remaining seats are correct
No secrets are committed
Vercel env vars are present
Stripe webhook dashboard shows 2xx responses
```

**Commands:**

```bash
npm run audit
node --check app/app.js
node --check app/data.js
node --check api/create-checkout-session.js
node --check api/stripe-webhook.js
node --check api/admin-login.js
node --check api/admin-attendees.js
git status --short
```

---

## Recommended execution order

1. Create Supabase table.
2. Add API routing and health check.
3. Add Stripe Checkout endpoint and wire Reserve a Spot.
4. Add success page.
5. Add webhook and attendee writes.
6. Add admin password gate.
7. Add dashboard.
8. Add 20-seat limit guard.
9. Test with Stripe test mode.
10. Switch Stripe env vars from test to live only after test flow passes.

---

## Open decisions for Jonti

- Use Stripe Payment Link first, or full Checkout Session endpoint immediately? Recommended: full Checkout Session because it supports seat limit and webhook flow cleanly.
- Admin password only for v1, or Supabase Auth login? Recommended: password gate v1, Supabase Auth later.
- Collect only name/email, or also phone? Recommended: name/email required, phone optional.
- Should attendees receive automatic email confirmation from Stripe only, or custom email later? Recommended: Stripe receipt now, custom email later.
