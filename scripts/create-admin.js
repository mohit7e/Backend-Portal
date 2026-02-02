#!/usr/bin/env node
require('dotenv').config();
const usersDb = require('../src/db/users');

const username = process.argv[2] || 'admin';
const password = process.argv[3] || 'admin';

const user = usersDb.ensureAdminUser(username, password);
console.log('Admin account ready:', user.username, '(id:', user.id + ', is_admin: true)');
