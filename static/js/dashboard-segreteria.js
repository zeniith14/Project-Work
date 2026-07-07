const utente = JSON.parse(localStorage.getItem('utente') || 'null');
if (!utente || utente.ruolo !== 'segretaria') window.location.href = '/';

document.getElementById('nome-segreteria').textContent = utente.nome + ' ' + utente.cognome;

const TITOLI = {
  oggi:         'Riepilogo di oggi',
  appuntamenti: 'Appuntamenti',
  nuova:        'Nuova prenotazione',
  slot:         'Slot medici',
  pazienti:     'Cerca paziente',
};

let tuttiMedici     = [];
let appCheckinId    = null;
let nsPaziente      = null;
let nsSlotId        = null;
let nsMedicoId      = null;

async function api(metodo, url, body) {
  const opzioni = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if (body) opzioni.body = JSON.stringify(body);
  const r = await fetch(url, opzioni);
  return { ok: r.ok, dati: await r.json() };
}

function tabella(colonne, righe, renderRiga) {
  if (!righe.length) return '<p class="vuoto">Nessun dato trovato.</p>';
  return `<table class="admin-tabella">
    <thead><tr>${colonne.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${righe.map(renderRiga).join('')}</tbody>
  </table>`;
}

function badgeStato(stato) {
  const m = { in_attesa: 'badge-attesa', confermato: 'badge-ok', cancellato: 'badge-no', completato: 'badge-completato' };
  return `<span class="badge-stato ${m[stato] || ''}">${stato.replace('_', ' ')}</span>`;
}

function chiudiModale(id) {
  document.getElementById(id).classList.add('nascosta');
}
document.querySelectorAll('.overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) chiudiModale(o.id); });
});

function logout() { localStorage.removeItem('utente'); window.location.href = '/'; }

// ── Navigazione ───────────────────────────────────────────────────────────────

function mostraSezione(nome) {
  document.querySelectorAll('.sezione').forEach(s => s.classList.add('nascosta'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('attivo'));
  document.getElementById('s-' + nome).classList.remove('nascosta');
  document.querySelector(`[data-sezione="${nome}"]`).classList.add('attivo');
  document.getElementById('titolo-sezione').textContent = TITOLI[nome];
  const azioni = {
    oggi:         caricaOggi,
    appuntamenti: () => { caricaFiltri(); filtraAppuntamenti(); },
    nuova:        avviaNuovaPrenotazione,
    slot:         caricaSezioneSlot,
    pazienti:     () => {},
  };
  azioni[nome]();
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => mostraSezione(btn.dataset.sezione));
});

// ── OGGI ─────────────────────────────────────────────────────────────────────

async function caricaOggi() {
  const { dati } = await api('GET', '/api/segreteria/oggi');
  if (!dati.length) {
    document.getElementById('lista-oggi').innerHTML = '<p class="vuoto">Nessun appuntamento per oggi.</p>';
    return;
  }
  document.getElementById('lista-oggi').innerHTML = dati.map(a => {
    const checkinBadge = a.richiesta_checkin
      ? (a.checkin_confermato
          ? '<span class="badge-stato badge-ok">✓ Presenza confermata</span>'
          : '<span class="badge-stato badge-attesa">⏳ In attesa check-in</span>')
      : '';
    return `<div class="oggi-card">
      <div class="oggi-orario">${a.ora_inizio} – ${a.ora_fine}</div>
      <div class="oggi-info">
        <div class="oggi-paziente">${escapeHtml(a.paziente_cognome)} ${escapeHtml(a.paziente_nome)}</div>
        <div class="oggi-medico">Dr. ${escapeHtml(a.medico_cognome)} ${escapeHtml(a.medico_nome)} · ${escapeHtml(a.specialita)}</div>
      </div>
      <div class="oggi-azioni">
        ${badgeStato(a.stato)}
        ${checkinBadge}
        ${a.stato === 'confermato' && !a.richiesta_checkin
          ? `<button class="btn-secondario btn-sm" onclick="apriCheckin(${a.id})">Richiedi check-in</button>`
          : ''}
      </div>
    </div>`;
  }).join('');
}

// ── APPUNTAMENTI ──────────────────────────────────────────────────────────────

async function caricaFiltri() {
  const { dati: medici } = await api('GET', '/api/segreteria/medici');
  tuttiMedici = medici;
  const selM = document.getElementById('f-medico');
  selM.innerHTML = '<option value="">Tutti i medici</option>' +
    medici.map(m => `<option value="${m.id}">Dr. ${escapeHtml(m.cognome)} ${escapeHtml(m.nome)}</option>`).join('');

  const { dati: spec } = await api('GET', '/api/admin/specialita');
  const selS = document.getElementById('f-specialita');
  selS.innerHTML = '<option value="">Tutte le specialità</option>' +
    spec.map(s => `<option value="${s.id}">${escapeHtml(s.nome)}</option>`).join('');
}

async function filtraAppuntamenti() {
  const stato       = document.getElementById('f-stato').value;
  const medico_id   = document.getElementById('f-medico').value;
  const specialita_id = document.getElementById('f-specialita').value;
  const data        = document.getElementById('f-data').value;

  let url = '/api/segreteria/appuntamenti?';
  if (stato) url += `stato=${stato}&`;
  if (medico_id) url += `medico_id=${medico_id}&`;
  if (specialita_id) url += `specialita_id=${specialita_id}&`;
  if (data) url += `data=${data}&`;

  const { dati } = await api('GET', url);
  document.getElementById('tabella-appuntamenti').innerHTML = tabella(
    ['Paziente', 'Medico', 'Specialità', 'Data', 'Orario', 'Stato', 'Check-in', ''],
    dati,
    r => `<tr>
      <td>${escapeHtml(r.paziente_cognome)} ${escapeHtml(r.paziente_nome)}</td>
      <td>Dr. ${escapeHtml(r.medico_cognome)} ${escapeHtml(r.medico_nome)}</td>
      <td>${escapeHtml(r.specialita)}</td>
      <td>${r.data}</td>
      <td>${r.ora_inizio} – ${r.ora_fine}</td>
      <td>${badgeStato(r.stato)}</td>
      <td>${r.richiesta_checkin
        ? (r.checkin_confermato
            ? '<span class="badge-stato badge-ok">Confermato</span>'
            : `<span class="badge-stato badge-attesa">In attesa</span><br><small>${r.checkin_scadenza ? 'Scade: ' + r.checkin_scadenza.replace('T',' ') : ''}</small>`)
        : '—'}</td>
      <td class="azioni-cella">
        ${r.stato === 'in_attesa'
          ? `<button class="btn-primario btn-sm" onclick="aggiornaStato(${r.id},'confermato')">Conferma</button>
             <button class="btn-danger" onclick="aggiornaStato(${r.id},'cancellato')">Cancella</button>`
          : ''}
        ${r.stato === 'confermato' && !r.richiesta_checkin
          ? `<button class="btn-secondario btn-sm" onclick="apriCheckin(${r.id})">Check-in</button>`
          : ''}
      </td>
    </tr>`
  );
}

function resetFiltri() {
  ['f-stato','f-medico','f-specialita','f-data'].forEach(id => {
    const el = document.getElementById(id);
    el.value = '';
  });
  filtraAppuntamenti();
}

async function aggiornaStato(id, stato) {
  if (!confirm(`${stato === 'confermato' ? 'Confermare' : 'Cancellare'} questo appuntamento?`)) return;
  const { ok } = await api('PATCH', `/api/segreteria/appuntamenti/${id}/stato`, { stato });
  if (ok) filtraAppuntamenti();
}

// ── CHECK-IN ──────────────────────────────────────────────────────────────────

function apriCheckin(id) {
  appCheckinId = id;
  document.getElementById('modale-checkin').classList.remove('nascosta');
}

async function inviaCheckin() {
  const ore = parseInt(document.getElementById('checkin-ore').value);
  const { ok } = await api('POST', `/api/segreteria/appuntamenti/${appCheckinId}/richiedi-checkin`, { ore_anticipo: ore });
  chiudiModale('modale-checkin');
  if (ok) {
    const sez = document.getElementById('s-oggi').classList.contains('nascosta') ? 'appuntamenti' : 'oggi';
    if (sez === 'oggi') caricaOggi(); else filtraAppuntamenti();
  }
}

// ── NUOVA PRENOTAZIONE ────────────────────────────────────────────────────────

function mostraNs(n) {
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.add('nascosta'));
  document.getElementById('ns-' + n).classList.remove('nascosta');
}

function tornaNs(n) {
  if (n <= 2) { nsSlotId = null; }
  if (n <= 1) { nsPaziente = null; nsMedicoId = null; }
  mostraNs(n);
}

async function avviaNuovaPrenotazione() {
  mostraNs(1);
  nsPaziente = null; nsSlotId = null; nsMedicoId = null;
  document.getElementById('risultati-pazienti').innerHTML = '';
  document.getElementById('cerca-paziente').value = '';

  const { dati: spec } = await api('GET', '/api/admin/specialita');
  document.getElementById('ns-specialita').innerHTML =
    '<option value="">— seleziona —</option>' +
    spec.map(s => `<option value="${s.id}">${escapeHtml(s.nome)}</option>`).join('');
}

let pazientiCache = [];

async function cercaPaziente() {
  const q = document.getElementById('cerca-paziente').value.trim();
  const { dati } = await api('GET', `/api/segreteria/pazienti?q=${encodeURIComponent(q)}`);
  pazientiCache = dati;
  document.getElementById('risultati-pazienti').innerHTML = dati.length
    ? dati.map(p => `
        <div class="paziente-riga" onclick="selezionaPaziente(${p.id})">
          <strong>${escapeHtml(p.cognome)} ${escapeHtml(p.nome)}</strong> <span style="color:#9a8a6f;font-size:13px;">${escapeHtml(p.email)}</span>
        </div>`).join('')
    : '<p class="vuoto">Nessun paziente trovato.</p>';
}

function selezionaPaziente(id) {
  const p = pazientiCache.find(x => x.id === id);
  nsPaziente = { id, nome: `${p.cognome} ${p.nome}`, email: p.email };
  document.getElementById('paziente-selezionato-box').innerHTML =
    `<div class="paziente-sel-pill">👤 ${escapeHtml(nsPaziente.nome)} <span>${escapeHtml(p.email)}</span></div>`;
  mostraNs(2);
}

async function caricaMediciNs() {
  const specId = document.getElementById('ns-specialita').value;
  if (!specId) return;
  const { dati } = await api('GET', `/api/prenotazione/medici?specialita_id=${specId}`);
  document.getElementById('ns-medico').innerHTML =
    '<option value="">— seleziona medico —</option>' +
    dati.map(m => `<option value="${m.id}">Dr. ${escapeHtml(m.cognome)} ${escapeHtml(m.nome)}</option>`).join('');
}

async function caricaSlotNs() {
  nsMedicoId = document.getElementById('ns-medico').value;
  if (!nsMedicoId) return;
  const { dati } = await api('GET', `/api/prenotazione/slot?medico_id=${nsMedicoId}`);
  if (!dati.length) {
    document.getElementById('slot-ns').innerHTML = '<p class="vuoto">Nessuno slot disponibile.</p>';
    mostraNs(3);
    return;
  }
  const perData = {};
  dati.forEach(s => { if (!perData[s.data]) perData[s.data] = []; perData[s.data].push(s); });
  let html = '';
  for (const [data, slots] of Object.entries(perData)) {
    const d = new Date(data + 'T00:00:00');
    html += `<div class="slot-gruppo">
      <div class="slot-data">${d.toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' })}</div>
      <div class="slot-ore">${slots.map(s =>
        `<button class="slot-ora" onclick="scegliSlotNs(${s.id},'${data}','${s.ora_inizio}','${s.ora_fine}')">
          ${s.ora_inizio} – ${s.ora_fine}
        </button>`).join('')}
      </div>
    </div>`;
  }
  document.getElementById('slot-ns').innerHTML = html;
  mostraNs(3);
}

function scegliSlotNs(id, data, oraInizio, oraFine) {
  nsSlotId = id;
  const medicoNome = document.getElementById('ns-medico').selectedOptions[0].text;
  const specNome   = document.getElementById('ns-specialita').selectedOptions[0].text;
  const d = new Date(data + 'T00:00:00');
  document.getElementById('ns-riepilogo').innerHTML = `
    <div class="riepilogo-riga"><span>Paziente</span><strong>${escapeHtml(nsPaziente.nome)}</strong></div>
    <div class="riepilogo-riga"><span>Specialità</span><strong>${escapeHtml(specNome)}</strong></div>
    <div class="riepilogo-riga"><span>Medico</span><strong>${escapeHtml(medicoNome)}</strong></div>
    <div class="riepilogo-riga"><span>Data</span><strong>${d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</strong></div>
    <div class="riepilogo-riga"><span>Orario</span><strong>${oraInizio} – ${oraFine}</strong></div>
  `;
  document.getElementById('err-ns').textContent = '';
  mostraNs(4);
}

async function confermaNs() {
  const note = document.getElementById('ns-note').value;
  const { ok, dati } = await api('POST', '/api/segreteria/appuntamento', {
    paziente_utente_id: nsPaziente.id,
    disponibilita_id: nsSlotId,
    note,
  });
  if (!ok) { document.getElementById('err-ns').textContent = dati.errore; return; }
  mostraSezione('appuntamenti');
}

// ── SLOT MEDICI ───────────────────────────────────────────────────────────────

const ORE_DISPONIBILI = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
let slotOccupati = new Set();

async function caricaSezioneSlot() {
  const { dati: medici } = await api('GET', '/api/segreteria/medici');
  tuttiMedici = medici;
  document.getElementById('slot-medico-sel').innerHTML =
    '<option value="">— seleziona medico —</option>' +
    medici.map(m => `<option value="${m.id}">Dr. ${escapeHtml(m.cognome)} ${escapeHtml(m.nome)} (${escapeHtml(m.specialita)})</option>`).join('');
  document.getElementById('tabella-slot').innerHTML = '';
  document.getElementById('ore-grid-slot').innerHTML = '';
}

async function aggiornaOreSlot() {
  const medicoId = document.getElementById('slot-medico-sel').value;
  const data     = document.getElementById('slot-data').value;
  const grid     = document.getElementById('ore-grid-slot');
  if (!data) { grid.innerHTML = ''; return; }

  slotOccupati = new Set();
  if (medicoId) {
    const { dati } = await api('GET', `/api/segreteria/disponibilita?medico_id=${medicoId}`);
    dati.filter(s => s.data === data).forEach(s => slotOccupati.add(s.ora_inizio));
  }

  grid.innerHTML = ORE_DISPONIBILI.map(ora => {
    const occupata = slotOccupati.has(ora);
    return `<button class="ora-btn ${occupata ? 'ora-prenotata' : 'ora-vuota'}"
      ${occupata ? 'disabled title="Slot già presente"' : `onclick="aggiungiSlotOra('${ora}')" title="Aggiungi ${ora}"`}>
      ${ora}
      <span class="ora-label">${occupata ? 'già presente' : '+ aggiungi'}</span>
    </button>`;
  }).join('');
}

async function caricaSlotMedico() {
  const medicoId = document.getElementById('slot-medico-sel').value;
  if (!medicoId) { document.getElementById('tabella-slot').innerHTML = ''; return; }
  const { dati } = await api('GET', `/api/segreteria/disponibilita?medico_id=${medicoId}`);
  if (!dati || !dati.length) {
    document.getElementById('tabella-slot').innerHTML = '<p class="vuoto">Nessuno slot per questo medico.</p>';
    return;
  }
  document.getElementById('tabella-slot').innerHTML = tabella(
    ['Data', 'Ora inizio', 'Ora fine', 'Stato', ''],
    dati,
    r => `<tr>
      <td>${r.data}</td>
      <td>${r.ora_inizio}</td>
      <td>${r.ora_fine}</td>
      <td>${r.prenotato ? '<span class="badge-stato badge-attesa">Prenotato</span>' : '<span class="badge-stato badge-ok">Libero</span>'}</td>
      <td>${!r.prenotato ? `<button class="btn-danger btn-sm" onclick="eliminaSlot(${r.id})">Elimina</button>` : ''}</td>
    </tr>`
  );
}

async function eliminaSlot(id) {
  if (!confirm('Eliminare questo slot?')) return;
  const { ok, dati } = await api('DELETE', `/api/segreteria/disponibilita/${id}`);
  if (!ok) { alert(dati.errore); return; }
  caricaSlotMedico();
  aggiornaOreSlot();
}

async function aggiungiSlotOra(ora_inizio) {
  const errEl    = document.getElementById('err-slot');
  errEl.textContent = '';
  const medicoId = document.getElementById('slot-medico-sel').value;
  const data     = document.getElementById('slot-data').value;
  if (!medicoId) { errEl.textContent = 'Seleziona prima un medico.'; return; }
  if (!data)     { errEl.textContent = 'Seleziona prima una data.'; return; }
  if (data < new Date().toISOString().split('T')[0]) {
    errEl.textContent = 'Non puoi aggiungere slot in una data passata.'; return;
  }

  const medico = tuttiMedici.find(m => m.id == medicoId);
  const durata = medico ? (medico.durata_slot || 60) : 60;

  const [h, m] = ora_inizio.split(':').map(Number);
  const totalMin = h * 60 + m + durata;
  const ora_fine = `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;

  const { ok, dati } = await api('POST', '/api/segreteria/disponibilita', {
    medico_id: parseInt(medicoId), data, ora_inizio, ora_fine,
  });
  if (!ok) { errEl.textContent = dati.errore; return; }
  await aggiornaOreSlot();
  caricaSlotMedico();
}

// ── CERCA PAZIENTE ────────────────────────────────────────────────────────────

let pazientiDettaglioCache = [];

async function cercaPazienteDettaglio() {
  const q = document.getElementById('cerca-p2').value.trim();
  const { dati } = await api('GET', `/api/segreteria/pazienti?q=${encodeURIComponent(q)}`);
  pazientiDettaglioCache = dati;
  document.getElementById('risultati-p2').innerHTML = dati.length
    ? dati.map(p => `
        <div class="paziente-riga" onclick="apriDettaglioPaziente(${p.id})">
          <div><strong>${escapeHtml(p.cognome)} ${escapeHtml(p.nome)}</strong></div>
          <div style="font-size:13px;color:#9a8a6f;">${escapeHtml(p.email)} ${p.telefono ? '· ' + escapeHtml(p.telefono) : ''}</div>
        </div>`).join('')
    : '<p class="vuoto">Nessun paziente trovato.</p>';
}

function apriDettaglioPaziente(id) {
  const p = pazientiDettaglioCache.find(x => x.id === id);
  if (!p) return;
  document.getElementById('mp-titolo').textContent = `${p.cognome} ${p.nome}`;
  document.getElementById('mp-info').innerHTML = `
    <div class="dettaglio-riga-semplice"><span>Email</span><span>${escapeHtml(p.email)}</span></div>
    <div class="dettaglio-riga-semplice"><span>Telefono</span><span>${escapeHtml(p.telefono) || '—'}</span></div>
    <div class="dettaglio-riga-semplice"><span>Data di nascita</span><span>${escapeHtml(p.data_nascita) || '—'}</span></div>
  `;
  document.getElementById('mp-appuntamenti').innerHTML = '<p class="vuoto">Consulta la sezione Appuntamenti filtrando per data o medico.</p>';
  document.getElementById('modale-paziente').classList.remove('nascosta');
}

// ── Avvio ─────────────────────────────────────────────────────────────────────

caricaOggi();
