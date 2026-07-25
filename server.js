import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'avdic-media-jwt-secret-key-2024';

app.use(cors());
app.use(express.json());

// --- Database ---
const db = new Database('avdic.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    meta_title TEXT DEFAULT '',
    meta_description TEXT DEFAULT '',
    author_id INTEGER NOT NULL,
    published INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id)
  );


`);

// Migrate existing tables (ignore errors if columns already exist)
try { db.exec("ALTER TABLE posts ADD COLUMN meta_title TEXT DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE posts ADD COLUMN meta_description TEXT DEFAULT ''"); } catch {}

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

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Sva polja su obavezna.' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'Email je već registrovan.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const r = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hash);
  const token = jwt.sign({ id: r.lastInsertRowid, name, email }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: r.lastInsertRowid, name, email } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email i lozinka su obavezni.' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Pogrešan email ili lozinka.' });
  }
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Korisnik nije pronađen.' });
  res.json({ user });
});

// --- BLOG (PUBLIC) ---

app.get('/api/posts', (_req, res) => {
  const posts = db.prepare(`
    SELECT p.id, p.title, p.slug, p.excerpt, p.image_url, p.created_at, u.name AS author_name
    FROM posts p JOIN users u ON p.author_id = u.id
    WHERE p.published = 1 ORDER BY p.created_at DESC
  `).all();
  res.json({ posts });
});

app.get('/api/posts/:slug', (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.name AS author_name
    FROM posts p JOIN users u ON p.author_id = u.id
    WHERE p.slug = ? AND p.published = 1
  `).get(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post nije pronađen.' });
  res.json({ post });
});

// --- BLOG (ADMIN) ---

app.get('/api/admin/posts', auth, (req, res) => {
  const posts = db.prepare(`
    SELECT * FROM posts WHERE author_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  res.json({ posts });
});

app.post('/api/admin/posts', auth, (req, res) => {
  const { title, content, excerpt, image_url, meta_title, meta_description } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Naslov i sadržaj su obavezni.' });
  const slug = title.toLowerCase()
    .replace(/[čć]/g,'c').replace(/[š]/g,'s').replace(/[đ]/g,'d').replace(/[ž]/g,'z')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '-' + Date.now();
  const r = db.prepare(
    'INSERT INTO posts (title, slug, content, excerpt, image_url, meta_title, meta_description, author_id) VALUES (?,?,?,?,?,?,?,?)'
  ).run(title, slug, content, excerpt || '', image_url || '', meta_title || '', meta_description || '', req.user.id);
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ post });
});

app.put('/api/admin/posts/:id', auth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND author_id = ?').get(req.params.id, req.user.id);
  if (!post) return res.status(404).json({ error: 'Post nije pronađen.' });
  const { title, content, excerpt, image_url, meta_title, meta_description, published } = req.body;
  db.prepare(`
    UPDATE posts SET title=?, content=?, excerpt=?, image_url=?, meta_title=?, meta_description=?, published=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(
    title ?? post.title, content ?? post.content, excerpt ?? post.excerpt,
    image_url ?? post.image_url, meta_title ?? post.meta_title, meta_description ?? post.meta_description,
    published ?? post.published, req.params.id
  );
  res.json({ post: db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id) });
});

app.delete('/api/admin/posts/:id', auth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND author_id = ?').get(req.params.id, req.user.id);
  if (!post) return res.status(404).json({ error: 'Post nije pronađen.' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- Static + SPA fallback ---
app.use(express.static(join(__dirname, 'dist')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Avdić Media server pokrenut na portu ${PORT}`);
});
