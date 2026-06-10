const { requireAdmin } = require('./_auth');
const { supabaseAdmin } = require('./_supabase');

async function removeTestRegistrations() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('registrations')
    .select('id, stripe_checkout_session_id, raw_stripe, attendee_email, amount_total, payment_status');

  if (error) throw error;

  const testRows = (data || []).filter((row) => {
    const sessionId = String(row.stripe_checkout_session_id || '');
    const raw = row.raw_stripe || {};
    return sessionId.startsWith('cs_test_') || raw.livemode === false;
  });

  if (!testRows.length) return { count: 0, removed: [] };

  const ids = testRows.map((row) => row.id);
  const deleteResult = await supabase.from('registrations').delete().in('id', ids).select('id');
  if (deleteResult.error) throw deleteResult.error;

  return {
    count: deleteResult.data?.length || ids.length,
    removed: testRows.map((row) => ({
      id: row.id,
      stripe_checkout_session_id: row.stripe_checkout_session_id,
      attendee_email: row.attendee_email,
      amount_total: row.amount_total,
      payment_status: row.payment_status,
    })),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const result = await removeTestRegistrations();
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error('Test registration cleanup failed', { message: error.message });
    return res.status(500).json({ error: error.message || 'Unable to remove test registrations' });
  }
};

module.exports.removeTestRegistrations = removeTestRegistrations;
