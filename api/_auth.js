const crypto = require('crypto');
const cookie = require('cookie');

const COOKIE_NAME = 'boss_up_admin';
const MAX_AGE_SECONDS = 60 * 60 * 12;

function adminSecret() {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('ADMIN_PASSWORD is not configured');
  return secret;
}

function sign(value) {
  return crypto.createHmac('sha256', adminSecret()).update(value).digest('hex');
}

function createAdminToken() {
  const payload = JSON.stringify({ role: 'admin', issuedAt: Date.now() });
  const encoded = Buffer.from(payload).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [encoded, signature] = token.split('.');
  const expected = sign(encoded);
  if (!signature || signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (payload.role !== 'admin') return false;
    return Date.now() - Number(payload.issuedAt || 0) < MAX_AGE_SECONDS * 1000;
  } catch (_error) {
    return false;
  }
}

function parseCookies(req) {
  return cookie.parse(req.headers.cookie || '');
}

function isAdminRequest(req) {
  return verifyAdminToken(parseCookies(req)[COOKIE_NAME]);
}

function setAdminCookie(res) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, createAdminToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  }));
}

function clearAdminCookie(res) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  }));
}

function requireAdmin(req, res) {
  if (isAdminRequest(req)) return true;
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Unauthorized' }));
  return false;
}

module.exports = {
  clearAdminCookie,
  isAdminRequest,
  requireAdmin,
  setAdminCookie,
};
