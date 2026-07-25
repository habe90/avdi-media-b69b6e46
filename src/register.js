const API = '';

document.getElementById('registerBtn').addEventListener('click', async () => {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('msg');
  msg.className = 'auth-msg';
  msg.textContent = '';

  if (!name || !email || !password) { msg.textContent = 'Sva polja su obavezna.'; msg.className = 'auth-msg error'; return; }
  if (password.length < 6) { msg.textContent = 'Lozinka mora imati bar 6 karaktera.'; msg.className = 'auth-msg error'; return; }

  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
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
