const API = '';
const token = localStorage.getItem('avdic_token');
let user = null;

// --- AUTH CHECK ---
async function checkAuth() {
  if (!token) { redirectLogin(); return; }
  try {
    const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { localStorage.removeItem('avdic_token'); localStorage.removeItem('avdic_user'); redirectLogin(); return; }
    const data = await res.json();
    user = data.user;
    localStorage.setItem('avdic_user', JSON.stringify(user));
    initUI();
  } catch { redirectLogin(); }
}

function redirectLogin() {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px;font-family:Poppins,sans-serif;background:#f1f5f9;">
      <div style="background:#fff;padding:48px 40px;border-radius:16px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:420px;">
        <div style="font-size:48px;margin-bottom:16px;">🔒</div>
        <h2 style="margin-bottom:8px;">Pristup odbijen</h2>
        <p style="color:#6b7280;margin-bottom:24px;">Morate se prijaviti za pristup CMS panelu.</p>
        <a href="/login.html" style="display:inline-block;padding:12px 32px;background:#1db954;color:#fff;border-radius:10px;font-weight:600;text-decoration:none;">Prijavi se</a>
      </div>
    </div>`;
}

// --- INIT ---
function initUI() {
  document.getElementById('sidebarAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('sidebarName').textContent = user.name;
  document.getElementById('sidebarEmail').textContent = user.email;
  
  // Navigation
  document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      switchPage(page);
      document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
  
  // New post button in posts list
  document.getElementById('gotoNewPost').addEventListener('click', () => {
    switchPage('new-post');
    document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
    document.querySelector('.sidebar-nav a[data-page="new-post"]').classList.add('active');
  });
  
  // Save post
  document.getElementById('saveBtn').addEventListener('click', () => savePost(true));
  document.getElementById('saveDraftBtn').addEventListener('click', () => savePost(false));
  document.getElementById('cancelBtn').addEventListener('click', resetForm);
  
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('avdic_token');
    localStorage.removeItem('avdic_user');
    window.location.href = '/login.html';
  });
  
  // Mobile toggle
  document.getElementById('mobileToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
  
  // Load dashboard
  switchPage('dashboard');
}

// --- PAGE SWITCHING ---
function switchPage(page) {
  ['dashboard','posts','new-post'].forEach(p => {
    document.getElementById(`page-${p}`).style.display = p === page ? 'block' : 'none';
  });
  
  if (page === 'dashboard') {
    document.getElementById('pageTitle').textContent = 'Dashboard';
    document.getElementById('breadcrumb').textContent = 'Pregled statistike';
    loadDashboardStats();
    loadRecentPosts();
  } else if (page === 'posts') {
    document.getElementById('pageTitle').textContent = 'Svi članci';
    document.getElementById('breadcrumb').textContent = 'Lista svih članaka';
    loadAllPosts();
  } else if (page === 'new-post') {
    if (!document.getElementById('editId').value) {
      document.getElementById('pageTitle').textContent = 'Novi članak';
      document.getElementById('breadcrumb').textContent = 'Kreirajte novi blog post';
    }
  }
}

// --- DASHBOARD ---
async function loadDashboardStats() {
  try {
    const res = await fetch(`${API}/api/admin/posts`, { headers: { Authorization: `Bearer ${token}` } });
    const { posts } = await res.json();
    document.getElementById('statTotal').textContent = posts.length;
    document.getElementById('statPublished').textContent = posts.filter(p => p.published).length;
    document.getElementById('statDrafts').textContent = posts.filter(p => !p.published).length;
    document.getElementById('statAuthor').textContent = user.name.split(' ')[0];
  } catch {}
}

async function loadRecentPosts() {
  try {
    const res = await fetch(`${API}/api/admin/posts`, { headers: { Authorization: `Bearer ${token}` } });
    const { posts } = await res.json();
    const tbody = document.getElementById('recentPosts');
    const empty = document.getElementById('emptyRecent');
    if (!posts.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tbody.innerHTML = posts.slice(0,5).map(p => `
      <tr>
        <td><strong>${escapeHtml(p.title)}</strong></td>
        <td><span class="badge ${p.published ? 'badge-pub' : 'badge-draft'}">${p.published ? 'Objavljen' : 'Skica'}</span></td>
        <td style="color:#6b7280;font-size:13px;">${new Date(p.created_at).toLocaleDateString('bs')}</td>
        <td class="actions-cell">
          <button class="btn-edit" data-id="${p.id}">✏️ Uredi</button>
          <button class="btn-del" data-id="${p.id}" style="background:rgba(231,76,60,.1);color:#e74c3c;">🗑</button>
        </td>
      </tr>
    `).join('');
    tbody.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', () => editPostById(posts, b.dataset.id)));
    tbody.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', () => deletePostById(b.dataset.id)));
  } catch {}
}

async function loadAllPosts() {
  try {
    const res = await fetch(`${API}/api/admin/posts`, { headers: { Authorization: `Bearer ${token}` } });
    const { posts } = await res.json();
    const tbody = document.getElementById('allPosts');
    const empty = document.getElementById('emptyAll');
    if (!posts.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tbody.innerHTML = posts.map(p => `
      <tr>
        <td><strong>${escapeHtml(p.title)}</strong></td>
        <td><span class="badge ${p.published ? 'badge-pub' : 'badge-draft'}">${p.published ? 'Objavljen' : 'Skica'}</span></td>
        <td style="color:#6b7280;font-size:13px;">${new Date(p.created_at).toLocaleDateString('bs')}</td>
        <td class="actions-cell">
          <button class="btn-edit" data-id="${p.id}">✏️ Uredi</button>
          <button class="btn-del" data-id="${p.id}" style="background:rgba(231,76,60,.1);color:#e74c3c;">🗑</button>
        </td>
      </tr>
    `).join('');
    tbody.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', () => editPostById(posts, b.dataset.id)));
    tbody.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', () => deletePostById(b.dataset.id)));
  } catch {}
}

// --- POST CRUD ---
let editingId = null;

async function savePost(published) {
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();
  const excerpt = document.getElementById('excerpt').value.trim();
  const image_url = document.getElementById('image_url').value.trim();
  const meta_title = document.getElementById('meta_title').value.trim();
  const meta_description = document.getElementById('meta_description').value.trim();
  const msg = document.getElementById('formMsg');
  msg.className = 'msg';
  msg.style.display = 'none';

  if (!title || !content) {
    msg.textContent = 'Naslov i sadržaj su obavezni.';
    msg.className = 'msg error'; return;
  }

  const body = { title, content, excerpt, image_url, meta_title, meta_description, published: published ? 1 : 0 };
  const url = editingId ? `${API}/api/admin/posts/${editingId}` : `${API}/api/admin/posts`;
  const method = editingId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error; msg.className = 'msg error'; return; }

    msg.textContent = editingId ? '✅ Članak uspešno ažuriran!' : '✅ Članak uspešno objavljen!';
    msg.className = 'msg success';
    resetForm();
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
    
    if (document.getElementById('page-dashboard').style.display !== 'none') {
      loadDashboardStats(); loadRecentPosts();
    }
    if (document.getElementById('page-posts').style.display !== 'none') loadAllPosts();
  } catch {
    msg.textContent = 'Greška pri čuvanju.'; msg.className = 'msg error';
  }
}

function editPostById(posts, id) {
  const post = posts.find(p => p.id == id);
  if (!post) return;
  editingId = post.id;
  document.getElementById('editId').value = post.id;
  document.getElementById('title').value = post.title;
  document.getElementById('content').value = post.content;
  document.getElementById('excerpt').value = post.excerpt || '';
  document.getElementById('image_url').value = post.image_url || '';
  document.getElementById('meta_title').value = post.meta_title || '';
  document.getElementById('meta_description').value = post.meta_description || '';
  document.getElementById('formTitle').textContent = '✏️ Uredi članak';
  document.getElementById('cancelBtn').style.display = 'inline-flex';
  document.getElementById('pageTitle').textContent = 'Uredi članak';
  document.getElementById('breadcrumb').textContent = 'Izmena postojećeg članka';
  
  switchPage('new-post');
  document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
  document.querySelector('.sidebar-nav a[data-page="new-post"]').classList.add('active');
}

function resetForm() {
  editingId = null;
  document.getElementById('editId').value = '';
  document.getElementById('title').value = '';
  document.getElementById('content').value = '';
  document.getElementById('excerpt').value = '';
  document.getElementById('image_url').value = '';
  document.getElementById('meta_title').value = '';
  document.getElementById('meta_description').value = '';
  document.getElementById('formTitle').textContent = '✍️ Novi članak';
  document.getElementById('cancelBtn').style.display = 'none';
  document.getElementById('pageTitle').textContent = 'Novi članak';
  document.getElementById('breadcrumb').textContent = 'Kreirajte novi blog post';
  document.getElementById('formMsg').style.display = 'none';
}

async function deletePostById(id) {
  if (!confirm('Sigurno želite obrisati ovaj članak? Ova akcija je nepovratna.')) return;
  try {
    await fetch(`${API}/api/admin/posts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadDashboardStats(); loadRecentPosts(); loadAllPosts();
  } catch { alert('Greška pri brisanju.'); }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// --- START ---
checkAuth();
