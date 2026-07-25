const API = '';
const token = localStorage.getItem('avdic_token');
let user = null;

// --- TOAST ---
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✔', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- AUTH ---
async function checkAuth() {
  if (!token) { redirectLogin(); return; }

  // Pokušaj sa keširanim user podacima dok server ne odgovori
  const cached = localStorage.getItem('avdic_user');
  if (cached) {
    try { user = JSON.parse(cached); } catch {}
  }

  try {
    const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      // Samo ako je token stvarno istekao — briši i traži login
      localStorage.removeItem('avdic_token');
      localStorage.removeItem('avdic_user');
      redirectLogin();
      return;
    }
    if (!res.ok) {
      // Server nije dostupan (502, 500...) — koristi keširane podatke
      if (cached) { user = JSON.parse(cached); initUI(); showToast('Server trenutno nije dostupan. Koriste se keširani podaci.', 'info'); }
      else { showToast('Nije moguće povezati se sa serverom. Pokušajte ponovo.', 'error'); }
      return;
    }
    const data = await res.json();
    user = data.user;
    localStorage.setItem('avdic_user', JSON.stringify(user));
    initUI();
  } catch {
    // Mrežna greška — ako imamo keš, koristi ga
    if (cached) { user = JSON.parse(cached); initUI(); }
    else { showToast('Nije moguće povezati se sa serverom.', 'error'); }
  }
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

  // Sidebar nav
  document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      switchPage(page);
      document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  document.getElementById('gotoNewPost').addEventListener('click', () => {
    switchPage('new-post');
    document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
    document.querySelector('.sidebar-nav a[data-page="new-post"]').classList.add('active');
  });

  // Save
  document.getElementById('saveBtn').addEventListener('click', () => savePost(true));
  document.getElementById('saveDraftBtn').addEventListener('click', () => savePost(false));
  document.getElementById('cancelBtn').addEventListener('click', resetForm);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('avdic_token');
    localStorage.removeItem('avdic_user');
    window.location.href = '/login.html';
  });

  // Mobile
  document.getElementById('mobileToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Editor toolbar
  initEditor();

  // Featured image upload
  initFeaturedUpload();

  // Inline image upload
  document.getElementById('btnInsertImage').addEventListener('click', () => {
    document.getElementById('inlineImageInput').click();
  });
  document.getElementById('inlineImageInput').addEventListener('change', uploadInlineImage);

  // Load dashboard
  switchPage('dashboard');
}

// --- RICH TEXT EDITOR ---
function initEditor() {
  const editor = document.getElementById('editor');
  const toolbar = document.getElementById('toolbar');

  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    e.preventDefault();
    const cmd = btn.dataset.cmd;
    const val = btn.dataset.val;

    if (cmd === 'createLink') {
      const url = prompt('Unesite URL:');
      if (url) document.execCommand(cmd, false, url);
      return;
    }
    if (cmd === 'formatBlock') {
      document.execCommand(cmd, false, `<${val}>`);
      return;
    }
    document.execCommand(cmd, false, null);
    editor.focus();
  });

  // Update toolbar active states
  editor.addEventListener('keyup', updateToolbar);
  editor.addEventListener('mouseup', updateToolbar);
}

function updateToolbar() {
  document.querySelectorAll('#toolbar button[data-cmd]').forEach(btn => {
    const cmd = btn.dataset.cmd;
    if (cmd === 'createLink' || cmd === 'insertUnorderedList' || cmd === 'insertOrderedList') {
      btn.classList.toggle('active', document.queryCommandState(cmd));
    } else if (cmd === 'formatBlock') {
      const val = btn.dataset.val;
      const block = document.queryCommandValue('formatBlock');
      btn.classList.toggle('active', block && block.toLowerCase() === val);
    } else if (cmd === 'bold' || cmd === 'italic') {
      btn.classList.toggle('active', document.queryCommandState(cmd));
    }
  });
}

// --- IMAGE UPLOAD (FEATURED) ---
let featuredUrl = '';

function initFeaturedUpload() {
  const zone = document.getElementById('featuredUpload');
  const input = document.getElementById('featuredInput');
  const preview = document.getElementById('featuredPreview');

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = '#1db954'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = '#d1d5db'; });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = '#d1d5db';
    const file = e.dataTransfer.files[0];
    if (file) uploadFeatured(file);
  });
  input.addEventListener('change', () => {
    if (input.files[0]) uploadFeatured(input.files[0]);
  });
}

async function uploadFeatured(file) {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch(`${API}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Greška pri upload-u.', 'error'); return; }

    featuredUrl = data.url;
    document.getElementById('image_url').value = data.url;
    document.getElementById('featuredPreview').innerHTML = `
      <div class="thumb">
        <img src="${data.url}" alt="Featured">
        <button class="remove" onclick="document.getElementById('featuredPreview').innerHTML='';document.getElementById('image_url').value='';">×</button>
      </div>`;
    showToast('Slika uspešno uploadovana!', 'success');
  } catch {
    showToast('Greška pri upload-u slike.', 'error');
  }
}

// --- INLINE IMAGE UPLOAD ---
async function uploadInlineImage() {
  const input = document.getElementById('inlineImageInput');
  if (!input.files[0]) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await fetch(`${API}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Greška pri upload-u.', 'error'); return; }

    // Insert image at cursor
    const editor = document.getElementById('editor');
    editor.focus();
    const img = `<img src="${data.url}" alt="Slika" style="max-width:100%;border-radius:10px;">`;
    document.execCommand('insertHTML', false, img);
    showToast('Slika ubačena!', 'success');
  } catch {
    showToast('Greška pri upload-u slike.', 'error');
  }
  input.value = '';
}

// --- PAGE SWITCHING ---
function switchPage(page) {
  ['dashboard', 'posts', 'new-post'].forEach(p => {
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
    tbody.innerHTML = posts.slice(0, 5).map(p => `
      <tr>
        <td><strong>${escapeHtml(p.title)}</strong></td>
        <td><span class="badge ${p.published ? 'badge-pub' : 'badge-draft'}">${p.published ? 'Objavljen' : 'Skica'}</span></td>
        <td style="color:#6b7280;font-size:13px;">${new Date(p.created_at).toLocaleDateString('bs')}</td>
        <td class="actions-cell">
          <div class="dropdown">
            <button class="btn-more" data-dropdown="${p.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
            <div class="dropdown-menu" id="dm-${p.id}">
              <button data-action="edit" data-id="${p.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Uredi
              </button>
              <button data-action="delete" data-id="${p.id}" class="danger">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Obriši
              </button>
            </div>
          </div>
        </td>
      </tr>
    `).join('');
    initDropdowns(posts);
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
          <div class="dropdown">
            <button class="btn-more" data-dropdown="${p.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
            <div class="dropdown-menu" id="dm-${p.id}">
              <button data-action="edit" data-id="${p.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Uredi
              </button>
              <button data-action="delete" data-id="${p.id}" class="danger">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Obriši
              </button>
            </div>
          </div>
        </td>
      </tr>
    `).join('');
    initDropdowns(posts);
  } catch {}
}

// --- POST CRUD ---
let editingId = null;

async function savePost(published) {
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('editor').innerHTML.trim();
  const excerpt = document.getElementById('excerpt').value.trim();
  const image_url = document.getElementById('image_url').value.trim();
  const meta_title = document.getElementById('meta_title').value.trim();
  const meta_description = document.getElementById('meta_description').value.trim();

  if (!title || !content || content === '<br>') {
    showToast('Naslov i sadržaj su obavezni.', 'error');
    return;
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
    if (!res.ok) { showToast(data.error, 'error'); return; }

    showToast(editingId ? 'Članak ažuriran!' : 'Članak objavljen!', 'success');
    resetForm();
    if (document.getElementById('page-dashboard').style.display !== 'none') {
      loadDashboardStats(); loadRecentPosts();
    }
    if (document.getElementById('page-posts').style.display !== 'none') loadAllPosts();
  } catch {
    showToast('Greška pri čuvanju.', 'error');
  }
}

function editPostById(posts, id) {
  const post = posts.find(p => p.id == id);
  if (!post) return;
  editingId = post.id;
  document.getElementById('editId').value = post.id;
  document.getElementById('title').value = post.title;
  document.getElementById('editor').innerHTML = post.content;
  document.getElementById('excerpt').value = post.excerpt || '';
  document.getElementById('image_url').value = post.image_url || '';
  document.getElementById('meta_title').value = post.meta_title || '';
  document.getElementById('meta_description').value = post.meta_description || '';

  // Show existing featured image
  if (post.image_url) {
    featuredUrl = post.image_url;
    document.getElementById('featuredPreview').innerHTML = `
      <div class="thumb">
        <img src="${post.image_url}" alt="Featured">
        <button class="remove" onclick="document.getElementById('featuredPreview').innerHTML='';document.getElementById('image_url').value='';">×</button>
      </div>`;
  }

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
  document.getElementById('editor').innerHTML = '';
  document.getElementById('excerpt').value = '';
  document.getElementById('image_url').value = '';
  document.getElementById('meta_title').value = '';
  document.getElementById('meta_description').value = '';
  document.getElementById('featuredPreview').innerHTML = '';
  featuredUrl = '';
  document.getElementById('formTitle').textContent = '✍️ Novi članak';
  document.getElementById('cancelBtn').style.display = 'none';
  document.getElementById('pageTitle').textContent = 'Novi članak';
  document.getElementById('breadcrumb').textContent = 'Kreirajte novi blog post';
}

// --- DROPDOWN ---
function initDropdowns(posts) {
  // Close all dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
    }
  });

  document.querySelectorAll('.btn-more').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.dropdown;
      // Close all others
      document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
      document.getElementById(`dm-${id}`).classList.toggle('show');
    });
  });

  document.querySelectorAll('.dropdown-menu button[data-action="edit"]').forEach(b => {
    b.addEventListener('click', () => editPostById(posts, b.dataset.id));
  });
  document.querySelectorAll('.dropdown-menu button[data-action="delete"]').forEach(b => {
    b.addEventListener('click', () => deletePostById(b.dataset.id));
  });
}

async function deletePostById(id) {
  if (!confirm('Sigurno želite obrisati ovaj članak? Ova akcija je nepovratna.')) return;
  try {
    const res = await fetch(`${API}/api/admin/posts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { showToast('Greška pri brisanju.', 'error'); return; }
    showToast('Članak obrisan.', 'info');
    loadDashboardStats(); loadRecentPosts(); loadAllPosts();
  } catch { showToast('Greška pri brisanju.', 'error'); }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// --- START ---
checkAuth();
