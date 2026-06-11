const { requireAdmin } = require('./_auth');
const { supabaseAdmin } = require('./_supabase');

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

function clean(value, max = 1000) {
  return String(value || '').trim().slice(0, max);
}

function normalizeIso(value) {
  const input = clean(value, 80);
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('Invalid date/time.');
    error.statusCode = 400;
    throw error;
  }
  return date.toISOString();
}

function eventPayload(body) {
  const priceDollars = Number(body.price_dollars ?? 25);
  const seatLimit = Number(body.seat_limit ?? 20);
  return {
    title: clean(body.title || 'Boss Up Bootcamp', 180),
    description: clean(body.description || 'Boss Up Bootcamp class.', 500),
    starts_at: normalizeIso(body.starts_at),
    ends_at: body.ends_at ? normalizeIso(body.ends_at) : null,
    timezone: clean(body.timezone || 'America/New_York', 80),
    location: clean(body.location || 'Newark Campus', 300),
    seat_limit: Number.isFinite(seatLimit) && seatLimit > 0 ? Math.round(seatLimit) : 20,
    price_cents: Number.isFinite(priceDollars) && priceDollars >= 0 ? Math.round(priceDollars * 100) : 2500,
    currency: clean(body.currency || 'usd', 10).toLowerCase(),
    is_published: Boolean(body.is_published),
    is_archived: Boolean(body.is_archived),
    notes: clean(body.notes || '', 1000) || null,
  };
}

module.exports = async function handler(req, res) {
  if (!['POST', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'POST, PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const body = await readJson(req);
    const supabase = supabaseAdmin();

    if (body.action === 'archive') {
      if (!body.id) return res.status(400).json({ error: 'Missing event id' });
      const { data, error } = await supabase
        .from('bootcamp_events')
        .update({ is_archived: true, is_published: false })
        .eq('id', body.id)
        .select('*')
        .single();
      if (error) throw error;
      return res.status(200).json({ event: data });
    }

    const payload = eventPayload(body);
    if (!payload.starts_at) return res.status(400).json({ error: 'Start date/time is required.' });

    if (body.id) {
      const { data, error } = await supabase
        .from('bootcamp_events')
        .update(payload)
        .eq('id', body.id)
        .select('*')
        .single();
      if (error) throw error;
      return res.status(200).json({ event: data });
    }

    const { data, error } = await supabase
      .from('bootcamp_events')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return res.status(200).json({ event: data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to save event' });
  }
};
