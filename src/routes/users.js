const express = require('express');
const router = express.Router();
const usersDb = require('../db/users');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/', (req, res) => {
  try {
    const users = usersDb.listUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/role', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user id' });
    const { role } = req.body || {};
    if (!role || !['viewer', 'developer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Valid role required: viewer, developer, or admin' });
    }
    const store = usersDb.readStore();
    if (!store.users.some((u) => u.id === id)) return res.status(404).json({ error: 'User not found' });
    const user = usersDb.updateUserRole(id, role);
    if (!user) return res.status(400).json({ error: 'Invalid role' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
