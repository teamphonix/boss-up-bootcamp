const Stripe = require('stripe');
const { supabaseAdmin } = require('./_supabase');
const { upsertRegistrationFromCheckoutSession } = require('./_stripe-registration');
const { sendConfirmationSms, twilioConfigured } = require('../lib/sms');

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(Buffer.from(req.body, 'utf8'));

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
  const supabase = supabaseAdmin();
  const registration = await upsertRegistrationFromCheckoutSession(supabase, session);
  let sms = { attempted: false };
  if (twilioConfigured() && registration.attendee_phone) {
    try {
      const smsResult = await sendConfirmationSms({ supabase, registration });
      sms = { attempted: true, sent: true, sid: smsResult.result.sid || null };
    } catch (error) {
      console.error('Confirmation SMS failed', { registrationId: registration.id, message: error.message });
      sms = { attempted: true, sent: false, error: error.message };
    }
  }
  return { handled: true, type: event.type, registrationId: registration.id, sms };
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
    console.error('Stripe webhook verification failed', {
      message: error.message,
      hasSignature: Boolean(req.headers['stripe-signature']),
      rawBodyBytes: rawBody ? rawBody.length : 0,
      hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      hasStripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
    });
    return res.status(400).json({ error: `Webhook verification failed: ${error.message}` });
  }

  try {
    const result = await handleStripeEvent(event);
    console.log('Stripe webhook processed', result);
    return res.status(200).json({ received: true, ...result });
  } catch (error) {
    console.error('Stripe webhook processing failed', {
      message: error.message,
      eventType: event?.type,
      eventId: event?.id,
    });
    return res.status(500).json({ error: error.message || 'Webhook processing failed' });
  }
};

module.exports.readRawBody = readRawBody;
module.exports.handleStripeEvent = handleStripeEvent;
