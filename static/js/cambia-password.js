const REDIRECT_RUOLO = {
  admin:      '/dashboard-admin',
  medico:     '/dashboard-medico',
  segretaria: '/dashboard-segreteria',
  paziente:   '/dashboard-paziente',
};

const utente = JSON.parse(localStorage.getItem('utente') || 'null');
if (!utente) window.location.href = '/';

document.getElementById('form-cambio').addEventListener('submit', async function(e) {
  e.preventDefault();
  const erroreEl = document.getElementById('errore-cambio');
  erroreEl.textContent = '';

  const nuova    = document.getElementById('nuova-password').value;
  const conferma = document.getElementById('conferma-password').value;

  if (nuova.length < 8) {
    erroreEl.textContent = 'La password deve essere di almeno 8 caratteri';
    return;
  }
  if (nuova !== conferma) {
    erroreEl.textContent = 'Le password non coincidono';
    return;
  }

  try {
    const risposta = await fetch('/api/cambia-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ utente_id: utente.id, nuova_password: nuova }),
    });

    if (!risposta.ok) {
      erroreEl.textContent = 'Errore durante il salvataggio';
      return;
    }

    utente.primo_accesso = 0;
    localStorage.setItem('utente', JSON.stringify(utente));
    window.location.href = REDIRECT_RUOLO[utente.ruolo] || '/';
  } catch {
    erroreEl.textContent = 'Errore di rete. Riprova.';
  }
});
