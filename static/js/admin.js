const utente = JSON.parse(localStorage.getItem('utente') || 'null');
if (!utente || utente.ruolo !== 'admin') window.location.href = '/';

document.getElementById('nome-admin').textContent = utente.nome + ' ' + utente.cognome;

// ── Navigazione ───────────────────────────────────────────────────────────────

const TITOLI = {
  overview:      'Dashboard',
  calendario:    'Calendario disponibilità',
  appuntamenti:  'Appuntamenti',
  medici:        'Gestione Medici',
  segreteria:    'Gestione Segreteria',
  pazienti:      'Pazienti',
  specialita:    'Specialità',
};

function mostraSezione(nome) {
  document.querySelectorAll('.sezione').forEach(s => s.classList.add('nascosta'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('attivo'));

  document.getElementById('s-' + nome).classList.remove('nascosta');
  document.querySelector(`[data-sezione="${nome}"]`).classList.add('attivo');
  document.getElementById('titolo-sezione').textContent = TITOLI[nome];

  const azioni = {
    overview:     caricaOverview,
    calendario:   () => {},
    appuntamenti: caricaAppuntamenti,
    medici:       caricaMedici,
    segreteria:   caricaSegreteria,
    pazienti:     caricaPazienti,
    specialita:   caricaSpecialita,
  };
  azioni[nome]();
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => mostraSezione(btn.dataset.sezione));
});

function logout() {
  localStorage.removeItem('utente');
  window.location.href = '/';
}

// ── Modali ────────────────────────────────────────────────────────────────────

function apriModale(id) {
  document.getElementById(id).classList.remove('nascosta');
  if (id === 'modale-medico') popolaSelectSpecialita();
}

function chiudiModale(id) {
  document.getElementById(id).classList.add('nascosta');
}

document.querySelectorAll('.overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) chiudiModale(overlay.id);
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function tabella(colonne, righe, renderRiga) {
  if (!righe.length) return '<p class="vuoto">Nessun dato trovato.</p>';
  const intestazione = colonne.map(c => `<th>${c}</th>`).join('');
  const corpo = righe.map(renderRiga).join('');
  return `<table class="admin-tabella"><thead><tr>${intestazione}</tr></thead><tbody>${corpo}</tbody></table>`;
}

function badgeStato(stato) {
  const classi = { in_attesa: 'badge-attesa', confermato: 'badge-ok', cancellato: 'badge-no', completato: 'badge-completato', libero: 'badge-ok', prenotato: 'badge-attesa' };
  return `<span class="badge-stato ${classi[stato] || ''}">${stato.replace('_', ' ')}</span>`;
}

async function api(metodo, url, body) {
  const opzioni = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if (body) opzioni.body = JSON.stringify(body);
  const r = await fetch(url, opzioni);
  return { ok: r.ok, dati: await r.json() };
}

// ── Overview ──────────────────────────────────────────────────────────────────

async function caricaOverview() {
  const { dati } = await api('GET', '/api/admin/stats');
  document.getElementById('st-tot-appuntamenti').textContent = dati.tot_appuntamenti;
  document.getElementById('st-oggi').textContent            = dati.appuntamenti_oggi;
  document.getElementById('st-attesa').textContent          = dati.in_attesa;
  document.getElementById('st-medici').textContent          = dati.tot_medici;
  document.getElementById('st-pazienti').textContent        = dati.tot_pazienti;
}

// ── Calendario ────────────────────────────────────────────────────────────────

async function caricaCalendario() {
  const data = document.getElementById('data-calendario').value;
  if (!data) return;
  const { dati } = await api('GET', `/api/admin/disponibilita?data=${data}`);
  const el = document.getElementById('risultato-calendario');

  if (!dati.length) {
    el.innerHTML = '<p class="vuoto">Nessun medico disponibile in questa data.</p>';
    return;
  }

  // Raggruppa per specialità
  const gruppi = {};
  dati.forEach(r => {
    if (!gruppi[r.specialita]) gruppi[r.specialita] = [];
    gruppi[r.specialita].push(r);
  });

  let html = '';
  for (const [spec, righe] of Object.entries(gruppi)) {
    html += `<h4 class="gruppo-titolo">${escapeHtml(spec)}</h4>`;
    html += tabella(
      ['Medico', 'Orario', 'Stato'],
      righe,
      r => `<tr>
        <td>Dr. ${escapeHtml(r.cognome)} ${escapeHtml(r.nome)}</td>
        <td>${r.ora_inizio} – ${r.ora_fine}</td>
        <td>${badgeStato(r.stato)}</td>
      </tr>`
    );
  }
  el.innerHTML = html;
}

// ── Appuntamenti ──────────────────────────────────────────────────────────────

async function caricaAppuntamenti() {
  const stato = document.getElementById('filtro-stato').value;
  const url   = stato ? `/api/admin/appuntamenti?stato=${stato}` : '/api/admin/appuntamenti';
  const { dati } = await api('GET', url);

  document.getElementById('tabella-appuntamenti').innerHTML = tabella(
    ['Paziente', 'Medico', 'Specialità', 'Data', 'Orario', 'Stato', ''],
    dati,
    r => `<tr>
      <td>${escapeHtml(r.paziente_cognome)} ${escapeHtml(r.paziente_nome)}</td>
      <td>Dr. ${escapeHtml(r.medico_cognome)} ${escapeHtml(r.medico_nome)}</td>
      <td>${escapeHtml(r.specialita)}</td>
      <td>${r.data}</td>
      <td>${r.ora_inizio} – ${r.ora_fine}</td>
      <td>${badgeStato(r.stato)}</td>
      <td>${r.stato !== 'cancellato'
        ? `<button class="btn-danger" onclick="cancellaAppuntamento(${r.id})">Cancella</button>`
        : ''}</td>
    </tr>`
  );
}

async function cancellaAppuntamento(id) {
  if (!confirm('Cancellare questo appuntamento?')) return;
  const { ok } = await api('PATCH', `/api/admin/appuntamenti/${id}/cancella`);
  if (ok) caricaAppuntamenti();
}

// ── Medici ────────────────────────────────────────────────────────────────────

async function caricaMedici() {
  const { dati } = await api('GET', '/api/admin/medici');
  document.getElementById('tabella-medici').innerHTML = tabella(
    ['Nome', 'Email', 'Specialità', 'Durata visita', ''],
    dati,
    r => `<tr>
      <td>Dr. ${escapeHtml(r.cognome)} ${escapeHtml(r.nome)} ${r.primo_accesso ? '<span class="badge-stato badge-attesa" style="margin-left:6px;">Primo accesso</span>' : ''}</td>
      <td>${escapeHtml(r.email)}</td>
      <td>${escapeHtml(r.specialita)}</td>
      <td>
        <select class="input-campo input-durata" onchange="aggiornaDurata(${r.id}, this.value)">
          ${[15,20,30,45,60,90].map(m =>
            `<option value="${m}" ${r.durata_slot == m ? 'selected' : ''}>${m} min</option>`
          ).join('')}
        </select>
      </td>
      <td><button class="btn-danger" onclick="eliminaMedico(${r.id})">Elimina</button></td>
    </tr>`
  );
}

async function popolaSelectSpecialita() {
  const { dati } = await api('GET', '/api/admin/specialita');
  const sel = document.getElementById('m-specialita');
  sel.innerHTML = dati.map(s => `<option value="${s.id}">${escapeHtml(s.nome)}</option>`).join('');
}

async function submitMedico(e) {
  e.preventDefault();
  const errEl = document.getElementById('err-medico');
  errEl.textContent = '';
  const { ok, dati } = await api('POST', '/api/admin/medici', {
    nome:         document.getElementById('m-nome').value,
    cognome:      document.getElementById('m-cognome').value,
    email:        document.getElementById('m-email').value,
    specialita_id: parseInt(document.getElementById('m-specialita').value),
    durata_slot:  parseInt(document.getElementById('m-durata').value),
  });
  if (!ok) { errEl.textContent = dati.errore; return; }
  chiudiModale('modale-medico');
  document.getElementById('form-medico').reset();
  mostraPasswordMonouso(dati.password_monouso);
  caricaMedici();
}

async function aggiornaDurata(medicoId, durata) {
  await api('PATCH', `/api/admin/medici/${medicoId}/durata`, { durata_slot: parseInt(durata) });
}

async function eliminaMedico(id) {
  if (!confirm('Eliminare questo medico?')) return;
  const { ok } = await api('DELETE', `/api/admin/medici/${id}`);
  if (ok) caricaMedici();
}

// ── Segreteria ────────────────────────────────────────────────────────────────

async function caricaSegreteria() {
  const { dati } = await api('GET', '/api/admin/segreteria');
  document.getElementById('tabella-segreteria').innerHTML = tabella(
    ['Nome', 'Email', ''],
    dati,
    r => `<tr>
      <td>${escapeHtml(r.cognome)} ${escapeHtml(r.nome)} ${r.primo_accesso ? '<span class="badge-stato badge-attesa" style="margin-left:6px;">Primo accesso</span>' : ''}</td>
      <td>${escapeHtml(r.email)}</td>
      <td><button class="btn-danger" onclick="eliminaSegreteria(${r.id})">Elimina</button></td>
    </tr>`
  );
}

async function submitSegreteria(e) {
  e.preventDefault();
  const errEl = document.getElementById('err-segreteria');
  errEl.textContent = '';
  const { ok, dati } = await api('POST', '/api/admin/segreteria', {
    nome:    document.getElementById('seg-nome').value,
    cognome: document.getElementById('seg-cognome').value,
    email:   document.getElementById('seg-email').value,
  });
  if (!ok) { errEl.textContent = dati.errore; return; }
  chiudiModale('modale-segreteria');
  document.getElementById('form-segreteria').reset();
  mostraPasswordMonouso(dati.password_monouso);
  caricaSegreteria();
}

async function eliminaSegreteria(id) {
  if (!confirm('Eliminare questa segreteria?')) return;
  const { ok } = await api('DELETE', `/api/admin/segreteria/${id}`);
  if (ok) caricaSegreteria();
}

// ── Pazienti ──────────────────────────────────────────────────────────────────

async function caricaPazienti() {
  const { dati } = await api('GET', '/api/admin/pazienti');
  document.getElementById('tabella-pazienti').innerHTML = tabella(
    ['Nome', 'Email', 'Telefono', 'Data di nascita'],
    dati,
    r => `<tr>
      <td>${escapeHtml(r.cognome)} ${escapeHtml(r.nome)}</td>
      <td>${escapeHtml(r.email)}</td>
      <td>${escapeHtml(r.telefono) || '—'}</td>
      <td>${r.data_nascita || '—'}</td>
    </tr>`
  );
}

// ── Specialità ────────────────────────────────────────────────────────────────

async function caricaSpecialita() {
  const { dati } = await api('GET', '/api/admin/specialita');
  document.getElementById('tabella-specialita').innerHTML = tabella(
    ['Nome', 'Descrizione', ''],
    dati,
    r => `<tr>
      <td>${escapeHtml(r.nome)}</td>
      <td>${escapeHtml(r.descrizione) || '—'}</td>
      <td><button class="btn-danger" onclick="eliminaSpecialita(${r.id})">Elimina</button></td>
    </tr>`
  );
}

async function creaSpecialita() {
  const nome = document.getElementById('nuova-specialita-nome').value.trim();
  if (!nome) return;
  const desc = document.getElementById('nuova-specialita-desc').value.trim();
  const { ok } = await api('POST', '/api/admin/specialita', { nome, descrizione: desc });
  if (ok) {
    document.getElementById('nuova-specialita-nome').value = '';
    document.getElementById('nuova-specialita-desc').value = '';
    caricaSpecialita();
  }
}

async function eliminaSpecialita(id) {
  if (!confirm('Eliminare questa specialità?')) return;
  const { ok } = await api('DELETE', `/api/admin/specialita/${id}`);
  if (ok) caricaSpecialita();
}

// ── Password monouso ──────────────────────────────────────────────────────────

function mostraPasswordMonouso(pwd) {
  document.getElementById('password-monouso-testo').textContent = pwd;
  apriModale('modale-password');
}

// ── Avvio ─────────────────────────────────────────────────────────────────────

caricaOverview();
