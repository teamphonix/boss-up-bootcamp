const Stripe = require('stripe');
const { supabaseAdmin } = require('./_supabase');

function stripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(secretKey);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

function clean(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function publicOrigin(req) {
  const configured = process.env.PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`.replace(/\/$/, '');
}

function assertLiveStripeKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  if (secretKey.startsWith('sk_test_') && process.env.ALLOW_STRIPE_TEST_MODE !== 'true') {
    throw new Error('Stripe live mode is not configured yet. Add a live STRIPE_SECRET_KEY in Vercel before accepting real registrations.');
  }
}

const DEFAULT_TUESDAY_EVENTS = [
  { date: '2026-06-23', afternoon: '2026-06-23T12:00:00-04:00', evening: '2026-06-23T21:00:00-04:00' },
  { date: '2026-06-30', afternoon: '2026-06-30T12:00:00-04:00', evening: '2026-06-30T21:00:00-04:00' },
  { date: '2026-07-07', afternoon: '2026-07-07T12:00:00-04:00', evening: '2026-07-07T21:00:00-04:00' },
  { date: '2026-07-14', afternoon: '2026-07-14T12:00:00-04:00', evening: '2026-07-14T21:00:00-04:00' },
  { date: '2026-07-21', afternoon: '2026-07-21T12:00:00-04:00', evening: '2026-07-21T21:00:00-04:00' },
  { date: '2026-07-28', afternoon: '2026-07-28T12:00:00-04:00', evening: '2026-07-28T21:00:00-04:00' },
  { date: '2026-08-04', afternoon: '2026-08-04T12:00:00-04:00', evening: '2026-08-04T21:00:00-04:00' },
  { date: '2026-08-11', afternoon: '2026-08-11T12:00:00-04:00', evening: '2026-08-11T21:00:00-04:00' },
];

function defaultTuesdayRows() {
  const rows = [];
  DEFAULT_TUESDAY_EVENTS.forEach((event) => {
    rows.push({
      title: 'Boss Up Bootcamp — Afternoon Class',
      description: 'Tuesday afternoon Boss Up Bootcamp class.',
      starts_at: event.afternoon,
      ends_at: `${event.date}T13:00:00-04:00`,
      timezone: 'America/New_York',
      location: 'Newark Campus',
      seat_limit: Number(process.env.BOOTCAMP_SEAT_LIMIT || 20),
      price_cents: Number(process.env.BOOTCAMP_PRICE_CENTS || 2500),
      currency: 'usd',
      is_published: true,
      is_archived: false,
      notes: 'Auto-seeded Tuesday schedule: 12:00–1:00 PM ET.',
    });
    rows.push({
      title: 'Boss Up Bootcamp — Evening Class',
      description: 'Tuesday evening Boss Up Bootcamp class.',
      starts_at: event.evening,
      ends_at: `${event.date}T22:00:00-04:00`,
      timezone: 'America/New_York',
      location: 'Newark Campus',
      seat_limit: Number(process.env.BOOTCAMP_SEAT_LIMIT || 20),
      price_cents: Number(process.env.BOOTCAMP_PRICE_CENTS || 2500),
      currency: 'usd',
      is_published: true,
      is_archived: false,
      notes: 'Auto-seeded Tuesday schedule: 9:00–10:00 PM ET.',
    });
  });
  return rows;
}

async function ensureDefaultTuesdayEvents(supabase, nowIso) {
  const { error: locationUpdateError } = await supabase
    .from('bootcamp_events')
    .update({ location: 'Newark Campus' })
    .eq('location', 'Location TBA')
    .like('notes', 'Auto-seeded Tuesday schedule:%');

  if (locationUpdateError) throw locationUpdateError;

  const { count, error } = await supabase
    .from('bootcamp_events')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .eq('is_archived', false)
    .gte('starts_at', nowIso);

  if (error) throw error;
  if (Number(count || 0) > 0) return;

  const { count: seededCount, error: seededError } = await supabase
    .from('bootcamp_events')
    .select('id', { count: 'exact', head: true })
    .like('notes', 'Auto-seeded Tuesday schedule:%');

  if (seededError) throw seededError;
  if (Number(seededCount || 0) > 0) return;

  const { error: insertError } = await supabase
    .from('bootcamp_events')
    .insert(defaultTuesdayRows());

  if (insertError) throw insertError;
}

async function loadAvailableEvents() {
  const supabase = supabaseAdmin();
  const nowIso = new Date().toISOString();
  await ensureDefaultTuesdayEvents(supabase, nowIso);
  const { data, error } = await supabase
    .from('registration_event_summary')
    .select('event_id,title,starts_at,location,seat_limit,price_cents,currency,is_published,paid_count,seats_remaining')
    .eq('is_published', true)
    .gte('starts_at', nowIso)
    .order('starts_at', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data || []).map((event) => ({
    id: event.event_id,
    title: event.title || 'Boss Up Bootcamp',
    starts_at: event.starts_at,
    location: event.location || 'Newark Campus',
    seat_limit: Number(event.seat_limit || 20),
    price_cents: Number(event.price_cents || 2500),
    currency: event.currency || 'usd',
    paid_count: Number(event.paid_count || 0),
    seats_remaining: Math.max(Number(event.seats_remaining || 0), 0),
    is_sold_out: Number(event.seats_remaining || 0) <= 0,
  }));
}

async function saveNotifyRequest(body) {
  const email = clean(body.email, 180).toLowerCase();
  const name = clean(body.name, 120);
  const interest = clean(body.interest || 'Notify me when a Boss Up Bootcamp date is available.', 500);

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    const error = new Error('Please enter a valid email address.');
    error.statusCode = 400;
    throw error;
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from('registrations')
    .insert({
      attendee_name: name || null,
      attendee_email: email,
      payment_status: 'notify_requested',
      interest,
      source: 'date_notify_request',
    });
  if (error) throw error;
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const events = await loadAvailableEvents();
      return res.status(200).json({ events });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Unable to load available dates' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await readJson(req);
    if (body.action === 'notify-date') {
      await saveNotifyRequest(body);
      return res.status(200).json({ ok: true, message: 'You are on the notification list.' });
    }

    assertLiveStripeKey();
    const attendeeName = clean(body.attendee_name, 120);
    const attendeeEmail = clean(body.attendee_email, 180).toLowerCase();
    const attendeePhone = clean(body.attendee_phone, 40);
    const skillLevel = clean(body.skill_level, 80);
    const projectIdea = clean(body.project_idea, 500);
    const eventId = clean(body.event_id, 80);

    if (!attendeeName) return res.status(400).json({ error: 'Please enter your name.' });
    if (!/^\S+@\S+\.\S+$/.test(attendeeEmail)) return res.status(400).json({ error: 'Please enter a valid email.' });
    if (!eventId) return res.status(400).json({ error: 'Please choose an available session date.' });

    const supabase = supabaseAdmin();
    const { data: eventRows, error: eventError } = await supabase
      .from('registration_event_summary')
      .select('event_id,title,starts_at,location,seat_limit,price_cents,currency,is_published,seats_remaining')
      .eq('event_id', eventId)
      .eq('is_published', true)
      .limit(1);

    if (eventError) throw eventError;
    const bootcampEvent = eventRows?.[0];
    if (!bootcampEvent) return res.status(400).json({ error: 'That session date is not available anymore.' });
    if (bootcampEvent.starts_at && new Date(bootcampEvent.starts_at) < new Date()) {
      return res.status(400).json({ error: 'That session date has already passed.' });
    }
    if (Number(bootcampEvent.seats_remaining || 0) <= 0) {
      return res.status(400).json({ error: 'That session is sold out. Please choose another date.' });
    }

    const origin = publicOrigin(req);
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: attendeeEmail,
      phone_number_collection: { enabled: true },
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      line_items: [
        {
          price_data: {
            currency: bootcampEvent.currency || 'usd',
            unit_amount: Number(bootcampEvent.price_cents || process.env.BOOTCAMP_PRICE_CENTS || 2500),
            product_data: {
              name: bootcampEvent.title || 'Boss Up Bootcamp Seat',
              description: `One reserved seat for ${bootcampEvent.location || 'Boss Up Bootcamp'}.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        event_id: eventId,
        event_title: bootcampEvent.title || 'Boss Up Bootcamp',
        event_starts_at: bootcampEvent.starts_at || '',
        event_location: bootcampEvent.location || '',
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        attendee_phone: attendeePhone,
        skill_level: skillLevel,
        interest: projectIdea,
        source: 'boss_up_checkout_form',
      },
      custom_text: {
        submit: { message: 'After payment, your seat is reserved and you will return to Boss Up Bootcamp confirmation.' },
      },
      success_url: `${origin}/register-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/register-cancel`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Create checkout session failed', { message: error.message });
    return res.status(500).json({ error: error.message || 'Unable to start checkout' });
  }
};
