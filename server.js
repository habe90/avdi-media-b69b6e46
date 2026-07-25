import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'avdic-media-jwt-secret-key-2024';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

app.use(cors());
app.use(express.json());

// --- Database init ---
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    meta_title TEXT DEFAULT '',
    meta_description TEXT DEFAULT '',
    author_id INTEGER NOT NULL REFERENCES users(id),
    published INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`);

// --- Auth middleware ---
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Nedostaje token.' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Nevažeći token.' });
  }
}

// --- AUTH ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Sva polja su obavezna.' });

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Email je već registrovan.' });

    const hash = bcrypt.hashSync(password, 10);
    const r = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hash]
    );
    const id = r.rows[0].id;
    const token = jwt.sign({ id, name, email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id, name, email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška servera.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email i lozinka su obavezni.' });

    const r = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = r.rows[0];
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Pogrešan email ili lozinka.' });
    }
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška servera.' });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    res.json({ user: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška servera.' });
  }
});

// --- BLOG (PUBLIC) ---

app.get('/api/posts', async (_req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.id, p.title, p.slug, p.excerpt, p.image_url, p.created_at, u.name AS author_name
      FROM posts p JOIN users u ON p.author_id = u.id
      WHERE p.published = 1 ORDER BY p.created_at DESC
    `);
    res.json({ posts: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška servera.' });
  }
});

app.get('/api/posts/:slug', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.*, u.name AS author_name
      FROM posts p JOIN users u ON p.author_id = u.id
      WHERE p.slug = $1 AND p.published = 1
    `, [req.params.slug]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Post nije pronađen.' });
    res.json({ post: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška servera.' });
  }
});

// --- BLOG (ADMIN) ---

app.get('/api/admin/posts', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM posts WHERE author_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ posts: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška servera.' });
  }
});

app.post('/api/admin/posts', auth, async (req, res) => {
  try {
    const { title, content, excerpt, image_url, meta_title, meta_description } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Naslov i sadržaj su obavezni.' });

    const slug = title.toLowerCase()
      .replace(/[čć]/g,'c').replace(/[š]/g,'s').replace(/[đ]/g,'d').replace(/[ž]/g,'z')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '-' + Date.now();

    const r = await pool.query(
      `INSERT INTO posts (title, slug, content, excerpt, image_url, meta_title, meta_description, author_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, slug, content, excerpt || '', image_url || '', meta_title || '', meta_description || '', req.user.id]
    );
    res.status(201).json({ post: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška servera.' });
  }
});

app.put('/api/admin/posts/:id', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM posts WHERE id = $1 AND author_id = $2', [req.params.id, req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Post nije pronađen.' });
    const post = r.rows[0];
    const { title, content, excerpt, image_url, meta_title, meta_description, published } = req.body;

    await pool.query(
      `UPDATE posts SET title=$1, content=$2, excerpt=$3, image_url=$4, meta_title=$5, meta_description=$6, published=$7, updated_at=NOW() WHERE id=$8`,
      [
        title ?? post.title, content ?? post.content, excerpt ?? post.excerpt,
        image_url ?? post.image_url, meta_title ?? post.meta_title, meta_description ?? post.meta_description,
        published ?? post.published, req.params.id
      ]
    );
    const updated = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    res.json({ post: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška servera.' });
  }
});

app.delete('/api/admin/posts/:id', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM posts WHERE id = $1 AND author_id = $2', [req.params.id, req.user.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Post nije pronađen.' });
    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška servera.' });
  }
});

// --- Root route ---
app.get('/', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// --- Static ---
app.use(express.static(join(__dirname, 'dist')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Avdić Media server pokrenut na portu ${PORT}`);
});
