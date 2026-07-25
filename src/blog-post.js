const API = '';
const slug = new URLSearchParams(window.location.search).get('slug');
const content = document.getElementById('postContent');
const error = document.getElementById('postError');

async function loadPost() {
  if (!slug) { showError(); return; }
  try {
    const res = await fetch(`${API}/api/posts/${slug}`);
    if (!res.ok) { showError(); return; }
    const { post } = await res.json();
    document.title = post.meta_title || `${post.title} | Avdić Media`;
    if (post.meta_description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', post.meta_description);
      else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = post.meta_description;
        document.head.appendChild(meta);
      }
    }

    const imgHtml = post.image_url
      ? `<div class="post-featured-img"><img src="${post.image_url}" alt="${escapeHtml(post.title)}"></div>`
      : '';

    content.innerHTML = `
      <h1>${escapeHtml(post.title)}</h1>
      <div class="post-meta">
        <span>${escapeHtml(post.author_name)}</span>
        <time>${new Date(post.created_at).toLocaleDateString('bs')}</time>
      </div>
      ${imgHtml}
      <div class="post-content">${post.content}</div>
    `;
    error.style.display = 'none';
  } catch { showError(); }
}

function showError() {
  content.style.display = 'none';
  error.style.display = 'block';
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

loadPost();
