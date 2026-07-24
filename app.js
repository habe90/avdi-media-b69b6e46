// Mobile nav toggle
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => {
  nav.classList.toggle('open');
});
document.querySelectorAll('.nav a').forEach(link => {
  link.addEventListener('click', () => nav.classList.remove('open'));
});

// Header shadow on scroll
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) {
    header.style.boxShadow = '0 4px 20px rgba(0,0,0,.06)';
  } else {
    header.style.boxShadow = 'none';
  }
});

// Contact form (demo submit)
const form = document.getElementById('contactForm');
const msg = document.getElementById('formMsg');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  msg.textContent = 'Hvala! Vaš upit je poslan. Javit ćemo se uskoro.';
  form.reset();
  setTimeout(() => (msg.textContent = ''), 5000);
});

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();
