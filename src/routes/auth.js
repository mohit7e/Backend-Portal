const express = require('express');
const router = express.Router();
const usersDb = require('../db/users');
const { signToken, authMiddleware } = require('../middleware/auth');

router.post('/register', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const u = String(username).trim();
    const p = String(password);
    if (u.length < 2) return res.status(400).json({ error: 'Username too short' });
    if (p.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const user = usersDb.createUser(u, p);
    if (!user) return res.status(409).json({ error: 'Username already taken' });
    const token = signToken({ userId: user.id, username: user.username });
    res.status(201).json({ user: { id: user.id, username: user.username, is_admin: !!user.is_admin, role: user.role || 'viewer' }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const user = usersDb.findByUsername(username.trim());
    if (!user || !usersDb.verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const safe = usersDb.getUserById(user.id);
    const token = signToken({ userId: user.id, username: user.username });
    res.json({ user: { id: safe.id, username: safe.username, is_admin: !!safe.is_admin, role: safe.role || 'viewer' }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

module.exports = router;
