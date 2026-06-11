function cleanPhone(value) {
  return String(value || '').replace(/[^+\d]/g, '');
}

function formatEventDate(value) {
  if (!value) return 'your selected session';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  }).format(new Date(value));
}

function confirmationMessage({ registration = {}, event = {} }) {
  const name = registration.attendee_name ? ` ${registration.attendee_name.split(' ')[0]}` : '';
  const date = formatEventDate(event.starts_at);
  const privateLocation = event.notes && !String(event.notes).startsWith('Auto-seeded Tuesday schedule:') ? event.notes : '';
  const location = privateLocation || event.location || 'Newark Campus';
  return `Boss Up Bootcamp confirmed${name} ✅\n\nYou’re registered for:\n${date}\n\nLocation:\n${location}\n\nPlease arrive 10 minutes early. Bring your phone/laptop if available.\n\n- H.I.P.H.O.P. Academy`;
}

function twilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

async function sendTwilioSms({ to, body }) {
  if (!twilioConfigured()) {
    const error = new Error('Twilio SMS is not configured yet. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in Vercel.');
    error.code = 'SMS_NOT_CONFIGURED';
    throw error;
  }
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const cleanedTo = cleanPhone(to);
  if (!cleanedTo) {
    const error = new Error('Attendee phone number is missing.');
    error.code = 'SMS_MISSING_PHONE';
    throw error;
  }

  const params = new URLSearchParams({ To: cleanedTo, From: from, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || 'Twilio SMS send failed');
    error.code = 'SMS_SEND_FAILED';
    error.details = result;
    throw error;
  }
  return result;
}

async function sendConfirmationSms({ supabase, registration }) {
  const eventId = registration.event_id;
  let event = {};
  if (eventId) {
    const { data, error } = await supabase
      .from('bootcamp_events')
      .select('*')
      .eq('id', eventId)
      .limit(1);
    if (error) throw error;
    event = data?.[0] || {};
  }
  const body = confirmationMessage({ registration, event });
  const result = await sendTwilioSms({ to: registration.attendee_phone, body });
  const stamp = new Date().toISOString();
  await supabase
    .from('registrations')
    .update({
      admin_notes: `${registration.admin_notes || ''}${registration.admin_notes ? '\n' : ''}SMS confirmation sent ${stamp} (${result.sid || 'sent'}).`.slice(0, 2000),
    })
    .eq('id', registration.id);
  return { result, body };
}

module.exports = {
  cleanPhone,
  confirmationMessage,
  sendConfirmationSms,
  sendTwilioSms,
  twilioConfigured,
};
