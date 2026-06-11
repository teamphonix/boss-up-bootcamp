const { requireAdmin } = require('./_auth');
const { supabaseAdmin } = require('./_supabase');
const { sendConfirmationSms } = require('./_sms');

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const body = await readJson(req);
    if (!body.id) return res.status(400).json({ error: 'Missing registration id' });
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', body.id)
      .limit(1);
    if (error) throw error;
    const registration = data?.[0];
    if (!registration) return res.status(404).json({ error: 'Registration not found' });
    const sms = await sendConfirmationSms({ supabase, registration });
    return res.status(200).json({ ok: true, sid: sms.result.sid || null, preview: sms.body });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to send confirmation text' });
  }
};
