const REDIRECT_RUOLO = {
  admin:      '/dashboard-admin',
  medico:     '/dashboard-medico',
  segretaria: '/dashboard-segreteria',
  paziente:   '/dashboard-paziente',
};

function mostraRecuperoPassword() {
  const el = document.getElementById('msg-recupero');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function mostraTab(nome) {
  const accedi = nome === 'accedi';
  document.getElementById('tab-accedi').classList.toggle('attivo', accedi);
  document.getElementById('tab-registrati').classList.toggle('attivo', !accedi);
  document.getElementById('form-accedi').style.display = accedi ? 'block' : 'none';
  document.getElementById('form-registrati').style.display = accedi ? 'none' : 'block';
}

document.getElementById('form-accedi').addEventListener('submit', async function(e) {
  e.preventDefault();
  const erroreEl = document.getElementById('login-errore');
  erroreEl.textContent = '';

  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const risposta = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const dati = await risposta.json();

    if (!risposta.ok) {
      erroreEl.textContent = dati.errore || 'Errore di accesso';
      return;
    }

    localStorage.setItem('utente', JSON.stringify(dati));
    if (dati.primo_accesso) {
      window.location.href = '/cambia-password';
    } else {
      window.location.href = REDIRECT_RUOLO[dati.ruolo] || '/';
    }
  } catch {
    erroreEl.textContent = 'Errore di rete. Riprova.';
  }
});

document.getElementById('form-registrati').addEventListener('submit', async function(e) {
  e.preventDefault();
  const erroreEl = document.getElementById('reg-errore');
  erroreEl.textContent = '';

  const payload = {
    nome:         document.getElementById('reg-nome').value,
    cognome:      document.getElementById('reg-cognome').value,
    email:        document.getElementById('reg-email').value,
    password:     document.getElementById('reg-password').value,
    telefono:     document.getElementById('reg-telefono').value,
    data_nascita: document.getElementById('reg-nascita').value,
  };

  try {
    const risposta = await fetch('/api/registrazione', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const dati = await risposta.json();

    if (!risposta.ok) {
      const msgValidazione = Array.isArray(dati.detail) ? dati.detail[0]?.msg?.replace('Value error, ', '') : null;
      erroreEl.textContent = dati.errore || msgValidazione || 'Errore durante la registrazione';
      return;
    }

    mostraTab('accedi');
    document.getElementById('login-email').value = payload.email;
    document.getElementById('login-errore').textContent = '';
  } catch {
    erroreEl.textContent = 'Errore di rete. Riprova.';
  }
});
