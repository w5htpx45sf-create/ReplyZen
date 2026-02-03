const session = JSON.parse(localStorage.getItem('replyzen_session') || 'null');
const userEmail = document.querySelector('#user-email');
const logoutButton = document.querySelector('#logout-button');
const clientNameInput = document.querySelector('#client-name');
const clientMemoryInput = document.querySelector('#client-memory');
const clientMessageInput = document.querySelector('#client-message');
const toneSelect = document.querySelector('#tone');
const responseBox = document.querySelector('#response-box');
const statusMessage = document.querySelector('#status-message');
const generateButton = document.querySelector('#generate-button');
const copyButton = document.querySelector('#copy-button');
const regenerateButton = document.querySelector('#regenerate-button');
const historyList = document.querySelector('#history-list');
const historyFilter = document.querySelector('#history-filter');
const useCaseButtons = document.querySelectorAll('.use-case-button');
const clientList = document.querySelector('#client-list');

// Vérifie la session locale avant d'afficher le tableau de bord.
const ensureSession = () => {
  if (!session || !session.email) {
    window.location.href = 'auth.html';
    return;
  }
  userEmail.textContent = session.email;
};

// Accès simplifié aux données locales du MVP.
const getHistory = () => JSON.parse(localStorage.getItem('replyzen_history') || '[]');
const saveHistory = (items) => localStorage.setItem('replyzen_history', JSON.stringify(items));
const getClients = () => JSON.parse(localStorage.getItem('replyzen_clients') || '{}');
const saveClients = (clients) => localStorage.setItem('replyzen_clients', JSON.stringify(clients));

let activeUseCase = '';
let lastPayload = null;

const toneTemplates = {
  'Professionnel neutre': {
    opening: 'Bonjour',
    closing: 'Je reste à votre disposition si besoin. Bien à vous,',
    style: 'sobre et factuel',
  },
  'Chaleureux & empathique': {
    opening: 'Bonjour',
    closing: 'Merci pour votre confiance, bien cordialement,',
    style: 'empathique et rassurant',
  },
  'Ferme & cadrant': {
    opening: 'Bonjour',
    closing: 'Merci de votre compréhension. Cordialement,',
    style: 'ferme mais respectueux',
  },
  'Court & efficace': {
    opening: 'Bonjour',
    closing: 'Bien à vous,',
    style: 'court et direct',
  },
  Premium: {
    opening: 'Bonjour',
    closing: 'Avec mes salutations distinguées,',
    style: 'soigné et premium',
  },
};

const useCaseGuidance = {
  'Annulation / report': 'Proposez une alternative et restez flexible.',
  'Client mécontent': 'Reconnaissez le ressenti et proposez une solution claire.',
  'Rappel de cadre / limites': 'Rappelez les règles avec tact et proposez une option.',
  Relance: 'Relancez poliment et proposez un rappel bref.',
  'Retard de réponse': 'Présentez des excuses et donnez un délai précis.',
  'Refus professionnel': 'Refusez avec respect et proposez une alternative.',
};

const renderClientsList = () => {
  const clients = Object.keys(getClients());
  clientList.innerHTML = '';
  clients.forEach((client) => {
    const option = document.createElement('option');
    option.value = client;
    clientList.appendChild(option);
  });
};

const renderHistory = () => {
  const history = getHistory();
  const filterValue = historyFilter.value.trim().toLowerCase();
  historyList.innerHTML = '';

  const filtered = history.filter((item) => {
    if (!filterValue) {
      return true;
    }
    return item.client.toLowerCase().includes(filterValue);
  });

  if (filtered.length === 0) {
    historyList.innerHTML = '<p class="helper-text">Aucune réponse pour le moment.</p>';
    return;
  }

  filtered
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((item) => {
      const card = document.createElement('div');
      card.className = 'history-item';
      card.innerHTML = `
        <div>
          <span class="badge">${item.tone}</span>
          <small>${new Date(item.date).toLocaleString('fr-FR')}</small>
        </div>
        <strong>${item.client || 'Client non renseigné'}</strong>
        <p class="helper-text">Cas d’usage : ${item.useCase || 'Standard'}</p>
        <p>${item.response}</p>
      `;
      historyList.appendChild(card);
    });
};

// Génère une réponse lisible en fonction du ton et du cas d'usage choisi.
const buildResponse = ({ client, message, tone, memory, useCase }) => {
  const template = toneTemplates[tone];
  const memoryLine = memory
    ? `Pour rappel, voici le contexte partagé : ${memory}`
    : 'Je me base sur votre message pour répondre de manière claire et professionnelle.';
  const useCaseLine = useCase ? `Contexte spécifique : ${useCaseGuidance[useCase]}` : '';
  const messageLine = message
    ? `Pour faire suite à votre message : « ${message} ».`
    : 'Merci pour votre message.';
  const mainResponse = `${messageLine} ${memoryLine} ${useCaseLine}`.trim();

  const closingLine = tone === 'Court & efficace'
    ? 'Je reviens vers vous rapidement.'
    : 'Je vous propose de valider ce point ensemble et de convenir de la meilleure suite.';

  return `${template.opening} ${client ? `${client},` : ','}\n\n${mainResponse}\n\n${closingLine}\n\n${template.closing}`;
};

// Enregistre une réponse dans l'historique.
const persistEntry = (entry) => {
  const history = getHistory();
  history.push(entry);
  saveHistory(history);
};

// Stocke la mémoire client pour personnaliser les réponses suivantes.
const storeClientMemory = (client, memory) => {
  if (!client) {
    return;
  }
  const clients = getClients();
  clients[client] = {
    memory,
    updatedAt: new Date().toISOString(),
  };
  saveClients(clients);
};

// Recharge automatiquement la mémoire associée à un client existant.
const loadClientMemory = () => {
  const clients = getClients();
  const clientData = clients[clientNameInput.value.trim()];
  if (clientData) {
    clientMemoryInput.value = clientData.memory;
  }
};

// Génère la réponse et met à jour l'historique.
const generateResponse = () => {
  const client = clientNameInput.value.trim();
  const message = clientMessageInput.value.trim();
  const tone = toneSelect.value;
  const memory = clientMemoryInput.value.trim();

  if (!message) {
    statusMessage.textContent = 'Veuillez coller un message client avant de générer.';
    statusMessage.style.color = '#b91c1c';
    return;
  }

  const response = buildResponse({ client, message, tone, memory, useCase: activeUseCase });
  responseBox.textContent = response;
  statusMessage.textContent = 'Réponse générée. Vous pouvez l’adapter avant envoi.';
  statusMessage.style.color = '#1b7f57';

  const entry = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    client: client || 'Client non renseigné',
    message,
    tone,
    useCase: activeUseCase,
    response,
  };

  persistEntry(entry);
  storeClientMemory(client, memory);
  renderClientsList();
  renderHistory();
  lastPayload = { client, message, tone, memory, useCase: activeUseCase };
};

// Régénère une réponse à partir des dernières données saisies.
const regenerateResponse = () => {
  if (!lastPayload) {
    statusMessage.textContent = 'Générez d’abord une réponse.';
    statusMessage.style.color = '#b91c1c';
    return;
  }
  const response = buildResponse(lastPayload);
  responseBox.textContent = response;
  statusMessage.textContent = 'Réponse régénérée.';
  statusMessage.style.color = '#1b7f57';
};

// Copie la réponse pour l'utilisateur final.
const copyResponse = async () => {
  const text = responseBox.textContent.trim();
  if (!text || text === 'Votre réponse apparaîtra ici.') {
    statusMessage.textContent = 'Aucune réponse à copier.';
    statusMessage.style.color = '#b91c1c';
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    statusMessage.textContent = 'Réponse copiée dans le presse-papiers.';
    statusMessage.style.color = '#1b7f57';
  } catch (error) {
    statusMessage.textContent = 'Copie impossible. Veuillez sélectionner la réponse manuellement.';
    statusMessage.style.color = '#b91c1c';
  }
};

useCaseButtons.forEach((button) => {
  button.addEventListener('click', () => {
    useCaseButtons.forEach((btn) => btn.classList.remove('active'));
    if (activeUseCase === button.dataset.use) {
      activeUseCase = '';
      return;
    }
    button.classList.add('active');
    activeUseCase = button.dataset.use;
  });
});

logoutButton.addEventListener('click', () => {
  localStorage.removeItem('replyzen_session');
  window.location.href = 'auth.html';
});

clientNameInput.addEventListener('blur', loadClientMemory);
clientNameInput.addEventListener('change', loadClientMemory);

generateButton.addEventListener('click', generateResponse);
regenerateButton.addEventListener('click', regenerateResponse);
copyButton.addEventListener('click', copyResponse);
historyFilter.addEventListener('input', renderHistory);

ensureSession();
renderClientsList();
renderHistory();
