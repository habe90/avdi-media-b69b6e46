const API = '';
const grid = document.getElementById('postsGrid');
const empty = document.getElementById('empty');

async function loadPosts() {
  try {
    const res = await fetch(`${API}/api/posts`);
    const data = await res.json();
    if (!data.posts || data.posts.length === 0) { empty.style.display = 'block'; return; }
    grid.innerHTML = data.posts.map(p => `
      <article class="post-card">
        <div class="post-card-img">📰</div>
        <div class="post-card-body">
          <h3><a href="/blog-post.html?slug=${p.slug}">${escapeHtml(p.title)}</a></h3>
          <p class="excerpt">${escapeHtml(p.excerpt || '')}</p>
          <div class="meta">
            <span>${escapeHtml(p.author_name)}</span>
            <time>${new Date(p.created_at).toLocaleDateString('bs')}</time>
          </div>
        </div>
      </article>
    `).join('');
    empty.style.display = 'none';
  } catch { empty.style.display = 'block'; empty.innerHTML = '<div class="icon">⚠️</div><p>Greška pri učitavanju članaka.</p>'; }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

loadPosts();
