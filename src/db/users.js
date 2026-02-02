const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROLES = ['viewer', 'developer', 'admin'];

const dataDir = path.join(__dirname, '..', '..', 'data');
const storePath = path.join(dataDir, 'users.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readStore() {
  ensureDataDir();
  if (!fs.existsSync(storePath)) {
    return { nextId: 1, users: [] };
  }
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const store = JSON.parse(raw);
    if (!store || typeof store !== 'object') return { nextId: 1, users: [] };
    if (!Array.isArray(store.users)) store.users = [];
    return store;
  } catch {
    return { nextId: 1, users: [] };
  }
}

function writeStore(store) {
  ensureDataDir();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
}

const SALT_LEN = 16;
const KEY_LEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
}

function getRole(user) {
  if (user.role && ROLES.includes(user.role)) return user.role;
  if (user.is_admin) return 'admin';
  return 'viewer';
}

function findByUsername(username) {
  const store = readStore();
  return store.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

function createUser(username, password) {
  const store = readStore();
  if (store.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
    return null;
  }
  const id = store.nextId++;
  const isFirstUser = store.users.length === 0;
  const user = {
    id,
    username: username.trim(),
    passwordHash: hashPassword(password),
    created_at: new Date().toISOString(),
    is_admin: isFirstUser,
    role: isFirstUser ? 'admin' : 'viewer',
  };
  store.users.push(user);
  writeStore(store);
  const role = getRole(user);
  return { id: user.id, username: user.username, created_at: user.created_at, is_admin: role === 'admin', role };
}

function isAdminByEnv(username) {
  const list = process.env.ADMIN_USERNAMES;
  if (!list || !username) return false;
  return list.split(',').map((s) => s.trim().toLowerCase()).includes(username.toLowerCase());
}

function getUserById(id) {
  const store = readStore();
  const user = store.users.find((u) => u.id === id);
  if (!user) return null;
  const role = user.role && ROLES.includes(user.role) ? user.role : (user.is_admin ? 'admin' : 'viewer');
  return { id: user.id, username: user.username, created_at: user.created_at, is_admin: role === 'admin', role };
}

function listUsers() {
  const store = readStore();
  if (!store.users || !Array.isArray(store.users)) return [];
  return store.users.map((u) => {
    try {
      return {
        id: u.id,
        username: u.username || '',
        created_at: u.created_at || null,
        role: getRole(u),
      };
    } catch {
      return { id: u.id, username: u.username || '', created_at: u.created_at || null, role: 'viewer' };
    }
  });
}

function updateUserRole(id, role) {
  if (!ROLES.includes(role)) return null;
  const store = readStore();
  const user = store.users.find((u) => u.id === id);
  if (!user) return null;
  user.role = role;
  user.is_admin = role === 'admin';
  writeStore(store);
  return getUserById(id);
}

function ensureAdminUser(username, password) {
  const store = readStore();
  const existing = store.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (existing) {
    existing.passwordHash = hashPassword(password);
    existing.is_admin = true;
    existing.role = 'admin';
    writeStore(store);
    return { id: existing.id, username: existing.username, is_admin: true, role: 'admin' };
  }
  const id = store.nextId++;
  const user = {
    id,
    username: username.trim(),
    passwordHash: hashPassword(password),
    created_at: new Date().toISOString(),
    is_admin: true,
    role: 'admin',
  };
  store.users.push(user);
  writeStore(store);
  return { id: user.id, username: user.username, is_admin: true, role: 'admin' };
}

module.exports = {
  readStore,
  findByUsername,
  createUser,
  getUserById,
  verifyPassword,
  ensureAdminUser,
  listUsers,
  updateUserRole,
  ROLES,
};
