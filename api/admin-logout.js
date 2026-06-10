const { clearAdminCookie } = require('./_auth');

module.exports = function handler(_req, res) {
  clearAdminCookie(res);
  return res.status(200).json({ ok: true });
};
