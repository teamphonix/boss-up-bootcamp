const loginCard = document.querySelector('#admin-login-card');
const loginForm = document.querySelector('#admin-login-form');
const passwordInput = document.querySelector('#admin-password');
const loginMessage = document.querySelector('#admin-login-message');
const dashboard = document.querySelector('#admin-dashboard');
const logoutButton = document.querySelector('#admin-logout');
const refreshButton = document.querySelector('#admin-refresh');
const syncStripeButton = document.querySelector('#admin-sync-stripe');
const statsEl = document.querySelector('#admin-stats');
const eventDetailsEl = document.querySelector('#admin-event-details');
const attendeeListEl = document.querySelector('#admin-attendee-list');
const searchInput = document.querySelector('#admin-search');

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

function renderEvent() {
  const event = (adminData.events || []).find((item) => item.is_published) || (adminData.events || [])[0];
  if (!event) {
    eventDetailsEl.innerHTML = '<p>No bootcamp event found yet. The database is ready, but an event row needs to be published.</p>';
    return;
  }
  eventDetailsEl.innerHTML = `
    <div class="admin-detail-grid">
      <p><span>Title</span><strong>${escapeHtml(event.title || 'Boss Up Bootcamp')}</strong></p>
      <p><span>Status</span><strong>${event.is_published ? 'Published' : 'Draft'}</strong></p>
      <p><span>Date</span><strong>${escapeHtml(formatDate(event.starts_at))}</strong></p>
      <p><span>Location</span><strong>${escapeHtml(event.location || 'New Jersey')}</strong></p>
      <p><span>Seat limit</span><strong>${escapeHtml(event.seat_limit || 20)}</strong></p>
      <p><span>Price</span><strong>${money(event.price_cents || 2500)}</strong></p>
    </div>
  `;
}

function attendeeMatches(row, term) {
  if (!term) return true;
  const haystack = [row.attendee_name, row.attendee_email, row.attendee_phone, row.payment_status, row.admin_notes].join(' ').toLowerCase();
  return haystack.includes(term.toLowerCase());
}

function renderAttendees() {
  const term = searchInput.value.trim();
  const rows = (adminData.registrations || []).filter((row) => attendeeMatches(row, term));
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
      </div>
      <div class="admin-attendee-actions">
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
searchInput?.addEventListener('input', renderAttendees);

attendeeListEl?.addEventListener('click', async (event) => {
  const checkinButton = event.target.closest('[data-checkin]');
  const saveNotesButton = event.target.closest('[data-save-notes]');
  const id = checkinButton?.dataset.checkin || saveNotesButton?.dataset.saveNotes;
  if (!id) return;
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
