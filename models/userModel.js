const { getDB } = require('../config/db');

async function findByEmail(email) {
  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return rows?.[0] || null;
}

async function findByUsername(username) {
  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
  return rows?.[0] || null;
}

async function findById(id) {
  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows?.[0] || null;
}

async function createUser({ fullname, first_name, last_name, email, passwordHash, date_of_birth, username, phone, country_code = null, country_flag = null, preferred_theme = 'dark' }) {
  const db = getDB();

  // Rule: first registered user becomes SUPER_ADMIN
  const [countRows] = await db.execute('SELECT COUNT(*) AS c FROM users');
  const count = countRows?.[0]?.c || 0;
  const role = count === 0 ? 'SUPER_ADMIN' : 'USER';

  const [res] = await db.execute(
    `INSERT INTO users
      (fullname, first_name, last_name, email, password, date_of_birth, role, username, phone, country_code, country_flag, preferred_theme)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [fullname, first_name || null, last_name || null, email, passwordHash, date_of_birth, role, username || null, phone || null, country_code || null, country_flag || null, preferred_theme]

  );

  return { id: res.insertId, role };
}

module.exports = { findByEmail, findByUsername, findById, createUser };

