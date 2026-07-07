const utente = JSON.parse(localStorage.getItem('utente') || 'null');
if (!utente || utente.ruolo !== 'medico') window.location.href = '/';

const TITOLI = { appuntamenti: 'Appuntamenti', disponibilita: 'Disponibilità', dossier: 'Dossier pazienti', impostazioni: 'Impostazioni' };
const BADGE = { in_attesa: 'badge-attesa', confermato: 'badge-ok', cancellato: 'badge-no', completato: 'badge-completato' };
const ORE = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];

let disponibilitaCache = [];
let meseCorrente = new Date();
meseCorrente.setDate(1);
let giornoSelezionato = null;

async function api(metodo, url, body) {
  const opzioni = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if (body) opzioni.body = JSON.stringify(body);
  const r = await fetch(url, opzioni);
  return { ok: r.ok, dati: await r.json() };
}

function tabella(colonne, righe, renderRiga) {
  if (!righe.length) return '<p class="vuoto">Nessun dato trovato.</p>';
  const intestazione = colonne.map(c => `<th>${c}</th>`).join('');
  const corpo = righe.map(renderRiga).join('');
  return `<table class="admin-tabella"><thead><tr>${intestazione}</tr></thead><tbody>${corpo}</tbody></table>`;
}

// ── Navigazione ───────────────────────────────────────────────────────────────

function mostraSezione(nome) {
  document.querySelectorAll('.sezione').forEach(s => s.classList.add('nascosta'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('attivo'));
  document.getElementById('s-' + nome).classList.remove('nascosta');
  document.querySelector(`[data-sezione="${nome}"]`).classList.add('attivo');
  document.getElementById('titolo-sezione').textContent = TITOLI[nome];
  if (nome === 'appuntamenti') caricaAppuntamenti();
  if (nome === 'disponibilita') caricaDisponibilita();
  if (nome === 'dossier') caricaDossierPazienti();
  if (nome === 'impostazioni') caricaImpostazioni();
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => mostraSezione(btn.dataset.sezione));
});

function logout() {
  localStorage.removeItem('utente');
  window.location.href = '/';
}

// ── Profilo ───────────────────────────────────────────────────────────────────

let profiloDati = null;

async function caricaProfilo() {
  const { dati } = await api('GET', `/api/medico/profilo?utente_id=${utente.id}`);
  profiloDati = dati;
  document.getElementById('nome-medico').textContent =
    `Dr. ${dati.cognome} ${dati.nome} — ${dati.specialita}`;
}

async function caricaImpostazioni() {
  if (!profiloDati) {
    const { dati } = await api('GET', `/api/medico/profilo?utente_id=${utente.id}`);
    profiloDati = dati;
  }
  document.getElementById('imp-nome').textContent =
    `Dr. ${profiloDati.cognome} ${profiloDati.nome}`;
  document.getElementById('imp-specialita').textContent = profiloDati.specialita;
  document.getElementById('imp-durata').value = profiloDati.durata_slot || 60;
  document.getElementById('err-imp').textContent = '';
  document.getElementById('ok-imp').textContent = '';
}

async function salvaImpostazioni() {
  const durata = parseInt(document.getElementById('imp-durata').value);
  const { ok } = await api('PATCH', `/api/medico/durata-slot?utente_id=${utente.id}`, { durata_slot: durata });
  if (ok) {
    profiloDati.durata_slot = durata;
    document.getElementById('ok-imp').textContent = 'Impostazioni salvate.';
    document.getElementById('err-imp').textContent = '';
  } else {
    document.getElementById('err-imp').textContent = 'Errore nel salvataggio.';
  }
}

// ── Appuntamenti ──────────────────────────────────────────────────────────────

let appuntamentiCache = [];

async function caricaAppuntamenti() {
  const stato = document.getElementById('filtro-stato').value;
  const { dati } = await api('GET', `/api/medico/appuntamenti?utente_id=${utente.id}`);
  appuntamentiCache = dati;
  const filtrati = stato ? dati.filter(r => r.stato === stato) : dati;

  document.getElementById('tabella-appuntamenti').innerHTML = tabella(
    ['Paziente', 'Data', 'Orario', 'Stato', 'Note visita', 'Azioni'],
    filtrati,
    r => `<tr>
      <td>${escapeHtml(r.paziente_cognome)} ${escapeHtml(r.paziente_nome)}</td>
      <td>${r.data}</td>
      <td>${r.ora_inizio} – ${r.ora_fine}</td>
      <td><span class="badge-stato ${BADGE[r.stato] || ''}">${r.stato.replace('_',' ')}</span></td>
      <td>
        ${r.stato === 'completato'
          ? `<span style="font-size:13px;color:#6b5a45;">${escapeHtml(r.note_medico) || '—'}</span>`
          : `<button class="btn-secondario btn-sm" onclick="apriNote(${r.id})">✏ Note</button>`}
      </td>
      <td class="azioni-cella">
        ${r.stato === 'in_attesa' ? `
          <button class="btn-primario btn-sm" onclick="aggiornaStato(${r.id},'confermato')">Conferma</button>
          <button class="btn-danger btn-sm" onclick="aggiornaStato(${r.id},'cancellato')">Rifiuta</button>
        ` : ''}
        ${r.stato === 'confermato' ? `
          <button class="btn-primario btn-sm" onclick="aggiornaStato(${r.id},'completato')">✓ Completa</button>
          <button class="btn-danger btn-sm" onclick="aggiornaStato(${r.id},'cancellato')">Cancella</button>
        ` : ''}
        ${r.stato === 'completato'
          ? `<button class="btn-primario btn-sm" onclick="apriReferto(${r.id})">📄 Referto</button>` : ''}
        ${r.stato === 'cancellato' ? '—' : ''}
      </td>
    </tr>`
  );
}

async function aggiornaStato(id, stato) {
  const msg = { confermato: 'confermare', cancellato: 'cancellare', completato: 'segnare come completato' };
  if (!confirm(`Vuoi ${msg[stato] || stato} questo appuntamento?`)) return;
  const { ok, dati } = await api('PATCH', `/api/medico/appuntamenti/${id}/stato?utente_id=${utente.id}`, { stato });
  if (!ok) { alert(dati.errore); return; }
  caricaAppuntamenti();
}

function apriNote(id) {
  const app = appuntamentiCache.find(a => a.id === id);
  const nota = prompt('Note sulla visita:', (app && app.note_medico) || '');
  if (nota === null) return;
  api('PATCH', `/api/medico/appuntamenti/${id}/note?utente_id=${utente.id}`, { note_medico: nota })
    .then(({ ok }) => { if (ok) caricaAppuntamenti(); });
}

// ── Referti ───────────────────────────────────────────────────────────────────

let refertoAppuntamentoId = null;

function apriReferto(id) {
  refertoAppuntamentoId = id;
  const app = appuntamentiCache.find(a => a.id === id);
  document.getElementById('ref-paziente').textContent =
    app ? `${app.paziente_cognome} ${app.paziente_nome} — ${app.data}` : '';
  document.getElementById('ref-titolo').value = '';
  document.getElementById('ref-contenuto').value = '';
  document.getElementById('err-referto').textContent = '';
  document.getElementById('modale-referto').classList.remove('nascosta');
}

function chiudiModale(id) {
  document.getElementById(id).classList.add('nascosta');
}

async function salvaReferto() {
  const errEl = document.getElementById('err-referto');
  errEl.textContent = '';
  const titolo = document.getElementById('ref-titolo').value.trim();
  const contenuto = document.getElementById('ref-contenuto').value.trim();
  if (!titolo || !contenuto) { errEl.textContent = 'Compila titolo e contenuto.'; return; }
  const { ok, dati } = await api('POST', '/api/medico/referti', {
    utente_id: utente.id,
    appuntamento_id: refertoAppuntamentoId,
    titolo,
    contenuto_testuale: contenuto,
  });
  if (!ok) { errEl.textContent = dati.errore || 'Errore nel salvataggio.'; return; }
  chiudiModale('modale-referto');
}

// ── Dossier pazienti ──────────────────────────────────────────────────────────

async function caricaDossierPazienti() {
  document.getElementById('dossier-referti').innerHTML = '';
  const { ok, dati } = await api('GET', `/api/medico/pazienti_prenotati?utente_id=${utente.id}`);
  const el = document.getElementById('lista-dossier-pazienti');
  if (!ok || !dati.length) {
    el.innerHTML = '<p class="vuoto">Nessun paziente con appuntamento confermato.</p>';
    return;
  }
  el.innerHTML = dati.map(p => `
    <div class="paziente-riga" onclick="caricaRefertiPaziente(${p.id}, this)">
      <strong>${escapeHtml(p.cognome)} ${escapeHtml(p.nome)}</strong>
      ${p.consenso_dossier
        ? '<span class="badge-stato badge-ok" style="margin-left:8px;">Dossier condiviso</span>'
        : '<span class="badge-stato badge-attesa" style="margin-left:8px;">Solo miei referti</span>'}
    </div>`).join('');
}

async function caricaRefertiPaziente(pazienteId) {
  const el = document.getElementById('dossier-referti');
  const { ok, dati } = await api('GET', `/api/medico/referti_paziente/${pazienteId}?utente_id=${utente.id}`);

  if (!ok) {
    el.innerHTML = '';
    alert(dati.errore || 'Il paziente non ha prestato il consenso per la visualizzazione dei referti pregressi');
    return;
  }
  if (!dati.length) {
    el.innerHTML = '<p class="vuoto">Nessun referto disponibile per questo paziente.</p>';
    return;
  }
  el.innerHTML = '<h4 style="margin:0 0 12px;font-size:15px;color:#1c2b45;">Referti del paziente</h4>' +
    dati.map(r => {
      const d = new Date(r.data_referto + 'T00:00:00');
      const dataLabel = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
      const autore = r.medico_cognome ? `Dr. ${escapeHtml(r.medico_cognome)} ${escapeHtml(r.medico_nome)}` : '—';
      return `<div class="profilo-card" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:14px;">${escapeHtml(r.titolo)}</strong>
          <span style="font-size:12px;color:#9a8a6f;">${dataLabel} · ${autore}</span>
        </div>
        <p style="font-size:13px;line-height:1.6;margin:10px 0 0;white-space:pre-wrap;">${escapeHtml(r.contenuto_testuale)}</p>
      </div>`;
    }).join('');
}

// ── Calendario disponibilità ──────────────────────────────────────────────────

async function caricaDisponibilita() {
  const { dati } = await api('GET', `/api/medico/disponibilita?utente_id=${utente.id}`);
  disponibilitaCache = dati;
  renderCalendario();
  if (giornoSelezionato) renderOre(giornoSelezionato);
}

function renderCalendario() {
  const anno = meseCorrente.getFullYear();
  const mese = meseCorrente.getMonth();

  document.getElementById('cal-titolo').textContent =
    new Date(anno, mese, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  const primoGiorno = new Date(anno, mese, 1).getDay();
  const giorniNelMese = new Date(anno, mese + 1, 0).getDate();
  const offset = (primoGiorno + 6) % 7;
  const oggi = new Date().toISOString().split('T')[0];

  let html = '';
  for (let i = 0; i < offset; i++) html += '<div class="cal-cella vuota"></div>';

  for (let g = 1; g <= giorniNelMese; g++) {
    const dataStr = `${anno}-${String(mese + 1).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
    const slots = disponibilitaCache.filter(s => s.data === dataStr);
    const haLibero   = slots.some(s => s.stato === 'libero');
    const haPrenotato = slots.some(s => s.stato === 'prenotato');
    const isOggi = dataStr === oggi;
    const isSelezionato = dataStr === giornoSelezionato;

    let classi = 'cal-cella';
    if (isOggi) classi += ' oggi';
    if (isSelezionato) classi += ' selezionato';
    if (dataStr < oggi) classi += ' passato';

    html += `<div class="${classi}" onclick="selezionaGiorno('${dataStr}')">
      <span class="cal-num">${g}</span>
      ${haLibero || haPrenotato ? `<div class="cal-dots">
        ${haLibero ? '<span class="dot dot-libero"></span>' : ''}
        ${haPrenotato ? '<span class="dot dot-prenotato"></span>' : ''}
      </div>` : ''}
    </div>`;
  }

  document.getElementById('cal-giorni').innerHTML = html;
}

function cambioMese(delta) {
  meseCorrente.setMonth(meseCorrente.getMonth() + delta);
  giornoSelezionato = null;
  document.getElementById('dettaglio-giorno').classList.add('nascosta');
  caricaDisponibilita();
}

function selezionaGiorno(data) {
  giornoSelezionato = data;
  renderCalendario();
  renderOre(data);
}

function renderOre(data) {
  const slots = disponibilitaCache.filter(s => s.data === data);
  const d = new Date(data + 'T00:00:00');
  document.getElementById('dettaglio-titolo').textContent =
    d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  const durata = profiloDati ? (profiloDati.durata_slot || 60) : 60;
  const html = ORE.map(ora => {
    const [h, m] = ora.split(':').map(Number);
    const fineMin = h * 60 + m + durata;
    const oraFine = `${String(Math.floor(fineMin / 60)).padStart(2, '0')}:${String(fineMin % 60).padStart(2, '0')}`;
    const slot = slots.find(s => s.ora_inizio.startsWith(ora));

    if (slot) {
      if (slot.stato === 'prenotato') {
        return `<button class="ora-btn ora-prenotata" disabled>${ora}<span class="ora-label">prenotato</span></button>`;
      }
      return `<button class="ora-btn ora-libera" onclick="eliminaSlot(${slot.id})">${ora}<span class="ora-label">rimuovi</span></button>`;
    }
    return `<button class="ora-btn ora-vuota" onclick="aggiungiSlot('${data}','${ora}','${oraFine}')">${ora}<span class="ora-label">aggiungi</span></button>`;
  }).join('');

  document.getElementById('ore-grid').innerHTML = html;
  document.getElementById('dettaglio-giorno').classList.remove('nascosta');
}

async function aggiungiSlot(data, ora_inizio, ora_fine) {
  const { ok, dati } = await api('POST', '/api/medico/disponibilita', {
    utente_id: utente.id, data, ora_inizio, ora_fine,
  });
  if (!ok) { alert(dati.errore); return; }
  await caricaDisponibilita();
}

async function eliminaSlot(id) {
  if (!confirm('Rimuovere questo slot?')) return;
  const { ok, dati } = await api('DELETE', `/api/medico/disponibilita/${id}?utente_id=${utente.id}`);
  if (!ok) { alert(dati.errore); return; }
  await caricaDisponibilita();
}

// ── Avvio ─────────────────────────────────────────────────────────────────────

caricaProfilo();
caricaAppuntamenti();
