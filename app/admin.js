const loginCard = document.querySelector('#admin-login-card');
const loginForm = document.querySelector('#admin-login-form');
const passwordInput = document.querySelector('#admin-password');
const loginMessage = document.querySelector('#admin-login-message');
const dashboard = document.querySelector('#admin-dashboard');
const logoutButton = document.querySelector('#admin-logout');
const refreshButton = document.querySelector('#admin-refresh');
const syncStripeButton = document.querySelector('#admin-sync-stripe');
const cleanupTestsButton = document.querySelector('#admin-cleanup-tests');
const statsEl = document.querySelector('#admin-stats');
const eventDetailsEl = document.querySelector('#admin-event-details');
const attendeeListEl = document.querySelector('#admin-attendee-list');
const searchInput = document.querySelector('#admin-search');
const eventFilter = document.querySelector('#admin-event-filter');
const eventForm = document.querySelector('#admin-event-form');
const eventIdInput = document.querySelector('#admin-event-id');
const eventTitleInput = document.querySelector('#admin-event-title');
const eventStartInput = document.querySelector('#admin-event-start');
const eventEndInput = document.querySelector('#admin-event-end');
const eventLocationInput = document.querySelector('#admin-event-location');
const eventPriceInput = document.querySelector('#admin-event-price');
const eventSeatLimitInput = document.querySelector('#admin-event-seat-limit');
const eventPublishedInput = document.querySelector('#admin-event-published');
const eventNotesInput = document.querySelector('#admin-event-notes');
const eventClearButton = document.querySelector('#admin-event-clear');

let adminData = { events: [], registrations: [], summary: {} };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function money(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents || 0) / 100);
}

function formatDate(value) {
  if (!value) return 'Date/time not set yet';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/New_York',
  }).format(new Date(value));
}

function setLoginMessage(message, isError = false) {
  if (!loginMessage) return;
  loginMessage.textContent = message;
  loginMessage.classList.toggle('is-error', isError);
}

function showDashboard() {
  loginCard.hidden = true;
  dashboard.hidden = false;
  logoutButton.hidden = false;
}

function showLogin() {
  loginCard.hidden = false;
  dashboard.hidden = true;
  logoutButton.hidden = true;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

function renderStats() {
  const summary = adminData.summary || {};
  const cards = [
    ['Paid seats', summary.paidCount ?? 0],
    ['Seats remaining', summary.seatsRemaining ?? 20],
    ['Revenue', money(summary.revenueCents || 0)],
    ['Checked in', summary.checkedInCount ?? 0],
  ];
  statsEl.innerHTML = cards.map(([label, value]) => `
    <article class="admin-stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join('');
}

function datetimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function isoFromLocalInput(value) {
  return value ? new Date(value).toISOString() : null;
}

function fillEventForm(event = {}) {
  eventIdInput.value = event.id || event.event_id || '';
  eventTitleInput.value = event.title || 'Boss Up Bootcamp';
  eventStartInput.value = datetimeLocalValue(event.starts_at);
  eventEndInput.value = datetimeLocalValue(event.ends_at);
  eventLocationInput.value = event.location || 'Newark Campus';
  eventPriceInput.value = Number(event.price_cents || 2500) / 100;
  eventSeatLimitInput.value = event.seat_limit || 20;
  eventPublishedInput.checked = event.is_published !== false;
  eventNotesInput.value = event.notes || '';
}

function renderEventFilter() {
  if (!eventFilter) return;
  const current = eventFilter.value || 'all';
  eventFilter.innerHTML = '<option value="all">All sessions</option>' + (adminData.events || []).map((event) => `
    <option value="${escapeHtml(event.id || event.event_id)}">${escapeHtml(formatDate(event.starts_at))}</option>
  `).join('');
  eventFilter.value = [...eventFilter.options].some((option) => option.value === current) ? current : 'all';
}

function renderEvent() {
  const events = adminData.events || [];
  if (!events.length) {
    eventDetailsEl.innerHTML = '<p>No bootcamp sessions found yet. Add one above, then publish it when ready.</p>';
    return;
  }
  eventDetailsEl.innerHTML = events.map((event) => `
    <article class="admin-session-card" data-event-id="${escapeHtml(event.id || event.event_id)}">
      <div>
        <span class="badge">${escapeHtml(event.is_archived ? 'Archived' : event.is_published ? 'Published' : 'Draft')}</span>
        <h3>${escapeHtml(event.title || 'Boss Up Bootcamp')}</h3>
        <p>${escapeHtml(formatDate(event.starts_at))}</p>
        <p>${escapeHtml(event.location || 'Newark Campus')} · ${money(event.price_cents || 2500)}</p>
        <p>${escapeHtml(event.paid_count || 0)} paid · ${escapeHtml(event.seat_limit || 20)} internal max</p>
      </div>
      <div class="admin-attendee-actions">
        <button class="button button-light" type="button" data-edit-event="${escapeHtml(event.id || event.event_id)}">Edit</button>
        <button class="button button-light" type="button" data-archive-event="${escapeHtml(event.id || event.event_id)}">Archive</button>
      </div>
    </article>
  `).join('');
  renderEventFilter();
}

function attendeeMatches(row, term) {
  if (!term) return true;
  const haystack = [row.attendee_name, row.attendee_email, row.attendee_phone, row.payment_status, row.admin_notes].join(' ').toLowerCase();
  return haystack.includes(term.toLowerCase());
}

function renderAttendees() {
  const term = searchInput.value.trim();
  const selectedEventId = eventFilter?.value || 'all';
  const rows = (adminData.registrations || [])
    .filter((row) => selectedEventId === 'all' || row.event_id === selectedEventId)
    .filter((row) => attendeeMatches(row, term));
  if (!rows.length) {
    attendeeListEl.innerHTML = '<p class="admin-empty">No registrations found yet. After Stripe webhook is connected, paid attendees will appear here automatically.</p>';
    return;
  }
  attendeeListEl.innerHTML = rows.map((row) => `
    <article class="admin-attendee-card" data-registration-id="${escapeHtml(row.id)}">
      <div>
        <span class="badge">${escapeHtml(row.payment_status || 'pending')}</span>
        <h3>${escapeHtml(row.attendee_name || 'Unnamed attendee')}</h3>
        <p>${escapeHtml(row.attendee_email || 'No email yet')}</p>
        <p>${escapeHtml(row.attendee_phone || 'No phone yet')}</p>
        <p>${escapeHtml(formatDate((adminData.events || []).find((event) => (event.id || event.event_id) === row.event_id)?.starts_at))}</p>
      </div>
      <div class="admin-attendee-actions">
        <button class="button button-light" type="button" data-send-sms="${escapeHtml(row.id)}">Send Confirmation Text</button>
        <button class="button ${row.checked_in ? 'button-dark' : 'button-light'}" type="button" data-checkin="${escapeHtml(row.id)}">${row.checked_in ? 'Checked In' : 'Check In'}</button>
        <textarea data-notes="${escapeHtml(row.id)}" placeholder="Admin notes">${escapeHtml(row.admin_notes || '')}</textarea>
        <button class="button button-light" type="button" data-save-notes="${escapeHtml(row.id)}">Save Notes</button>
      </div>
    </article>
  `).join('');
}

function renderAll() {
  renderStats();
  renderEvent();
  renderAttendees();
}

async function loadAdminData() {
  adminData = await api('/api/admin-data');
  showDashboard();
  renderAll();
}

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoginMessage('Opening control room...');
  try {
    await api('/api/admin-login', { method: 'POST', body: JSON.stringify({ password: passwordInput.value }) });
    passwordInput.value = '';
    await loadAdminData();
  } catch (error) {
    setLoginMessage(error.message || 'Login failed', true);
  }
});

logoutButton?.addEventListener('click', async () => {
  await api('/api/admin-logout', { method: 'POST' }).catch(() => null);
  showLogin();
});

refreshButton?.addEventListener('click', () => loadAdminData().catch((error) => setLoginMessage(error.message, true)));
syncStripeButton?.addEventListener('click', async () => {
  const originalText = syncStripeButton.textContent;
  syncStripeButton.disabled = true;
  syncStripeButton.textContent = 'Syncing...';
  try {
    const result = await api('/api/admin-stripe-sync', { method: 'POST', body: JSON.stringify({}) });
    setLoginMessage(`Stripe sync complete: ${result.count || 0} paid checkout session(s) saved. Refreshing dashboard...`);
    await loadAdminData();
  } catch (error) {
    setLoginMessage(error.message || 'Stripe sync failed', true);
  } finally {
    syncStripeButton.disabled = false;
    syncStripeButton.textContent = originalText;
  }
});
cleanupTestsButton?.addEventListener('click', async () => {
  const confirmed = window.confirm('Remove Stripe test-mode registrations from the admin dashboard? Real live-mode payments will not be removed.');
  if (!confirmed) return;
  const originalText = cleanupTestsButton.textContent;
  cleanupTestsButton.disabled = true;
  cleanupTestsButton.textContent = 'Removing...';
  try {
    const result = await api('/api/admin-cleanup-test-registrations', { method: 'POST', body: JSON.stringify({}) });
    setLoginMessage(`Removed ${result.count || 0} test registration(s).`);
    await loadAdminData();
  } catch (error) {
    setLoginMessage(error.message || 'Cleanup failed', true);
  } finally {
    cleanupTestsButton.disabled = false;
    cleanupTestsButton.textContent = originalText;
  }
});
searchInput?.addEventListener('input', renderAttendees);
eventFilter?.addEventListener('change', renderAttendees);
eventClearButton?.addEventListener('click', () => fillEventForm({}));
eventForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    id: eventIdInput.value || undefined,
    title: eventTitleInput.value,
    starts_at: isoFromLocalInput(eventStartInput.value),
    ends_at: isoFromLocalInput(eventEndInput.value),
    location: eventLocationInput.value,
    price_dollars: eventPriceInput.value,
    seat_limit: eventSeatLimitInput.value,
    is_published: eventPublishedInput.checked,
    is_archived: false,
    notes: eventNotesInput.value,
  };
  setLoginMessage('Saving session...');
  await api('/api/admin-event-update', { method: payload.id ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
  setLoginMessage('Session saved.');
  await loadAdminData();
});

eventDetailsEl?.addEventListener('click', async (event) => {
  const editButton = event.target.closest('[data-edit-event]');
  const archiveButton = event.target.closest('[data-archive-event]');
  const id = editButton?.dataset.editEvent || archiveButton?.dataset.archiveEvent;
  if (!id) return;
  const item = (adminData.events || []).find((row) => (row.id || row.event_id) === id);
  if (editButton && item) {
    fillEventForm(item);
    eventForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (archiveButton) {
    if (!window.confirm('Archive this session and remove it from public registration?')) return;
    await api('/api/admin-event-update', { method: 'PATCH', body: JSON.stringify({ action: 'archive', id }) });
    await loadAdminData();
  }
});

attendeeListEl?.addEventListener('click', async (event) => {
  const smsButton = event.target.closest('[data-send-sms]');
  const checkinButton = event.target.closest('[data-checkin]');
  const saveNotesButton = event.target.closest('[data-save-notes]');
  const id = smsButton?.dataset.sendSms || checkinButton?.dataset.checkin || saveNotesButton?.dataset.saveNotes;
  if (!id) return;
  if (smsButton) {
    smsButton.disabled = true;
    smsButton.textContent = 'Sending...';
    try {
      await api('/api/admin-send-confirmation', { method: 'POST', body: JSON.stringify({ id }) });
      setLoginMessage('Confirmation text sent.');
    } catch (error) {
      setLoginMessage(error.message || 'Text failed', true);
    }
    await loadAdminData();
    return;
  }
  const current = (adminData.registrations || []).find((row) => row.id === id);
  const notes = attendeeListEl.querySelector(`[data-notes="${CSS.escape(id)}"]`)?.value || '';
  const payload = { id, admin_notes: notes };
  if (checkinButton) payload.checked_in = !current?.checked_in;
  await api('/api/admin-registration-update', { method: 'PATCH', body: JSON.stringify(payload) });
  await loadAdminData();
});

api('/api/admin-session')
  .then((session) => (session.authenticated ? loadAdminData() : showLogin()))
  .catch(showLogin);
