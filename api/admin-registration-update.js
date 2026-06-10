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

module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const body = await readJson(req);
    if (!body.id) return res.status(400).json({ error: 'Missing registration id' });

    const updates = {};
    if (typeof body.checked_in === 'boolean') {
      updates.checked_in = body.checked_in;
      updates.checked_in_at = body.checked_in ? new Date().toISOString() : null;
    }
    if (typeof body.admin_notes === 'string') updates.admin_notes = body.admin_notes.slice(0, 2000);

    const { data, error } = await supabaseAdmin()
      .from('registrations')
      .update(updates)
      .eq('id', body.id)
      .select('*')
      .single();

    if (error) throw error;
    return res.status(200).json({ registration: data });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to update registration' });
  }
};
