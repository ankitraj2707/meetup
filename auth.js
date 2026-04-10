const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'commune_super_secret_change_in_prod';

/**
 * authenticate — verifies JWT token from Authorization header.
 * Attaches decoded user payload to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * authorizeOrganizer — allows organizers and admins only.
 * Must be used AFTER authenticate.
 */
function authorizeOrganizer(req, res, next) {
  if (!req.user || !['organizer', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Organizer account required to manage events' });
  }
  next();
}

/**
 * authorizeAdmin — allows admins only.
 */
function authorizeAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { authenticate, authorizeOrganizer, authorizeAdmin };
