const API = '';
const token = localStorage.getItem('avdic_token');
const user = JSON.parse(localStorage.getItem('avdic_user') || 'null');

if (!token || !user) {
  document.getElementById('unauth').style.display = 'flex';
} else {
  document.getElementById('adminPage').style.display = 'block';
  document.getElementById('userName').textContent = user.name;
  loadPosts();
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('avdic_token');
  localStorage.removeItem('avdic_user');
  window.location.href = '/login.html';
});

// Globals
let editingId = null;

// Load posts
async function loadPosts() {
  const list = document.getElementById('postList');
  const empty = document.getElementById('emptyList');
  try {
    const res = await fetch(`${API}/api/admin/posts`, { headers: { Authorization: `Bearer ${token}` } });
    const { posts } = await res.json();
    if (!posts.length) { list.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    list.innerHTML = posts.map(p => `
      <div class="post-item">
        <div class="info">
          <strong>${escapeHtml(p.title)}</strong>
          <span class="s">${new Date(p.created_at).toLocaleDateString('bs')} — <span class="status-badge ${p.published ? 'status-pub' : 'status-draft'}">${p.published ? 'Objavljen' : 'Skica'}</span></span>
        </div>
        <div class="actions">
          <button class="btn-edit" data-id="${p.id}">✏️</button>
          <button class="btn-del" data-id="${p.id}">🗑</button>
        </div>
      </div>
    `).join('');

    // Edit buttons
    list.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', () => editPost(posts.find(p => p.id == btn.dataset.id))));
    list.querySelectorAll('.btn-del').forEach(btn => btn.addEventListener('click', () => deletePost(btn.dataset.id)));
  } catch { list.innerHTML = '<p style="color:#e74c3c;">Greška pri učitavanju.</p>'; }
}

// Save post
document.getElementById('saveBtn').addEventListener('click', async () => {
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();
  const excerpt = document.getElementById('excerpt').value.trim();
  const image_url = document.getElementById('image_url').value.trim();
  const msg = document.getElementById('formMsg');
  msg.className = 'msg';
  msg.textContent = '';

  if (!title || !content) { msg.textContent = 'Naslov i sadržaj su obavezni.'; msg.className = 'msg error'; return; }

  const body = { title, content, excerpt, image_url };
  const url = editingId ? `${API}/api/admin/posts/${editingId}` : `${API}/api/admin/posts`;
  const method = editingId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error; msg.className = 'msg error'; return; }

    msg.textContent = editingId ? '✅ Članak ažuriran!' : '✅ Članak objavljen!';
    msg.className = 'msg success';
    resetForm();
    loadPosts();
    setTimeout(() => { msg.textContent = ''; }, 3000);
  } catch { msg.textContent = 'Greška.'; msg.className = 'msg error'; }
});

// Cancel edit
document.getElementById('cancelBtn').addEventListener('click', resetForm);

function editPost(post) {
  editingId = post.id;
  document.getElementById('editId').value = post.id;
  document.getElementById('title').value = post.title;
  document.getElementById('content').value = post.content;
  document.getElementById('excerpt').value = post.excerpt || '';
  document.getElementById('image_url').value = post.image_url || '';
  document.getElementById('formTitle').textContent = '✏️ Uredi članak';
  document.getElementById('saveBtn').textContent = '💾 Sačuvaj izmene';
  document.getElementById('cancelBtn').style.display = 'block';
  document.getElementById('formMsg').textContent = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  editingId = null;
  document.getElementById('editId').value = '';
  document.getElementById('title').value = '';
  document.getElementById('content').value = '';
  document.getElementById('excerpt').value = '';
  document.getElementById('image_url').value = '';
  document.getElementById('formTitle').textContent = '✍️ Novi članak';
  document.getElementById('saveBtn').textContent = '💾 Objavi članak';
  document.getElementById('cancelBtn').style.display = 'none';
  document.getElementById('formMsg').textContent = '';
}

async function deletePost(id) {
  if (!confirm('Sigurno želite obrisati ovaj članak?')) return;
  try {
    await fetch(`${API}/api/admin/posts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadPosts();
  } catch { alert('Greška pri brisanju.'); }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
