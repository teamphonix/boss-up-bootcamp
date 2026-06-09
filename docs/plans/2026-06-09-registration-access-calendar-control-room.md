# Registration Access + Calendar Control Room Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Turn the polished Boss Up Bootcamp public site into a working reservation, attendee-access, scheduling, and admin control-room system.

**Architecture:** Keep the public marketing/portfolio site static and fast, then add Vercel serverless API endpoints for secure actions. Use Supabase as the durable backend for registrations, attendees, sessions/events, calendar settings, and admin state. Add Stripe Checkout for paid registration and a mobile-first admin control room for Jonti to see reservations, manage seats, check people in, and control the bootcamp calendar.

**Tech Stack:** Vercel static site + Vercel Node API functions, Supabase Postgres/Auth/Storage as needed, Stripe Checkout + webhooks, vanilla HTML/CSS/JS v1. Optional later upgrade: Google Calendar sync.

---

## Product scope

### Public visitor flow

1. Visitor lands on Boss Up Bootcamp.
2. Visitor taps `Reserve a Spot`.
3. Visitor completes registration/payment.
4. Visitor reaches confirmation page.
5. Attendee receives Stripe receipt now; custom confirmation email can be added later.
6. Seat count updates server-side so the site can prevent overselling.

### Admin/control-room flow

1. Jonti opens `/admin` or taps the BU logo entry point.
2. Admin logs in through a server-protected gate.
3. Dashboard shows:
   - Paid reservations
   - Seat cap and seats remaining
   - Revenue snapshot
   - Attendee list
   - Check-in status
   - Notes/contact info
4. Calendar control room shows:
   - Upcoming bootcamp dates/sessions
   - Capacity per event
   - Published/unpublished state
   - Attendee roster by event
   - Basic add/edit/delete controls
5. Admin can mark people checked in and update notes from phone.

---

## Data model

### Task 1: Create Supabase schema for events and registrations

**Objective:** Define the core tables for bootcamp events, paid registrations, and admin-managed status.

**Files:**
- Create: `supabase/migrations/001_create_bootcamp_core.sql`
- Create: `docs/registration-calendar-schema.md`

**SQL draft:**

```sql
create table if not exists public.bootcamp_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/New_York',
  location text,
  seat_limit integer not null default 20,
  price_cents integer not null default 2500,
  currency text not null default 'usd',
  is_published boolean not null default false,
  notes text
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event_id uuid references public.bootcamp_events(id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  payment_status text not null default 'pending',
  amount_total integer,
  currency text,
  attendee_name text,
  attendee_email text,
  attendee_phone text,
  checked_in boolean not null default false,
  admin_notes text,
  source text not null default 'stripe_checkout'
);

create index if not exists bootcamp_events_starts_at_idx on public.bootcamp_events (starts_at asc);
create index if not exists registrations_event_id_idx on public.registrations (event_id);
create index if not exists registrations_created_at_idx on public.registrations (created_at desc);
create index if not exists registrations_email_idx on public.registrations (lower(attendee_email));
```

**Verification:**
- Apply migration in Supabase SQL editor or CLI.
- Confirm both tables exist.
- Confirm no service-role key is exposed in frontend files.

---

## API foundation

### Task 2: Add serverless API setup

**Objective:** Allow secure backend actions while keeping the public site static.

**Files:**
- Modify: `package.json`
- Modify: `vercel.json`
- Create: `api/health.js`
- Create: `api/_supabase.js`
- Create: `api/_auth.js`

**Dependencies:**

```bash
npm install @supabase/supabase-js stripe cookie
```

**Required Vercel env vars:**

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
ADMIN_PASSWORD=
PUBLIC_SITE_URL=https://boss-up-bootcamp.vercel.app
```

**Verification:**
- `GET /api/health` returns `{ "ok": true }`.
- `node --check api/health.js` passes.
- Production `/api/health` works after deploy.

---

## Registration + payment

### Task 3: Create checkout session endpoint

**Objective:** Make `Reserve a Spot` open real Stripe Checkout for the selected bootcamp event.

**Files:**
- Create: `api/create-checkout-session.js`
- Modify: `app/index.html`
- Modify: `app/app.js`
- Modify: `scripts/audit_site.js`

**Behavior:**
- Endpoint checks the current published bootcamp event.
- Endpoint counts paid registrations for that event.
- If seats are available, create Stripe Checkout session.
- If sold out, return `409` with a clear message.
- Frontend redirects to Stripe Checkout URL.

**Verification:**
- Reserve button opens Stripe test checkout.
- Cancel returns to `/#register`.
- Sold-out response does not open checkout.

### Task 4: Add Stripe webhook

**Objective:** Create/update registration records only when Stripe confirms payment.

**Files:**
- Create: `api/stripe-webhook.js`
- Modify: `docs/registration-calendar-schema.md`

**Behavior:**
- Verify `stripe-signature`.
- Handle `checkout.session.completed`.
- Upsert by `stripe_checkout_session_id`.
- Save name, email, payment status, amount, currency, customer, payment intent, and event ID.

**Verification:**
- Stripe test checkout creates a Supabase row.
- Duplicate webhook event does not create duplicate attendee.
- Invalid signature returns failure.

### Task 5: Add success page

**Objective:** Give paid attendees a clean confirmation experience.

**Files:**
- Create: `app/success.html`
- Modify: `vercel.json`
- Modify: `scripts/audit_site.js`

**Content:**
- Seat reserved message.
- What happens next.
- Link back to home.
- Contact/help note.

**Verification:**
- `/success?session_id=...` loads on production.

---

## Admin access

### Task 6: Add admin login and session cookie

**Objective:** Protect the control room server-side.

**Files:**
- Create: `api/admin-login.js`
- Create: `api/admin-logout.js`
- Create: `api/admin-session.js`
- Create: `app/admin.html`
- Create: `app/admin.js`
- Modify: `app/styles.css`

**Behavior:**
- Wrong password returns `401`.
- Correct password sets `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- Admin page never embeds registration data before login.

**Verification:**
- Logged-out `/admin` shows password form only.
- Wrong password shows friendly error.
- Correct password unlocks dashboard shell.

---

## Control room dashboard

### Task 7: Add admin registration API

**Objective:** Let admin view attendee data securely.

**Files:**
- Create: `api/admin-registrations.js`
- Create: `api/admin-registration-update.js`
- Modify: `app/admin.js`

**Behavior:**
- `GET /api/admin-registrations` returns summary + rows only if authorized.
- `PATCH /api/admin-registration-update` updates check-in status and admin notes.
- Dashboard calculates paid count, seats remaining, and revenue.

**Verification:**
- Logged-out request returns `401`.
- Logged-in request returns rows.
- Check-in toggle persists in Supabase.

### Task 8: Build mobile-first dashboard UI

**Objective:** Make the admin view usable from Jonti’s phone.

**Files:**
- Modify: `app/admin.html`
- Modify: `app/admin.js`
- Modify: `app/styles.css`

**UI sections:**
- Top stats cards: paid, remaining, revenue, check-ins.
- Search/filter field for attendee name/email.
- Attendee cards instead of desktop-only table.
- Buttons: check in, add note, logout.

**Verification:**
- Dashboard works at phone width.
- No horizontal scrolling needed for core admin tasks.

---

## Calendar control room

### Task 9: Add admin event/calendar API

**Objective:** Let admin create and manage bootcamp sessions/events.

**Files:**
- Create: `api/admin-events.js`
- Create: `api/admin-event-update.js`
- Modify: `app/admin.js`
- Modify: `app/styles.css`

**Behavior:**
- List events ordered by date.
- Create event with title, start date/time, location, seat limit, price, publish status.
- Edit event details.
- Publish/unpublish event.
- Prevent deleting an event with paid registrations unless explicitly archived instead.

**Verification:**
- Admin can create a draft event.
- Admin can publish one event.
- Public reserve flow uses the published event.

### Task 10: Add public calendar/next-session display

**Objective:** Reflect the active published event on the public registration section.

**Files:**
- Create: `api/public-events.js`
- Modify: `app/app.js`
- Modify: `app/index.html`
- Modify: `app/styles.css`

**Behavior:**
- Public page fetches next published event.
- Registration section shows date/time, location, price, seats available.
- If no event is published, show waitlist/coming soon state.

**Verification:**
- Published event appears publicly.
- Unpublished event does not appear publicly.
- Seat count matches paid registrations.

---

## Optional later upgrades

These should not block v1:

- Google Calendar sync.
- Email/SMS reminders.
- Supabase Auth admin accounts instead of single password.
- QR-code check-in.
- Attendee self-service portal.
- Coupon codes/scholarship seats.
- Multiple bootcamp tracks.

---

## Recommended execution order

1. Create Supabase project and tables.
2. Add serverless API foundation.
3. Add Stripe Checkout and success page.
4. Add Stripe webhook registration writes.
5. Add admin login gate.
6. Add admin registration dashboard.
7. Add check-in and notes.
8. Add calendar/event control room.
9. Connect public registration section to published event.
10. Test end-to-end in Stripe test mode, then switch to live keys.

---

## Open decisions for Jonti

1. Payment provider: Stripe full Checkout is recommended for seat caps and webhooks.
2. Backend: Supabase is recommended for fast secure setup.
3. First admin gate: single admin password v1 is fastest; Supabase Auth is stronger later.
4. Calendar sync: internal control room first; Google Calendar sync later.
5. Registration fields: name + email required; phone optional is recommended.
6. Event model: one published upcoming event at a time is simplest for v1.
