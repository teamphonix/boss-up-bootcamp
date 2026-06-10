const Stripe = require('stripe');

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    assertLiveStripeKey();
    const body = await readJson(req);
    const attendeeName = clean(body.attendee_name, 120);
    const attendeeEmail = clean(body.attendee_email, 180).toLowerCase();
    const attendeePhone = clean(body.attendee_phone, 40);
    const skillLevel = clean(body.skill_level, 80);
    const projectIdea = clean(body.project_idea, 500);

    if (!attendeeName) return res.status(400).json({ error: 'Please enter your name.' });
    if (!/^\S+@\S+\.\S+$/.test(attendeeEmail)) return res.status(400).json({ error: 'Please enter a valid email.' });

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
            currency: 'usd',
            unit_amount: Number(process.env.BOOTCAMP_PRICE_CENTS || 2500),
            product_data: {
              name: 'Boss Up Bootcamp Seat',
              description: 'One reserved seat for the Boss Up Bootcamp AI build session.',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
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
