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
    document.title = `${post.title} | Avdić Media`;
    content.innerHTML = `
      <h1>${escapeHtml(post.title)}</h1>
      <div class="post-meta">
        <span>${escapeHtml(post.author_name)}</span>
        <time>${new Date(post.created_at).toLocaleDateString('bs')}</time>
      </div>
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
