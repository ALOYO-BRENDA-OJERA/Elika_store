const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        images JSON,
        image_labels JSON,
        features JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

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
    console.log("Database tables initialized or already exist.");
  } catch (err) {
    console.error("Error initializing database:", err.message);
  }
};

initializeDb();

// Routes
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await promisePool.query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             COALESCE(rv.review_count, 0) AS review_count,
             COALESCE(rv.rating_avg, 0) AS rating_avg
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
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
             COALESCE(rv.review_count, 0) AS review_count,
             COALESCE(rv.rating_avg, 0) AS rating_avg
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
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

app.post('/api/categories', async (req, res) => {
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

app.put('/api/categories/:id', async (req, res) => {
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

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await promisePool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Products CRUD
app.post('/api/products', upload.any(), async (req, res) => {
  const { name, description } = req.body;
  const price = coerceNumber(req.body.price) ?? 0;
  const stock_count = coerceNumber(req.body.stock_count) ?? 0;
  const category_id = coerceNumber(req.body.category_id);

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
      'INSERT INTO products (name, description, price, stock_count, category_id, images, features, image_labels) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, price, stock_count, category_id ?? null, imagesJson, featuresJson, imageLabelsJson]
    );
    res.status(201).json({
      id: result.insertId,
      name,
      description,
      price,
      stock_count,
      category_id: category_id ?? null,
      images: imagesArray,
      features: featuresArray,
      image_labels: effectiveImageLabels,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', upload.any(), async (req, res) => {
  const { name, description } = req.body;
  const price = coerceNumber(req.body.price) ?? 0;
  const stock_count = coerceNumber(req.body.stock_count) ?? 0;
  const category_id = coerceNumber(req.body.category_id);

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
    const params = [name, description, price, stock_count, category_id ?? null];
    let sql = 'UPDATE products SET name = ?, description = ?, price = ?, stock_count = ?, category_id = ?';

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
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
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

app.delete('/api/products/:id', async (req, res) => {
  try {
    await promisePool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats Routes
app.get('/api/stats', async (req, res) => {
  try {
    const [[{ count: productCount }]] = await promisePool.query('SELECT COUNT(*) as count FROM products');
    const [[{ count: categoryCount }]] = await promisePool.query('SELECT COUNT(*) as count FROM categories');
    const [[{ totalValue }]] = await promisePool.query('SELECT SUM(price * stock_count) as totalValue FROM products');
    
    const [topProducts] = await promisePool.query(`
      SELECT id, name, price, stock_count as review_count 
      FROM products 
      ORDER BY stock_count DESC 
      LIMIT 5
    `);

    res.json({
      productCount,
      categoryCount,
      totalValue: totalValue || 0,
      topProducts,
      recentOrders: [] // Placeholder
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
