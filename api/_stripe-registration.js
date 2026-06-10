function stripeValueId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.id) return value.id;
  return String(value);
}

function extractRegistrationFromCheckoutSession(session, fallbackEventId = null) {
  const metadata = session.metadata || {};
  const customerDetails = session.customer_details || {};
  return {
    event_id: metadata.event_id || fallbackEventId || null,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: stripeValueId(session.payment_intent),
    stripe_customer_id: stripeValueId(session.customer),
    stripe_payment_link_id: stripeValueId(session.payment_link),
    payment_status: session.payment_status || session.status || 'unknown',
    amount_total: typeof session.amount_total === 'number' ? session.amount_total : null,
    currency: session.currency || null,
    attendee_name: customerDetails.name || metadata.attendee_name || null,
    attendee_email: customerDetails.email || session.customer_email || metadata.attendee_email || null,
    attendee_phone: customerDetails.phone || metadata.attendee_phone || null,
    interest: metadata.interest || metadata.focus || null,
    raw_stripe: session,
    source: 'stripe_payment_link',
  };
}

async function getPublishedEventId(supabase) {
  const { data, error } = await supabase
    .from('bootcamp_events')
    .select('id')
    .eq('is_published', true)
    .order('starts_at', { ascending: true, nullsFirst: false })
    .limit(1);

  if (error) throw error;
  return data?.[0]?.id || null;
}

async function upsertRegistrationFromCheckoutSession(supabase, session) {
  const fallbackEventId = await getPublishedEventId(supabase);
  const row = extractRegistrationFromCheckoutSession(session, fallbackEventId);

  const { data, error } = await supabase
    .from('registrations')
    .upsert(row, {
      onConflict: 'stripe_checkout_session_id',
      ignoreDuplicates: false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  extractRegistrationFromCheckoutSession,
  getPublishedEventId,
  upsertRegistrationFromCheckoutSession,
};
