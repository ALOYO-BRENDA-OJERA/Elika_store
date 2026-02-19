const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Set it in server/.env');
}

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
if (!RESEND_API_KEY) {
  console.warn('WARNING: RESEND_API_KEY is not set. Password reset emails will not be sent.');
}

const signToken = (user) => {
  return jwt.sign(
    { sub: String(user.id), username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const setAuthCookie = (res, token) => {
  res.cookie('elika_admin', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie('elika_admin', { path: '/' });
};

const CUSTOMER_COOKIE = 'elika_customer';

const signCustomerToken = (user) => {
  return jwt.sign(
    { sub: String(user.id), email: user.email, name: user.full_name, role: 'customer' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const setCustomerCookie = (res, token) => {
  res.cookie(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

const clearCustomerCookie = (res) => {
  res.clearCookie(CUSTOMER_COOKIE, { path: '/' });
};

const getAuthUser = (req) => {
  const token = req.cookies?.elika_admin;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
};

const getCustomerUser = (req) => {
  const token = req.cookies?.[CUSTOMER_COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
};

const requireAdmin = (req, res, next) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  req.user = user;
  next();
};

const requireCustomer = (req, res, next) => {
  const user = getCustomerUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.customer = user;
  next();
};

// Serve uploaded product images
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeOriginalName = (file.originalname || 'image')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-120);
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniquePrefix}-${safeOriginalName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
});

const coerceNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const parseStringArray = (value) => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) {
    return value
      .filter((v) => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parseStringArray(parsed);
    } catch {
      // ignore
    }
    return trimmed
      .split(/\r?\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const parseJsonStringArrayPreserveEmpty = (value) => {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === 'string' ? v.trim() : ''));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => (typeof v === 'string' ? String(v).trim() : ''));
      }
    } catch {
      // ignore
    }

    // Fallback: one per line, preserve blanks
    return trimmed.split(/\r?\n/g).map((s) => s.trim());
  }
  return [];
};

const sendResetEmail = async ({ to, resetUrl }) => {
  if (!RESEND_API_KEY) return { skipped: true };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to,
      subject: 'Reset your Elika password',
      html: `
        <p>Hello,</p>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 1 hour.</p>
      `,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message || payload?.error || 'Failed to send reset email';
    throw new Error(message);
  }

  return { skipped: false };
};

const formatOrderNumber = (id) => `ORD-${String(id).padStart(6, '0')}`;
const parseOrderNumber = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().toUpperCase();
  const match = /^ORD-(\d+)$/.exec(trimmed);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
};

// MySQL Connection Pool
console.log('Connecting with configuration:');
console.log(`- Host: ${process.env.DB_HOST}`);
console.log(`- User: ${process.env.DB_USER}`);
console.log(`- Database: ${process.env.DB_NAME}`);
console.log(`- Password set: ${process.env.DB_PASSWORD ? 'YES' : 'NO'}`);

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'elika_store',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

// Initial Database Setup (Run manually or on startup)
const initializeDb = async () => {
  try {
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS category_subsections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_category_subsection (category_id, slug),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        original_price DECIMAL(10, 2),
        stock_count INT DEFAULT 0,
        in_stock BOOLEAN DEFAULT TRUE,
        category_id INT,
        subsection_id INT,
        images JSON,
        image_labels JSON,
        features JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (subsection_id) REFERENCES category_subsections(id) ON DELETE SET NULL
      )
    `);

    try {
      await promisePool.query('ALTER TABLE products ADD COLUMN subsection_id INT NULL');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    try {
      await promisePool.query(
        'ALTER TABLE products ADD CONSTRAINT fk_products_subsection FOREIGN KEY (subsection_id) REFERENCES category_subsections(id) ON DELETE SET NULL'
      );
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME') throw err;
    }

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        rating INT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        customer_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        street VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        region VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(50) NOT NULL,
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
        shipping DECIMAL(10,2) NOT NULL DEFAULT 0,
        tax DECIMAL(10,2) NOT NULL DEFAULT 0,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        line_total DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        subject VARCHAR(255),
        message TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safe migrations for existing DBs
    try {
      await promisePool.query('ALTER TABLE products ADD COLUMN features JSON');
    } catch (err) {
      // ignore if column exists
    }
    try {
      await promisePool.query('ALTER TABLE products ADD COLUMN image_labels JSON');
    } catch (err) {
      // ignore if column exists
    }
    try {
      await promisePool.query('ALTER TABLE orders ADD COLUMN customer_id INT');
      await promisePool.query('ALTER TABLE orders ADD INDEX (customer_id)');
    } catch (err) {
      // ignore if column exists
    }
    console.log("Database tables initialized or already exist.");
  } catch (err) {
    console.error("Error initializing database:", err.message);
  }
};

initializeDb();

// Auth routes (admin)
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const [rows] = await promisePool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1',
      [String(username).trim()]
    );

    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    setAuthCookie(res, token);
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer auth
app.post('/api/customer/signup', async (req, res) => {
  const { fullName, email, password } = req.body || {};
  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  try {
    const [existing] = await promisePool.query(
      'SELECT id FROM customers WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );
    if (existing.length) return res.status(409).json({ error: 'Email already exists' });

    const passwordHash = await bcrypt.hash(String(password), 12);
    const [result] = await promisePool.query(
      'INSERT INTO customers (full_name, email, password_hash) VALUES (?, ?, ?)',
      [String(fullName).trim(), normalizedEmail, passwordHash]
    );

    const user = { id: result.insertId, full_name: String(fullName).trim(), email: normalizedEmail };
    const token = signCustomerToken(user);
    setCustomerCookie(res, token);
    res.status(201).json({ user: { id: user.id, name: user.full_name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customer/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const [rows] = await promisePool.query(
      'SELECT id, full_name, email, password_hash FROM customers WHERE email = ? LIMIT 1',
      [String(email).trim().toLowerCase()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signCustomerToken(user);
    setCustomerCookie(res, token);
    res.json({ user: { id: user.id, name: user.full_name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customer/me', (req, res) => {
  const user = getCustomerUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ user: { id: user.sub, name: user.name, email: user.email } });
});

app.post('/api/customer/logout', (req, res) => {
  clearCustomerCookie(res);
  res.status(204).send();
});

app.post('/api/customer/reset-request', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const [rows] = await promisePool.query(
      'SELECT id, email FROM customers WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (rows.length) {
      const user = rows[0];
      const token = crypto.randomBytes(24).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await promisePool.query(
        'INSERT INTO password_resets (customer_id, token_hash, expires_at) VALUES (?, ?, ?)',
        [user.id, tokenHash, expiresAt]
      );

      const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
      const resetUrl = `${origin}/reset-password?token=${token}`;

      try {
        await sendResetEmail({ to: normalizedEmail, resetUrl });
        return res.json({ message: 'If the email exists, a reset link will be sent.' });
      } catch (err) {
        return res.status(500).json({ error: err.message, resetUrl });
      }
    }

    res.json({ message: 'If the email exists, a reset link will be sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customer/reset', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const [rows] = await promisePool.query(
      `
      SELECT pr.id, pr.customer_id, pr.expires_at, pr.used_at
      FROM password_resets pr
      WHERE pr.token_hash = ?
      LIMIT 1
      `,
      [tokenHash]
    );

    if (!rows.length) return res.status(400).json({ error: 'Invalid token' });
    const reset = rows[0];
    if (reset.used_at) return res.status(400).json({ error: 'Token already used' });
    if (new Date(reset.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Token expired' });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);
    await promisePool.query('UPDATE customers SET password_hash = ? WHERE id = ?', [
      passwordHash,
      reset.customer_id,
    ]);
    await promisePool.query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [reset.id]);

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ user: { id: user.sub, username: user.username, role: user.role } });
});

// Routes
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await promisePool.query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             s.name as subsection_name, s.slug as subsection_slug,
             COALESCE(rv.review_count, 0) AS review_count,
             COALESCE(rv.rating_avg, 0) AS rating_avg
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN category_subsections s ON p.subsection_id = s.id
      LEFT JOIN (
        SELECT product_id, COUNT(*) AS review_count, AVG(rating) AS rating_avg
        FROM reviews
        GROUP BY product_id
      ) rv ON rv.product_id = p.id
      ORDER BY p.created_at DESC
    `);
    const normalized = rows.map((row) => {
      let images = row.images;
      if (typeof images === 'string') {
        try {
          images = JSON.parse(images || '[]');
        } catch {
          images = [];
        }
      }
      let features = row.features;
      if (typeof features === 'string') {
        try {
          features = JSON.parse(features || '[]');
        } catch {
          features = [];
        }
      }

      let image_labels = row.image_labels;
      if (typeof image_labels === 'string') {
        try {
          image_labels = JSON.parse(image_labels || '[]');
        } catch {
          image_labels = [];
        }
      }

      return { ...row, images, features, image_labels };
    });
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await promisePool.query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             s.name as subsection_name, s.slug as subsection_slug,
             COALESCE(rv.review_count, 0) AS review_count,
             COALESCE(rv.rating_avg, 0) AS rating_avg
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN category_subsections s ON p.subsection_id = s.id
      LEFT JOIN (
        SELECT product_id, COUNT(*) AS review_count, AVG(rating) AS rating_avg
        FROM reviews
        GROUP BY product_id
      ) rv ON rv.product_id = p.id
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const row = rows[0];
    let images = row.images;
    if (typeof images === 'string') {
      try {
        images = JSON.parse(images || '[]');
      } catch {
        images = [];
      }
    }

    let features = row.features;
    if (typeof features === 'string') {
      try {
        features = JSON.parse(features || '[]');
      } catch {
        features = [];
      }
    }

    let image_labels = row.image_labels;
    if (typeof image_labels === 'string') {
      try {
        image_labels = JSON.parse(image_labels || '[]');
      } catch {
        image_labels = [];
      }
    }

    res.json({ ...row, images, features, image_labels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reviews
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      'SELECT id, product_id, name, rating, comment, created_at FROM reviews WHERE product_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/:id/reviews', async (req, res) => {
  const productId = coerceNumber(req.params.id);
  const { name, rating, comment } = req.body || {};
  const ratingNum = coerceNumber(rating);

  if (!productId) return res.status(400).json({ error: 'Invalid product id' });
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Name is required' });
  if (!comment || typeof comment !== 'string') return res.status(400).json({ error: 'Comment is required' });
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

  try {
    const [result] = await promisePool.query(
      'INSERT INTO reviews (product_id, name, rating, comment) VALUES (?, ?, ?, ?)',
      [productId, name.trim(), ratingNum, comment.trim()]
    );
    res.status(201).json({
      id: result.insertId,
      product_id: productId,
      name: name.trim(),
      rating: ratingNum,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await promisePool.query(`
      SELECT c.*, COUNT(p.id) AS productCount
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Contact messages (public submit)
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  try {
    const [result] = await promisePool.query(
      `
      INSERT INTO contact_messages (name, email, phone, subject, message)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        String(name).trim(),
        String(email).trim(),
        phone ? String(phone).trim() : null,
        subject ? String(subject).trim() : null,
        String(message).trim(),
      ]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Contact messages (admin)
app.get('/api/contact', requireAdmin, async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `
      SELECT id, name, email, phone, subject, message, status, created_at
      FROM contact_messages
      ORDER BY created_at DESC
      LIMIT 200
      `
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/contact/:id', requireAdmin, async (req, res) => {
  const messageId = coerceNumber(req.params.id);
  if (!messageId) return res.status(400).json({ error: 'Invalid message id' });

  const status = req.body?.status ? String(req.body.status).trim() : '';
  if (!status) return res.status(400).json({ error: 'Status is required' });

  const allowed = new Set(['new', 'completed']);
  if (!allowed.has(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await promisePool.query('UPDATE contact_messages SET status = ? WHERE id = ?', [
      status,
      messageId,
    ]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders (public create, admin manage)
app.post('/api/orders', async (req, res) => {
  const customer = getCustomerUser(req);
  if (!customer) return res.status(401).json({ error: 'Unauthorized' });
  const body = req.body || {};
  const customerInfo = body.customer || {};
  const items = Array.isArray(body.items) ? body.items : [];

  const customer_name = String(customerInfo.fullName || customer.name || '').trim();
  const phone = String(customerInfo.phone || '').trim();
  const street = String(customerInfo.street || '').trim();
  const city = String(customerInfo.city || '').trim();
  const region =
    customerInfo.region !== undefined && customerInfo.region !== null
      ? String(customerInfo.region).trim()
      : null;

  const payment_method = String(body.paymentMethod || body.payment_method || '').trim();
  const payment_status = String(body.paymentStatus || body.payment_status || 'pending').trim() || 'pending';
  const status = String(body.status || 'pending').trim() || 'pending';

  const shipping = coerceNumber(body.shipping) ?? 0;
  const tax = coerceNumber(body.tax) ?? 0;

  if (!customer_name || !phone || !street || !city) {
    return res.status(400).json({ error: 'Missing required customer fields' });
  }
  if (!payment_method) {
    return res.status(400).json({ error: 'Payment method is required' });
  }
  if (!items.length) {
    return res.status(400).json({ error: 'Order items are required' });
  }

  const normalizedItems = items
    .map((it) => ({
      product_id: coerceNumber(it.productId ?? it.product_id),
      quantity: coerceNumber(it.quantity),
    }))
    .filter((it) => it.product_id && it.quantity && it.quantity > 0);

  if (!normalizedItems.length) {
    return res.status(400).json({ error: 'Invalid order items' });
  }

  const connection = await pool.promise().getConnection();
  try {
    await connection.beginTransaction();

    const productIds = [...new Set(normalizedItems.map((i) => i.product_id))];
    const [productRows] = await connection.query(
      `SELECT id, name, price FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
      productIds
    );

    const productsById = new Map();
    for (const p of productRows) productsById.set(Number(p.id), p);

    for (const i of normalizedItems) {
      if (!productsById.has(Number(i.product_id))) {
        return res.status(400).json({ error: `Unknown product id: ${i.product_id}` });
      }
    }

    let subtotal = 0;
    const itemRows = normalizedItems.map((i) => {
      const p = productsById.get(Number(i.product_id));
      const unit = Number(p.price);
      const line = unit * Number(i.quantity);
      subtotal += line;
      return {
        product_id: Number(i.product_id),
        product_name: String(p.name),
        quantity: Number(i.quantity),
        unit_price: unit,
        line_total: line,
      };
    });

    const total = Number(subtotal) + Number(shipping) + Number(tax);

    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        customer_id, customer_name, email, phone, street, city, region,
        status, payment_method, payment_status,
        subtotal, shipping, tax, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(customer.sub),
        customer_name,
        String(customer.email || '').trim(),
        phone,
        street,
        city,
        region,
        status,
        payment_method,
        payment_status,
        subtotal,
        shipping,
        tax,
        total,
      ]
    );

    const orderId = orderResult.insertId;

    for (const row of itemRows) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, row.product_id, row.product_name, row.quantity, row.unit_price, row.line_total]
      );
    }

    await connection.commit();
    res.status(201).json({
      id: orderId,
      orderNumber: formatOrderNumber(orderId),
      total,
      status,
      paymentStatus: payment_status,
    });
  } catch (err) {
    try {
      await connection.rollback();
    } catch {
      // ignore
    }
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

app.get('/api/orders', requireAdmin, async (req, res) => {
  try {
    const [rows] = await promisePool.query(`
      SELECT
        o.id,
        o.customer_name,
        o.email,
        o.phone,
        o.status,
        o.payment_method,
        o.payment_status,
        o.total,
        o.created_at,
        COALESCE(SUM(oi.quantity), 0) AS items_qty
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 200
    `);

    res.json(
      rows.map((r) => ({
        id: Number(r.id),
        orderNumber: formatOrderNumber(r.id),
        customer: r.customer_name,
        email: r.email,
        phone: r.phone,
        items: Number(r.items_qty || 0),
        total: Number(r.total || 0),
        status: r.status,
        paymentMethod: r.payment_method,
        paymentStatus: r.payment_status,
        date: r.created_at,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', requireAdmin, async (req, res) => {
  const orderId = coerceNumber(req.params.id);
  if (!orderId) return res.status(400).json({ error: 'Invalid order id' });

  try {
    const [orderRows] = await promisePool.query(
      `SELECT * FROM orders WHERE id = ? LIMIT 1`,
      [orderId]
    );
    if (!orderRows.length) return res.status(404).json({ error: 'Order not found' });

    const order = orderRows[0];
    const [itemRows] = await promisePool.query(
      `SELECT id, product_id, product_name, quantity, unit_price, line_total
       FROM order_items
       WHERE order_id = ?
       ORDER BY id ASC`,
      [orderId]
    );

    res.json({
      id: Number(order.id),
      orderNumber: formatOrderNumber(order.id),
      customer: {
        name: order.customer_name,
        email: order.email,
        phone: order.phone,
        street: order.street,
        city: order.city,
        region: order.region,
      },
      status: order.status,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      subtotal: Number(order.subtotal || 0),
      shipping: Number(order.shipping || 0),
      tax: Number(order.tax || 0),
      total: Number(order.total || 0),
      createdAt: order.created_at,
      items: itemRows.map((it) => ({
        id: Number(it.id),
        productId: Number(it.product_id),
        name: it.product_name,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        lineTotal: Number(it.line_total),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id', requireAdmin, async (req, res) => {
  const orderId = coerceNumber(req.params.id);
  if (!orderId) return res.status(400).json({ error: 'Invalid order id' });

  const { status, paymentStatus } = req.body || {};
  const nextStatus = status !== undefined && status !== null ? String(status).trim() : null;
  const nextPaymentStatus =
    paymentStatus !== undefined && paymentStatus !== null ? String(paymentStatus).trim() : null;

  if (!nextStatus && !nextPaymentStatus) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    const fields = [];
    const params = [];
    if (nextStatus) {
      fields.push('status = ?');
      params.push(nextStatus);
    }
    if (nextPaymentStatus) {
      fields.push('payment_status = ?');
      params.push(nextPaymentStatus);
    }
    params.push(orderId);

    await promisePool.query(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, params);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders (customer)
app.get('/api/me/orders', requireCustomer, async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `
      SELECT id, total, status, payment_status, created_at
      FROM orders
      WHERE customer_id = ?
      ORDER BY created_at DESC
      LIMIT 200
      `,
      [Number(req.customer.sub)]
    );

    res.json(
      rows.map((r) => ({
        id: Number(r.id),
        orderNumber: formatOrderNumber(r.id),
        total: Number(r.total || 0),
        status: r.status,
        paymentStatus: r.payment_status,
        date: r.created_at,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/me/orders/:orderNumber', requireCustomer, async (req, res) => {
  const orderId = parseOrderNumber(req.params.orderNumber);
  if (!orderId) return res.status(400).json({ error: 'Invalid order number' });

  try {
    const [orderRows] = await promisePool.query(
      `
      SELECT
        id, customer_name, email, phone, street, city, region,
        status, payment_method, payment_status,
        subtotal, shipping, tax, total, created_at
      FROM orders
      WHERE id = ? AND customer_id = ?
      LIMIT 1
      `,
      [orderId, Number(req.customer.sub)]
    );

    if (!orderRows.length) return res.status(404).json({ error: 'Order not found' });
    const order = orderRows[0];

    const [itemRows] = await promisePool.query(
      `
      SELECT id, product_id, product_name, quantity, unit_price, line_total
      FROM order_items
      WHERE order_id = ?
      ORDER BY id ASC
      `,
      [orderId]
    );

    res.json({
      id: Number(order.id),
      orderNumber: formatOrderNumber(order.id),
      customer: {
        name: order.customer_name,
        email: order.email,
        phone: order.phone,
        street: order.street,
        city: order.city,
        region: order.region,
      },
      status: order.status,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      subtotal: Number(order.subtotal || 0),
      shipping: Number(order.shipping || 0),
      tax: Number(order.tax || 0),
      total: Number(order.total || 0),
      createdAt: order.created_at,
      items: itemRows.map((it) => ({
        id: Number(it.id),
        productId: Number(it.product_id),
        name: it.product_name,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        lineTotal: Number(it.line_total),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', requireAdmin, async (req, res) => {
  const { name, slug, image } = req.body;
  try {
    const [result] = await promisePool.query(
      'INSERT INTO categories (name, slug, image) VALUES (?, ?, ?)',
      [name, slug, image]
    );
    res.status(201).json({ id: result.insertId, name, slug, image });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', requireAdmin, async (req, res) => {
  const { name, slug, image } = req.body;
  try {
    await promisePool.query(
      'UPDATE categories SET name = ?, slug = ?, image = ? WHERE id = ?',
      [name, slug, image, req.params.id]
    );
    res.json({ id: req.params.id, name, slug, image });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
  try {
    await promisePool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories/:id/subsections', requireAdmin, async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `
      SELECT id, category_id, name, slug, created_at
      FROM category_subsections
      WHERE category_id = ?
      ORDER BY name
      `,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories/:id/subsections', requireAdmin, async (req, res) => {
  const { name, slug } = req.body || {};
  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required' });
  }
  try {
    const [result] = await promisePool.query(
      'INSERT INTO category_subsections (category_id, name, slug) VALUES (?, ?, ?)',
      [req.params.id, name, slug]
    );
    res.status(201).json({ id: result.insertId, category_id: req.params.id, name, slug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subsections/:id', requireAdmin, async (req, res) => {
  const { name, slug } = req.body || {};
  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required' });
  }
  try {
    await promisePool.query(
      'UPDATE category_subsections SET name = ?, slug = ? WHERE id = ?',
      [name, slug, req.params.id]
    );
    res.json({ id: req.params.id, name, slug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subsections/:id', requireAdmin, async (req, res) => {
  try {
    await promisePool.query('DELETE FROM category_subsections WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Products CRUD
app.post('/api/products', requireAdmin, upload.any(), async (req, res) => {
  const { name, description } = req.body;
  const price = coerceNumber(req.body.price) ?? 0;
  const stock_count = coerceNumber(req.body.stock_count) ?? 0;
  const category_id = coerceNumber(req.body.category_id);
  const subsection_id = coerceNumber(req.body.subsection_id);

  const featuresArray = parseStringArray(req.body.features);
  const imageLabelsArray = parseJsonStringArrayPreserveEmpty(req.body.image_labels);

  const allFiles = Array.isArray(req.files) ? req.files : [];
  const frontFile = allFiles.find((f) => f.fieldname === 'front_image');
  const backFile = allFiles.find((f) => f.fieldname === 'back_image');
  const imagesFiles = allFiles.filter((f) => f.fieldname === 'images');

  let imagesArray = [];
  let effectiveImageLabels = imageLabelsArray;

  if (frontFile || backFile) {
    if (!frontFile || !backFile) {
      return res.status(400).json({ error: 'Please upload both Front Image and Back Image' });
    }
    imagesArray = [`/uploads/${frontFile.filename}`, `/uploads/${backFile.filename}`];
    effectiveImageLabels = ['Front', 'Back'];
  } else {
    const uploadedImages = imagesFiles.map((f) => `/uploads/${f.filename}`);
    imagesArray = uploadedImages.length ? uploadedImages : parseStringArray(req.body.images);
  }

  try {
    const imagesJson = JSON.stringify(imagesArray);
    const featuresJson = JSON.stringify(featuresArray);
    const imageLabelsJson = JSON.stringify(effectiveImageLabels);
    const [result] = await promisePool.query(
      'INSERT INTO products (name, description, price, stock_count, category_id, subsection_id, images, features, image_labels) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        description,
        price,
        stock_count,
        category_id ?? null,
        subsection_id ?? null,
        imagesJson,
        featuresJson,
        imageLabelsJson,
      ]
    );
    res.status(201).json({
      id: result.insertId,
      name,
      description,
      price,
      stock_count,
      category_id: category_id ?? null,
      subsection_id: subsection_id ?? null,
      images: imagesArray,
      features: featuresArray,
      image_labels: effectiveImageLabels,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', requireAdmin, upload.any(), async (req, res) => {
  const { name, description } = req.body;
  const price = coerceNumber(req.body.price) ?? 0;
  const stock_count = coerceNumber(req.body.stock_count) ?? 0;
  const category_id = coerceNumber(req.body.category_id);
  const subsection_id = coerceNumber(req.body.subsection_id);

  const featuresArray = req.body.features === undefined ? undefined : parseStringArray(req.body.features);
  const imageLabelsArray =
    req.body.image_labels === undefined
      ? undefined
      : parseJsonStringArrayPreserveEmpty(req.body.image_labels);

  const allFiles = Array.isArray(req.files) ? req.files : [];
  const frontFile = allFiles.find((f) => f.fieldname === 'front_image');
  const backFile = allFiles.find((f) => f.fieldname === 'back_image');
  const imagesFiles = allFiles.filter((f) => f.fieldname === 'images');

  try {
    const params = [name, description, price, stock_count, category_id ?? null, subsection_id ?? null];
    let sql =
      'UPDATE products SET name = ?, description = ?, price = ?, stock_count = ?, category_id = ?, subsection_id = ?';

    // Two-image UX: replace front/back slots when provided.
    if (frontFile || backFile) {
      const [existingRows] = await promisePool.query('SELECT images FROM products WHERE id = ?', [req.params.id]);
      const existing = existingRows && existingRows[0] ? existingRows[0] : null;
      let existingImages = [];
      if (existing && existing.images) {
        if (Array.isArray(existing.images)) {
          existingImages = existing.images;
        } else if (typeof existing.images === 'string') {
          try {
            existingImages = JSON.parse(existing.images || '[]');
          } catch {
            existingImages = [];
          }
        }
      }

      const nextImages = [existingImages[0], existingImages[1]];
      if (frontFile) nextImages[0] = `/uploads/${frontFile.filename}`;
      if (backFile) nextImages[1] = `/uploads/${backFile.filename}`;

      // Ensure array has exactly 2 entries
      const normalizedTwo = [nextImages[0] || null, nextImages[1] || null].filter((v) => typeof v === 'string');
      if (normalizedTwo.length < 2) {
        // if one side missing, keep whatever we have; frontend expects two but we won't hard-fail edits
      }

      sql += ', images = ?, image_labels = ?';
      params.push(JSON.stringify([nextImages[0] || '', nextImages[1] || ''].filter(Boolean)));
      params.push(JSON.stringify(['Front', 'Back']));
    } else if (imagesFiles.length > 0) {
      // Fallback: replace images list from multi-upload
      const uploaded = imagesFiles.map((f) => `/uploads/${f.filename}`);
      sql += ', images = ?';
      params.push(JSON.stringify(uploaded));
      if (imageLabelsArray !== undefined) {
        sql += ', image_labels = ?';
        params.push(JSON.stringify(imageLabelsArray));
      }
    }

    // Only replace features if provided
    if (featuresArray !== undefined) {
      sql += ', features = ?';
      params.push(JSON.stringify(featuresArray));
    }

    // If no images were uploaded, only replace image labels if provided
    if (!frontFile && !backFile && imagesFiles.length === 0 && imageLabelsArray !== undefined) {
      sql += ', image_labels = ?';
      params.push(JSON.stringify(imageLabelsArray));
    }

    sql += ' WHERE id = ?';
    params.push(req.params.id);

    await promisePool.query(sql, params);

    // Return the updated row shape (including images if replaced)
    const [rows] = await promisePool.query(
      `
      SELECT p.*, c.name as category_name, s.name as subsection_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN category_subsections s ON p.subsection_id = s.id
      WHERE p.id = ?
      `,
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const row = rows[0];
    let images = row.images;
    if (typeof images === 'string') {
      try {
        images = JSON.parse(images || '[]');
      } catch {
        images = [];
      }
    }

    let features = row.features;
    if (typeof features === 'string') {
      try {
        features = JSON.parse(features || '[]');
      } catch {
        features = [];
      }
    }

    let image_labels = row.image_labels;
    if (typeof image_labels === 'string') {
      try {
        image_labels = JSON.parse(image_labels || '[]');
      } catch {
        image_labels = [];
      }
    }

    res.json({ ...row, images, features, image_labels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    await promisePool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats Routes
app.get('/api/stats', requireAdmin, async (req, res) => {
  try {
    const [[{ count: productCount }]] = await promisePool.query('SELECT COUNT(*) as count FROM products');
    const [[{ count: categoryCount }]] = await promisePool.query('SELECT COUNT(*) as count FROM categories');
    const [[{ totalValue }]] = await promisePool.query('SELECT SUM(price * stock_count) as totalValue FROM products');
    
    const [topProducts] = await promisePool.query(`
      SELECT p.id, p.name, p.price,
             COALESCE(rv.review_count, 0) AS review_count
      FROM products p
      LEFT JOIN (
        SELECT product_id, COUNT(*) AS review_count
        FROM reviews
        GROUP BY product_id
      ) rv ON rv.product_id = p.id
      ORDER BY rv.review_count DESC, p.created_at DESC
      LIMIT 5
    `);

    const [recentOrders] = await promisePool.query(`
      SELECT id, customer_name, total, status, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const [recentContacts] = await promisePool.query(`
      SELECT id, name, email, subject, created_at, status
      FROM contact_messages
      ORDER BY created_at DESC
      LIMIT 5
    `);

    res.json({
      productCount,
      categoryCount,
      totalValue: totalValue || 0,
      topProducts,
      recentOrders: recentOrders.map((o) => ({
        id: Number(o.id),
        orderNumber: formatOrderNumber(o.id),
        customer: o.customer_name,
        total: Number(o.total || 0),
        status: o.status,
        date: o.created_at,
      })),
      recentContacts: recentContacts.map((c) => ({
        id: Number(c.id),
        name: c.name,
        email: c.email,
        subject: c.subject,
        status: c.status,
        date: c.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
