const API = '';

// Ako već imaš token — odmah preusmeri na admin
(async function autoRedirect() {
  const token = localStorage.getItem('avdic_token');
  if (!token) return;
  try {
    const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { window.location.href = '/admin.html'; return; }
    if (res.status === 401) {
      localStorage.removeItem('avdic_token');
      localStorage.removeItem('avdic_user');
    }
  } catch {}
})();

// Password toggle
const pwInput = document.getElementById('password');
const toggleBtn = document.getElementById('togglePassword');
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    const isPass = pwInput.type === 'password';
    pwInput.type = isPass ? 'text' : 'password';
    toggleBtn.innerHTML = isPass
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  });
}

// Login
document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = pwInput.value;
  const msg = document.getElementById('msg');
  msg.className = 'auth-msg';
  msg.textContent = '';

  if (!email || !password) { msg.textContent = 'Sva polja su obavezna.'; msg.className = 'auth-msg error'; return; }

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { msg.textContent = data.error; msg.className = 'auth-msg error'; return; }

    localStorage.setItem('avdic_token', data.token);
    localStorage.setItem('avdic_user', JSON.stringify(data.user));
    window.location.href = '/admin.html';
  } catch {
    msg.textContent = 'Greška u konekciji. Pokušajte ponovo.';
    msg.className = 'auth-msg error';
  }
});

// Enter key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});
