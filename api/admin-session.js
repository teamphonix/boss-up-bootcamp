const { isAdminRequest } = require('./_auth');

module.exports = function handler(req, res) {
  return res.status(200).json({ authenticated: isAdminRequest(req) });
};
