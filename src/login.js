const API = '';

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
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
