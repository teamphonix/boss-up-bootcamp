const Stripe = require('stripe');
const { supabaseAdmin } = require('./_supabase');
const { upsertRegistrationFromCheckoutSession } = require('./_stripe-registration');

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function stripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(secretKey);
}

async function handleStripeEvent(event) {
  if (event.type !== 'checkout.session.completed') {
    return { handled: false, type: event.type };
  }

  const session = event.data.object;
  const registration = await upsertRegistrationFromCheckoutSession(supabaseAdmin(), session);
  return { handled: true, type: event.type, registrationId: registration.id };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (error) {
    return res.status(400).json({ error: `Unable to read webhook body: ${error.message}` });
  }

  let event;
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET is not configured' });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'STRIPE_SECRET_KEY is not configured' });

    const signature = req.headers['stripe-signature'];
    event = stripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return res.status(400).json({ error: `Webhook verification failed: ${error.message}` });
  }

  try {
    const result = await handleStripeEvent(event);
    return res.status(200).json({ received: true, ...result });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Webhook processing failed' });
  }
};

module.exports.readRawBody = readRawBody;
module.exports.handleStripeEvent = handleStripeEvent;
