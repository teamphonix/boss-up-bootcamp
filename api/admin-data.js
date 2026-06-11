const { requireAdmin } = require('./_auth');
const { supabaseAdmin } = require('./_supabase');

function centsToDollars(cents) {
  return Math.round(Number(cents || 0)) / 100;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const supabase = supabaseAdmin();
    const [eventsResult, eventSummaryResult, registrationsResult] = await Promise.all([
      supabase.from('bootcamp_events').select('*').order('starts_at', { ascending: true, nullsFirst: false }),
      supabase.from('registration_event_summary').select('*').order('starts_at', { ascending: true, nullsFirst: false }),
      supabase.from('registrations').select('*').order('created_at', { ascending: false }),
    ]);

    if (eventsResult.error) throw eventsResult.error;
    if (eventSummaryResult.error) throw eventSummaryResult.error;
    if (registrationsResult.error) throw registrationsResult.error;

    const summariesById = new Map((eventSummaryResult.data || []).map((event) => [event.event_id, event]));
    const events = (eventsResult.data || []).map((event) => ({
      ...event,
      ...(summariesById.get(event.id) || {}),
      event_id: event.id,
    }));
    const registrations = registrationsResult.data || [];
    const paidStatuses = new Set(['paid', 'complete', 'completed']);
    const paidRegistrations = registrations.filter((row) => paidStatuses.has(String(row.payment_status || '').toLowerCase()));
    const fallbackRevenueCents = paidRegistrations.reduce((sum, row) => sum + Number(row.amount_total || 0), 0);
    const primaryEvent = events.find((event) => event.is_published && !event.is_archived) || events[0] || null;
    const paidCount = primaryEvent ? Number(primaryEvent.paid_count || 0) : paidRegistrations.length;
    const seatLimit = primaryEvent ? Number(primaryEvent.seat_limit || 20) : 20;
    const revenueCents = primaryEvent ? Number(primaryEvent.revenue_cents || 0) : fallbackRevenueCents;

    return res.status(200).json({
      events,
      registrations,
      summary: {
        paidCount,
        seatLimit,
        seatsRemaining: Math.max(seatLimit - paidCount, 0),
        revenueCents,
        revenueDollars: centsToDollars(revenueCents),
        checkedInCount: registrations.filter((row) => row.checked_in).length,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to load admin data' });
  }
};
