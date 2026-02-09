const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET', 'ADMIN_SEED_USERNAME', 'ADMIN_SEED_PASSWORD'];
const missing = requiredEnv.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
if (missing.length) {
  console.error('Missing required env vars in server/.env: ' + missing.join(', '));
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const promisePool = pool.promise();

async function main() {
  const username = String(process.env.ADMIN_SEED_USERNAME).trim();
  const password = String(process.env.ADMIN_SEED_PASSWORD);

  await promisePool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [existing] = await promisePool.query(
    'SELECT id, username, role, password_hash FROM users WHERE username = ? LIMIT 1',
    [username]
  );
  if (Array.isArray(existing) && existing.length) {
    const current = existing[0];
    const passwordMatches = await bcrypt.compare(password, current.password_hash);
    if (!passwordMatches || current.role !== 'admin') {
      const passwordHash = await bcrypt.hash(password, 12);
      await promisePool.query('UPDATE users SET password_hash = ?, role = ? WHERE id = ?', [
        passwordHash,
        'admin',
        current.id,
      ]);
      console.log(`Updated admin user credentials: ${current.username} (id=${current.id})`);
      return;
    }

    console.log(`Admin user already exists and is up to date: ${current.username} (id=${current.id})`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await promisePool.query(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    [username, passwordHash, 'admin']
  );

  console.log(`Seeded admin user: ${username} (id=${result.insertId})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
