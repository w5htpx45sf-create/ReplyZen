const tabs = document.querySelectorAll('.tab-button');
const loginForm = document.querySelector('#login-form');
const signupForm = document.querySelector('#signup-form');
const authMessage = document.querySelector('#auth-message');

// Gestion simple des comptes dans le stockage local pour le MVP.
const getUsers = () => JSON.parse(localStorage.getItem('replyzen_users') || '[]');
const saveUsers = (users) => localStorage.setItem('replyzen_users', JSON.stringify(users));

// Crée une session locale après connexion.
const setSession = (email) => {
  localStorage.setItem('replyzen_session', JSON.stringify({ email }));
};

const showMessage = (text, isError = false) => {
  authMessage.textContent = text;
  authMessage.style.color = isError ? '#b91c1c' : '#1b7f57';
};

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((btn) => btn.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    loginForm.hidden = target !== 'login';
    signupForm.hidden = target !== 'signup';
    showMessage('');
  });
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.querySelector('#login-email').value.trim();
  const password = document.querySelector('#login-password').value.trim();
  const users = getUsers();
  const user = users.find((item) => item.email === email && item.password === password);

  if (!user) {
    showMessage('Identifiants incorrects. Veuillez réessayer.', true);
    return;
  }

  setSession(email);
  showMessage('Connexion réussie. Redirection en cours…');
  window.location.href = 'dashboard.html';
});

signupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.querySelector('#signup-email').value.trim();
  const password = document.querySelector('#signup-password').value.trim();
  const users = getUsers();

  if (users.some((item) => item.email === email)) {
    showMessage('Ce compte existe déjà. Connectez-vous.', true);
    return;
  }

  users.push({ email, password });
  saveUsers(users);
  setSession(email);
  showMessage('Compte créé. Redirection en cours…');
  window.location.href = 'dashboard.html';
});
