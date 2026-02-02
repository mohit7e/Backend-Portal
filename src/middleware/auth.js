const crypto = require('crypto');
const usersDb = require('../db/users');

const SECRET = process.env.JWT_SECRET || 'project-portal-secret-change-in-production';

function signToken(payload) {
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString('base64url');
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(encoded);
  return encoded + '.' + hmac.digest('base64url');
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(parts[0]);
    const expected = hmac.digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expected))) return null;
    return payload;
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload || !payload.userId) {
    return res.status(401).json({ error: 'Login required' });
  }
  const user = usersDb.getUserById(payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  req.user = user;
  next();
}

function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (payload && payload.userId) {
    const user = usersDb.getUserById(payload.userId);
    if (user) req.user = user;
  }
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Login required' });
    const role = req.user.role || (req.user.is_admin ? 'admin' : 'viewer');
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = {
  signToken,
  verifyToken,
  authMiddleware,
  optionalAuth,
  requireRole,
};
