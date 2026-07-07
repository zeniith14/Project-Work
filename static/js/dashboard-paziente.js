const utente = JSON.parse(localStorage.getItem('utente') || 'null');
if (!utente || utente.ruolo !== 'paziente') window.location.href = '/';

const TITOLI = {
  prenota:      'Prenota visita',
  appuntamenti: 'I miei appuntamenti',
  storico:      'Storico visite',
  profilo:      'Il mio profilo',
  referti:      'I miei referti',
};

let tuttiAppuntamenti = [];
let slotSelezionato   = null;
let medicoSelezionato = null;
let appuntamentoModale = null;

async function api(metodo, url, body) {
  const opzioni = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if (body) opzioni.body = JSON.stringify(body);
  const r = await fetch(url, opzioni);
  return { ok: r.ok, dati: await r.json() };
}

// ── Navigazione ───────────────────────────────────────────────────────────────

function mostraSezione(nome) {
  document.querySelectorAll('.sezione').forEach(s => s.classList.add('nascosta'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('attivo'));
  document.getElementById('s-' + nome).classList.remove('nascosta');
  document.querySelector(`[data-sezione="${nome}"]`).classList.add('attivo');
  document.getElementById('titolo-sezione').textContent = TITOLI[nome];
  const azioni = {
    prenota:      avviaPrenota,
    appuntamenti: caricaAppuntamenti,
    storico:      caricaStorico,
    profilo:      caricaProfilo,
    referti:      caricaReferti,
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

function chiudiModale(id) {
  document.getElementById(id).classList.add('nascosta');
}

document.querySelectorAll('.overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) chiudiModale(o.id); });
});

// ── Avvio ─────────────────────────────────────────────────────────────────────

document.getElementById('nome-paziente').textContent =
  utente.nome + ' ' + utente.cognome;

avviaPrenota();
caricaNotifiche();
setInterval(caricaNotifiche, 60000);

// ── NOTIFICHE CHECK-IN ────────────────────────────────────────────────────────

async function caricaNotifiche() {
  const { ok, dati } = await api('GET', `/api/paziente/notifiche?utente_id=${utente.id}`);
  const banner = document.getElementById('banner-notifiche');
  if (!ok || !dati.length) { banner.classList.add('nascosta'); return; }

  banner.classList.remove('nascosta');
  banner.innerHTML = dati.map(n => {
    const d = new Date(n.data + 'T00:00:00');
    const dataLabel = d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    const scadenza = n.checkin_scadenza
      ? new Date(n.checkin_scadenza).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '';
    return `<div class="notifica-checkin">
      <div class="notifica-testo">
        <strong>Conferma presenza</strong> — ${escapeHtml(n.specialita)} con Dr. ${escapeHtml(n.medico_cognome)} ${escapeHtml(n.medico_nome)}
        il <strong>${dataLabel}</strong> alle ${n.ora_inizio}
        ${scadenza ? `<span class="notifica-scadenza">Scade: ${scadenza}</span>` : ''}
      </div>
      <button class="btn-primario btn-sm" onclick="confermaCheckin(${n.id})">Confermo la presenza</button>
    </div>`;
  }).join('');
}

async function confermaCheckin(id) {
  const { ok } = await api('POST', `/api/paziente/checkin/${id}?utente_id=${utente.id}`);
  if (ok) caricaNotifiche();
}

// ── PRENOTA — wizard ──────────────────────────────────────────────────────────

function mostraStep(n) {
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.add('nascosta'));
  document.getElementById('step-' + n).classList.remove('nascosta');
}

function tornaStep(n) {
  if (n === 1) { slotSelezionato = null; medicoSelezionato = null; }
  if (n === 2) { slotSelezionato = null; }
  mostraStep(n);
}

let specialitaCache = [];
let mediciCache = [];
let specialitaSelezionata = null;

async function avviaPrenota() {
  mostraStep(1);
  const { dati } = await api('GET', '/api/prenotazione/specialita');
  specialitaCache = dati;
  document.getElementById('specialita-grid').innerHTML = dati.length
    ? dati.map(s => `
        <div class="spec-card" onclick="scegliSpecialita(${s.id})">
          <div class="spec-nome">${escapeHtml(s.nome)}</div>
        </div>`).join('')
    : '<p class="vuoto">Nessuna specialità disponibile al momento.</p>';
}

async function scegliSpecialita(id) {
  specialitaSelezionata = specialitaCache.find(s => s.id === id);
  mostraStep(2);
  const { dati } = await api('GET', `/api/prenotazione/medici?specialita_id=${id}`);
  mediciCache = dati;
  document.getElementById('medici-grid').innerHTML = dati.length
    ? dati.map(m => `
        <div class="medico-card" onclick="scegliMedico(${m.id})">
          <div class="medico-avatar">${escapeHtml(m.cognome[0])}${escapeHtml(m.nome[0])}</div>
          <div class="medico-info">
            <div class="medico-nome">Dr. ${escapeHtml(m.cognome)} ${escapeHtml(m.nome)}</div>
            <div class="medico-spec">${escapeHtml(specialitaSelezionata.nome)}</div>
          </div>
        </div>`).join('')
    : '<p class="vuoto">Nessun medico disponibile.</p>';
}

async function scegliMedico(id) {
  const m = mediciCache.find(x => x.id === id);
  medicoSelezionato = {
    id,
    nome: `Dr. ${m.cognome} ${m.nome}`,
    specialita: specialitaSelezionata.nome,
  };
  mostraStep(3);
  const { dati } = await api('GET', `/api/prenotazione/slot?medico_id=${id}`);

  if (!dati.length) {
    document.getElementById('slot-grid').innerHTML = '<p class="vuoto">Nessuno slot disponibile per questo medico.</p>';
    return;
  }

  // Raggruppa per data
  const perData = {};
  dati.forEach(s => {
    if (!perData[s.data]) perData[s.data] = [];
    perData[s.data].push(s);
  });

  let html = '';
  for (const [data, slots] of Object.entries(perData)) {
    const d = new Date(data + 'T00:00:00');
    const dataLabel = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    html += `<div class="slot-gruppo">
      <div class="slot-data">${dataLabel}</div>
      <div class="slot-ore">
        ${slots.map(s => `
          <button class="slot-ora" onclick="scegliSlot(${s.id}, '${data}', '${s.ora_inizio}', '${s.ora_fine}')">
            ${s.ora_inizio} – ${s.ora_fine}
          </button>`).join('')}
      </div>
    </div>`;
  }
  document.getElementById('slot-grid').innerHTML = html;
}

function scegliSlot(id, data, oraInizio, oraFine) {
  slotSelezionato = { id, data, oraInizio, oraFine };
  const d = new Date(data + 'T00:00:00');
  const dataLabel = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  document.getElementById('riepilogo').innerHTML = `
    <div class="riepilogo-riga"><span>Specialità</span><strong>${escapeHtml(medicoSelezionato.specialita)}</strong></div>
    <div class="riepilogo-riga"><span>Medico</span><strong>${escapeHtml(medicoSelezionato.nome)}</strong></div>
    <div class="riepilogo-riga"><span>Data</span><strong>${dataLabel}</strong></div>
    <div class="riepilogo-riga"><span>Orario</span><strong>${oraInizio} – ${oraFine}</strong></div>
  `;
  document.getElementById('err-prenota').textContent = '';
  mostraStep(4);
}

async function confermaPrenotazione() {
  const errEl = document.getElementById('err-prenota');
  errEl.textContent = '';
  const note = document.getElementById('note-prenotazione').value;
  const { ok, dati } = await api('POST', '/api/prenotazione', {
    utente_id: utente.id,
    disponibilita_id: slotSelezionato.id,
    note,
  });
  if (!ok) { errEl.textContent = dati.errore; return; }
  document.getElementById('note-prenotazione').value = '';
  mostraSezione('appuntamenti');
}

// ── APPUNTAMENTI ──────────────────────────────────────────────────────────────

async function caricaAppuntamenti() {
  const { dati } = await api('GET', `/api/paziente/appuntamenti?utente_id=${utente.id}`);
  tuttiAppuntamenti = dati;

  // Popola filtro specialità
  const specialita = [...new Set(dati.map(a => a.specialita))].sort();
  const sel = document.getElementById('filtro-specialita-app');
  sel.innerHTML = '<option value="">Tutte le specialità</option>' +
    specialita.map(s => `<option value="${s}">${s}</option>`).join('');

  const oggi = new Date().toISOString().split('T')[0];
  const futuri = dati.filter(a => a.data >= oggi && a.stato !== 'cancellato');
  renderAppuntamenti('lista-appuntamenti', futuri, true);
}

function filtraAppuntamenti() {
  const spec = document.getElementById('filtro-specialita-app').value;
  const oggi = new Date().toISOString().split('T')[0];
  let futuri = tuttiAppuntamenti.filter(a => a.data >= oggi && a.stato !== 'cancellato');
  if (spec) futuri = futuri.filter(a => a.specialita === spec);
  renderAppuntamenti('lista-appuntamenti', futuri, true);
}

async function caricaStorico() {
  const { dati } = await api('GET', `/api/paziente/appuntamenti?utente_id=${utente.id}`);
  tuttiAppuntamenti = dati;
  const oggi = new Date().toISOString().split('T')[0];
  const passati = dati.filter(a => a.data < oggi || a.stato === 'cancellato');
  renderAppuntamenti('lista-storico', passati, false);
}

function renderAppuntamenti(contenitoreId, lista, mostraCancella) {
  if (!lista.length) {
    document.getElementById(contenitoreId).innerHTML = '<p class="vuoto">Nessun appuntamento trovato.</p>';
    return;
  }

  document.getElementById(contenitoreId).innerHTML = lista.map(a => {
    const d = new Date(a.data + 'T00:00:00');
    const dataLabel = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const badgeClass = { in_attesa: 'badge-attesa', confermato: 'badge-ok', cancellato: 'badge-no', completato: 'badge-completato' }[a.stato] || '';

    return `<div class="app-card" onclick="apriDettaglio(${a.id})">
      <div class="app-card-left">
        <div class="app-specialita">${escapeHtml(a.specialita)}</div>
        <div class="app-medico">Dr. ${escapeHtml(a.medico_cognome)} ${escapeHtml(a.medico_nome)}</div>
        <div class="app-data">${dataLabel} · ${escapeHtml(a.ora_inizio)} – ${escapeHtml(a.ora_fine)}</div>
      </div>
      <div class="app-card-right">
        <span class="badge-stato ${badgeClass}">${a.stato.replace('_', ' ')}</span>
        ${mostraCancella && a.stato !== 'cancellato'
          ? `<button class="btn-danger btn-sm" onclick="event.stopPropagation();cancellaAppuntamento(${a.id})">Cancella</button>`
          : ''}
      </div>
    </div>`;
  }).join('');
}

function apriDettaglio(id) {
  const app = tuttiAppuntamenti.find(x => x.id === id);
  if (!app) return;
  appuntamentoModale = app;

  const d = new Date(app.data + 'T00:00:00');
  const dataLabel = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const badgeClass = { in_attesa: 'badge-attesa', confermato: 'badge-ok', cancellato: 'badge-no', completato: 'badge-completato' }[app.stato] || '';

  document.getElementById('dettaglio-contenuto').innerHTML = `
    <div class="dettaglio-riga"><span>Specialità</span><strong>${escapeHtml(app.specialita)}</strong></div>
    <div class="dettaglio-riga"><span>Medico</span><strong>Dr. ${escapeHtml(app.medico_cognome)} ${escapeHtml(app.medico_nome)}</strong></div>
    <div class="dettaglio-riga"><span>Data</span><strong>${dataLabel}</strong></div>
    <div class="dettaglio-riga"><span>Orario</span><strong>${escapeHtml(app.ora_inizio)} – ${escapeHtml(app.ora_fine)}</strong></div>
    <div class="dettaglio-riga"><span>Stato</span><span class="badge-stato ${badgeClass}">${app.stato.replace('_', ' ')}</span></div>
    ${app.note ? `<div class="dettaglio-riga"><span>Note</span><em>${escapeHtml(app.note)}</em></div>` : ''}
  `;

  document.getElementById('btn-cancella-modale').style.display =
    app.stato !== 'cancellato' ? 'inline-block' : 'none';

  document.getElementById('modale-dettaglio').classList.remove('nascosta');
}

async function cancellaAppuntamentoDaModale() {
  if (!appuntamentoModale) return;
  await cancellaAppuntamento(appuntamentoModale.id);
  chiudiModale('modale-dettaglio');
}

async function cancellaAppuntamento(id) {
  if (!confirm('Cancellare questo appuntamento?')) return;
  const { ok, dati } = await api('PATCH', `/api/paziente/appuntamenti/${id}/cancella?utente_id=${utente.id}`);
  if (!ok) { alert(dati.errore); return; }
  caricaAppuntamenti();
}

// ── REFERTI ───────────────────────────────────────────────────────────────────

async function caricaReferti() {
  const { ok, dati } = await api('GET', `/api/referti?utente_id=${utente.id}`);
  const contenitore = document.getElementById('lista-referti');
  if (!ok || !dati.length) {
    contenitore.innerHTML = '<p class="vuoto">Nessun referto disponibile.</p>';
    return;
  }
  contenitore.innerHTML = dati.map(r => {
    const d = new Date(r.data_referto + 'T00:00:00');
    const dataLabel = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    return `<div class="app-card" onclick="apriReferto(${r.id})">
      <div class="app-card-left">
        <div class="app-specialita">${escapeHtml(r.titolo)}</div>
        <div class="app-data">${dataLabel}</div>
      </div>
      <div class="app-card-right">
        <button class="btn-primario btn-sm" onclick="event.stopPropagation();apriReferto(${r.id})">Apri</button>
      </div>
    </div>`;
  }).join('');
}

async function apriReferto(id) {
  const { ok, dati } = await api('GET', `/api/referti/${id}?utente_id=${utente.id}`);
  if (!ok) { alert(dati.errore); return; }
  const d = new Date(dati.data_referto + 'T00:00:00');
  const dataLabel = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('referto-titolo').textContent = dati.titolo;
  document.getElementById('referto-contenuto').innerHTML = `
    <div class="dettaglio-riga"><span>Data referto</span><strong>${dataLabel}</strong></div>
    <div style="margin-top:16px;font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(dati.contenuto_testuale)}</div>
  `;
  document.getElementById('modale-referto').classList.remove('nascosta');
}

// ── PROFILO ───────────────────────────────────────────────────────────────────

async function caricaProfilo() {
  const { dati } = await api('GET', `/api/paziente/profilo?utente_id=${utente.id}`);
  document.getElementById('profilo-nome').textContent = dati.nome + ' ' + dati.cognome;
  document.getElementById('profilo-email').textContent = dati.email;
  document.getElementById('p-telefono').value = dati.telefono || '';
  document.getElementById('p-nascita').value  = dati.data_nascita || '';
  document.getElementById('consenso-dossier').checked = !!dati.consenso_dossier;
  document.getElementById('ok-consenso').textContent = '';
}

async function aggiornaConsenso() {
  const consenso = document.getElementById('consenso-dossier').checked;
  const okEl = document.getElementById('ok-consenso');
  const { ok } = await api('PUT', '/api/paziente/consenso', {
    utente_id: utente.id,
    consenso,
  });
  okEl.textContent = ok
    ? (consenso ? 'Consenso prestato: i medici potranno consultare i tuoi referti pregressi.' : 'Consenso revocato.')
    : 'Errore nel salvataggio del consenso.';
}

async function salvaProfilo(e) {
  e.preventDefault();
  const errEl = document.getElementById('err-profilo');
  const okEl  = document.getElementById('ok-profilo');
  errEl.textContent = '';
  okEl.textContent  = '';

  const { ok, dati } = await api('PUT', '/api/paziente/profilo', {
    utente_id:    utente.id,
    telefono:     document.getElementById('p-telefono').value,
    data_nascita: document.getElementById('p-nascita').value,
  });

  if (!ok) { errEl.textContent = dati.errore; return; }
  okEl.textContent = 'Profilo aggiornato con successo.';
}
