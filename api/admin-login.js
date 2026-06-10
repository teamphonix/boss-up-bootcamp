const { setAdminCookie } = require('./_auth');

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

  try {
    const body = await readJson(req);
    if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'Admin password is not configured' });
    if (body.password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
    setAdminCookie(res);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid login request' });
  }
};
