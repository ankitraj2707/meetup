const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'commune_super_secret_change_in_prod';

// ─── authenticate ─────────────────────────────────────────────
// Verifies the Bearer token and attaches req.user
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please sign in again.' });
  }
}

// ─── authorizeOrganizer ───────────────────────────────────────
// Only allows users with role 'organizer' or 'admin'
function authorizeOrganizer(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Organizer account required to perform this action.' });
  }
  next();
}

module.exports = { authenticate, authorizeOrganizer };