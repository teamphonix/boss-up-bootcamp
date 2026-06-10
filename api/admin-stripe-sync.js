const Stripe = require('stripe');
const { requireAdmin } = require('./_auth');
const { supabaseAdmin } = require('./_supabase');
const { upsertRegistrationFromCheckoutSession } = require('./_stripe-registration');

function stripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(secretKey);
}

async function syncRecentPaidCheckoutSessions(limit = 25) {
  const stripe = stripeClient();
  const supabase = supabaseAdmin();
  const sessions = await stripe.checkout.sessions.list({
    limit,
    payment_status: 'paid',
    expand: ['data.customer'],
  });

  const synced = [];
  for (const session of sessions.data || []) {
    const registration = await upsertRegistrationFromCheckoutSession(supabase, session);
    synced.push({
      id: registration.id,
      stripe_checkout_session_id: registration.stripe_checkout_session_id,
      attendee_email: registration.attendee_email,
      amount_total: registration.amount_total,
      payment_status: registration.payment_status,
    });
  }

  return { count: synced.length, synced };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const result = await syncRecentPaidCheckoutSessions();
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error('Stripe sync failed', { message: error.message });
    return res.status(500).json({ error: error.message || 'Stripe sync failed' });
  }
};

module.exports.syncRecentPaidCheckoutSessions = syncRecentPaidCheckoutSessions;
