# Boss Up Bootcamp Registration + Calendar Schema

Supabase project URL:

```text
https://klnfdnjsfbedtesdvvju.supabase.co
```

## Purpose

This schema supports the next functional layer of the Boss Up Bootcamp site:

- paid Stripe registrations
- attendee list
- check-in status
- admin notes
- event/session calendar control room
- seat-limit reporting

## Files

- Migration: `supabase/migrations/001_create_registration_calendar_core.sql`
- Implementation plan: `docs/plans/2026-06-09-registration-access-calendar-control-room.md`

## Tables

### `bootcamp_events`

Stores each bootcamp/session that can be published for registration.

Important fields:

- `title`
- `starts_at`
- `ends_at`
- `timezone`
- `location`
- `seat_limit`
- `price_cents`
- `is_published`
- `is_archived`
- `notes`

### `registrations`

Stores attendees/payments from Stripe.

Important fields:

- `event_id`
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `stripe_customer_id`
- `stripe_payment_link_id`
- `payment_status`
- `amount_total`
- `attendee_name`
- `attendee_email`
- `attendee_phone`
- `checked_in`
- `checked_in_at`
- `admin_notes`
- `raw_stripe`

## View

### `registration_event_summary`

Admin/API helper view for:

- paid count
- seats remaining
- revenue cents
- event metadata

## Security

Row Level Security is enabled on both tables.

The frontend must not connect directly to private attendee data. Server-side Vercel API routes should use:

```text
SUPABASE_SERVICE_ROLE_KEY
```

That key must only live in Vercel environment variables and must never be committed to GitHub or exposed in browser JavaScript.

## Apply migration in Supabase

Open Supabase SQL Editor for the project and paste/run the SQL from:

```text
supabase/migrations/001_create_registration_calendar_core.sql
```

## Next needed secrets

To build the admin control room and webhook connection, Vercel will need these environment variables:

```text
SUPABASE_URL=https://klnfdnjsfbedtesdvvju.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_PASSWORD=choose-a-private-admin-password
PUBLIC_SITE_URL=https://boss-up-bootcamp.vercel.app
```

For now, the live site is connected to the Stripe Sandbox Payment Link. The webhook/API phase comes next.

## Stripe webhook endpoint

Vercel route:

```text
https://boss-up-bootcamp.vercel.app/api/stripe-webhook
```

Stripe event to subscribe:

```text
checkout.session.completed
```

Webhook behavior:

- Verifies the `stripe-signature` header with `STRIPE_WEBHOOK_SECRET`.
- Handles only `checkout.session.completed` for v1.
- Finds the first published `bootcamp_events` row when the Stripe session does not include `metadata.event_id`.
- Upserts into `registrations` by `stripe_checkout_session_id` so Stripe retries do not create duplicate attendees.
- Saves attendee name, email, phone, amount, currency, payment status, customer ID, payment intent ID, payment link ID, optional interest metadata, and raw Stripe session JSON.
