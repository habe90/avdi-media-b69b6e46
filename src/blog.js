const API = '';
const grid = document.getElementById('postsGrid');
const empty = document.getElementById('empty');

async function loadPosts() {
  try {
    const res = await fetch(`${API}/api/posts`);
    const data = await res.json();
    if (!data.posts || data.posts.length === 0) { empty.style.display = 'block'; return; }
    grid.innerHTML = data.posts.map(p => {
      const imgHtml = p.image_url
        ? `<div class="post-card-img"><img src="${p.image_url}" alt="${escapeHtml(p.title)}" loading="lazy"></div>`
        : `<div class="post-card-img no-img"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>`;
      return `
      <article class="post-card">
        ${imgHtml}
        <div class="post-card-body">
          <h3><a href="/blog-post.html?slug=${p.slug}">${escapeHtml(p.title)}</a></h3>
          <p class="excerpt">${escapeHtml(p.excerpt || '')}</p>
          <div class="meta">
            <span>${escapeHtml(p.author_name)}</span>
            <time>${new Date(p.created_at).toLocaleDateString('bs')}</time>
          </div>
        </div>
      </article>`;
    }).join('');
    empty.style.display = 'none';
  } catch { empty.style.display = 'block'; empty.innerHTML = '<div class="icon">⚠️</div><p>Greška pri učitavanju članaka.</p>'; }
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

loadPosts();
