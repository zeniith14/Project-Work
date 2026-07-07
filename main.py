from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
import bcrypt
import secrets
import string
import pymysql

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

app.mount("/static", StaticFiles(directory="static"), name="static")


def get_connection():
    return pymysql.connect(
        host="localhost",
        user="root",
        password="",
        database="vitaserena",
        cursorclass=pymysql.cursors.DictCursor
    )

def genera_password(lunghezza=10):
    caratteri = string.ascii_letters + string.digits
    return ''.join(secrets.choice(caratteri) for _ in range(lunghezza))

def serializza_righe(rows):
    """Converte date/timedelta in stringhe per la serializzazione JSON."""
    import datetime
    for r in rows:
        for k, v in r.items():
            if isinstance(v, (datetime.date, datetime.datetime)):
                r[k] = v.isoformat()
            elif isinstance(v, datetime.timedelta):
                total = int(v.total_seconds())
                r[k] = f"{total // 3600:02d}:{(total % 3600) // 60:02d}"
    return rows

# ── Pagine HTML ───────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return FileResponse("templates/index.html")

@app.get("/dashboard-admin")
def dashboard_admin():
    return FileResponse("templates/dashboard-admin.html")

@app.get("/dashboard-medico")
def dashboard_medico():
    return FileResponse("templates/dashboard-medico.html")

@app.get("/dashboard-segreteria")
def dashboard_segreteria():
    return FileResponse("templates/dashboard-segreteria.html")

@app.get("/dashboard-paziente")
def dashboard_paziente():
    return FileResponse("templates/dashboard-paziente.html")

@app.get("/cambia-password")
def cambia_password_page():
    return FileResponse("templates/cambia-password.html")

@app.get("/privacy")
def privacy_page():
    return FileResponse("templates/privacy.html")

# ── API Registrazione ─────────────────────────────────────────────────────────

STATI_VALIDI = {"in_attesa", "confermato", "cancellato", "completato"}
DURATE_VALIDE = {15, 20, 30, 45, 60, 90}

class DatiRegistrazione(BaseModel):
    nome: str
    cognome: str
    email: str
    password: str
    telefono: str = ""
    data_nascita: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("La password deve essere di almeno 8 caratteri")
        return v

    @field_validator("nome", "cognome")
    @classmethod
    def no_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Campo obbligatorio")
        if len(v) > 100:
            raise ValueError("Troppo lungo")
        return v

    @field_validator("email")
    @classmethod
    def email_valida(cls, v):
        if "@" not in v or len(v) > 255:
            raise ValueError("Email non valida")
        return v.lower().strip()

@app.post("/api/registrazione")
def registrazione(dati: DatiRegistrazione):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM utenti WHERE email = %s", (dati.email,))
            if cur.fetchone():
                return JSONResponse(status_code=409, content={"errore": "Email già registrata"})

            password_hash = bcrypt.hashpw(dati.password.encode("utf-8"), bcrypt.gensalt()).decode()
            cur.execute(
                "INSERT INTO utenti (email, password, nome, cognome, ruolo) VALUES (%s, %s, %s, %s, 'paziente')",
                (dati.email, password_hash, dati.nome, dati.cognome)
            )
            utente_id = cur.lastrowid
            cur.execute(
                "INSERT INTO pazienti (utente_id, telefono, data_nascita) VALUES (%s, %s, %s)",
                (utente_id, dati.telefono or None, dati.data_nascita)
            )
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Registrazione completata"}

# ── API Login ─────────────────────────────────────────────────────────────────

class CredenzialiLogin(BaseModel):
    email: str
    password: str

@app.post("/api/login")
def login(credenziali: CredenzialiLogin):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, nome, cognome, ruolo, password, primo_accesso FROM utenti WHERE email = %s",
                (credenziali.email,)
            )
            utente = cur.fetchone()
    finally:
        conn.close()

    if utente is None:
        return JSONResponse(status_code=401, content={"errore": "Credenziali non valide"})

    password_ok = bcrypt.checkpw(
        credenziali.password.encode("utf-8"),
        utente["password"].encode("utf-8")
    )
    if not password_ok:
        return JSONResponse(status_code=401, content={"errore": "Credenziali non valide"})

    return {
        "id": utente["id"],
        "nome": utente["nome"],
        "cognome": utente["cognome"],
        "ruolo": utente["ruolo"],
        "primo_accesso": utente["primo_accesso"],
    }

# ── API Cambia Password ───────────────────────────────────────────────────────

class DatiCambioPassword(BaseModel):
    utente_id: int
    nuova_password: str

    @field_validator("nuova_password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("La password deve essere di almeno 8 caratteri")
        return v

@app.post("/api/cambia-password")
def cambia_password(dati: DatiCambioPassword):
    password_hash = bcrypt.hashpw(dati.nuova_password.encode("utf-8"), bcrypt.gensalt()).decode()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE utenti SET password = %s, primo_accesso = 0 WHERE id = %s",
                (password_hash, dati.utente_id)
            )
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Password aggiornata"}

# ── API Admin — Statistiche ───────────────────────────────────────────────────

@app.get("/api/admin/stats")
def admin_stats():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as tot FROM appuntamenti")
            tot_appuntamenti = cur.fetchone()["tot"]

            cur.execute("""
                SELECT COUNT(*) as tot FROM appuntamenti a
                JOIN disponibilita d ON a.disponibilita_id = d.id
                WHERE d.data = CURDATE() AND a.stato != 'cancellato'
            """)
            appuntamenti_oggi = cur.fetchone()["tot"]

            cur.execute("SELECT COUNT(*) as tot FROM medici")
            tot_medici = cur.fetchone()["tot"]

            cur.execute("SELECT COUNT(*) as tot FROM pazienti")
            tot_pazienti = cur.fetchone()["tot"]

            cur.execute("""
                SELECT COUNT(*) as tot FROM appuntamenti
                WHERE stato = 'in_attesa'
            """)
            in_attesa = cur.fetchone()["tot"]
    finally:
        conn.close()

    return {
        "tot_appuntamenti": tot_appuntamenti,
        "appuntamenti_oggi": appuntamenti_oggi,
        "tot_medici": tot_medici,
        "tot_pazienti": tot_pazienti,
        "in_attesa": in_attesa,
    }

# ── API Admin — Calendario disponibilità ─────────────────────────────────────

@app.get("/api/admin/disponibilita")
def admin_disponibilita(data: str):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT u.nome, u.cognome, s.nome AS specialita,
                       d.ora_inizio, d.ora_fine, d.stato
                FROM disponibilita d
                JOIN medici m ON d.medico_id = m.id
                JOIN utenti u ON m.utente_id = u.id
                JOIN specialita s ON m.specialita_id = s.id
                WHERE d.data = %s
                ORDER BY s.nome, d.ora_inizio
            """, (data,))
            rows = cur.fetchall()
    finally:
        conn.close()
    return serializza_righe(rows)

# ── API Admin — Medici ────────────────────────────────────────────────────────

@app.get("/api/admin/medici")
def admin_lista_medici():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT m.id, u.id AS utente_id, u.nome, u.cognome, u.email,
                       s.nome AS specialita, u.primo_accesso, m.durata_slot
                FROM medici m
                JOIN utenti u ON m.utente_id = u.id
                JOIN specialita s ON m.specialita_id = s.id
                ORDER BY u.cognome
            """)
            rows = cur.fetchall()
    finally:
        conn.close()
    return rows

class DatiNuovoMedico(BaseModel):
    nome: str
    cognome: str
    email: str
    specialita_id: int
    durata_slot: int = 60

@app.post("/api/admin/medici")
def admin_crea_medico(dati: DatiNuovoMedico):
    password_monouso = genera_password()
    password_hash = bcrypt.hashpw(password_monouso.encode(), bcrypt.gensalt()).decode()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM utenti WHERE email = %s", (dati.email,))
            if cur.fetchone():
                return JSONResponse(status_code=409, content={"errore": "Email già registrata"})
            cur.execute(
                "INSERT INTO utenti (email, password, nome, cognome, ruolo, primo_accesso) VALUES (%s, %s, %s, %s, 'medico', 1)",
                (dati.email, password_hash, dati.nome, dati.cognome)
            )
            utente_id = cur.lastrowid
            cur.execute(
                "INSERT INTO medici (utente_id, specialita_id, durata_slot) VALUES (%s, %s, %s)",
                (utente_id, dati.specialita_id, dati.durata_slot)
            )
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Medico creato", "password_monouso": password_monouso}

class DatiDurataSlot(BaseModel):
    durata_slot: int

    @field_validator("durata_slot")
    @classmethod
    def durata_valida(cls, v):
        if v not in DURATE_VALIDE:
            raise ValueError(f"Durata non valida. Valori consentiti: {DURATE_VALIDE}")
        return v

@app.patch("/api/admin/medici/{medico_id}/durata")
def admin_aggiorna_durata(medico_id: int, dati: DatiDurataSlot):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE medici SET durata_slot = %s WHERE id = %s", (dati.durata_slot, medico_id))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Durata aggiornata"}

@app.delete("/api/admin/medici/{medico_id}")
def admin_elimina_medico(medico_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT utente_id FROM medici WHERE id = %s", (medico_id,))
            row = cur.fetchone()
            if not row:
                return JSONResponse(status_code=404, content={"errore": "Medico non trovato"})
            utente_id = row["utente_id"]
            cur.execute("DELETE FROM medici WHERE id = %s", (medico_id,))
            cur.execute("DELETE FROM utenti WHERE id = %s", (utente_id,))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Medico eliminato"}

# ── API Admin — Segreteria ────────────────────────────────────────────────────

@app.get("/api/admin/segreteria")
def admin_lista_segreteria():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, nome, cognome, email, primo_accesso
                FROM utenti WHERE ruolo = 'segretaria'
                ORDER BY cognome
            """)
            rows = cur.fetchall()
    finally:
        conn.close()
    return rows

class DatiNuovaSegreteria(BaseModel):
    nome: str
    cognome: str
    email: str

@app.post("/api/admin/segreteria")
def admin_crea_segreteria(dati: DatiNuovaSegreteria):
    password_monouso = genera_password()
    password_hash = bcrypt.hashpw(password_monouso.encode(), bcrypt.gensalt()).decode()
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM utenti WHERE email = %s", (dati.email,))
            if cur.fetchone():
                return JSONResponse(status_code=409, content={"errore": "Email già registrata"})
            cur.execute(
                "INSERT INTO utenti (email, password, nome, cognome, ruolo, primo_accesso) VALUES (%s, %s, %s, %s, 'segretaria', 1)",
                (dati.email, password_hash, dati.nome, dati.cognome)
            )
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Segreteria creata", "password_monouso": password_monouso}

@app.delete("/api/admin/segreteria/{utente_id}")
def admin_elimina_segreteria(utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM utenti WHERE id = %s AND ruolo = 'segretaria'", (utente_id,))
            if cur.rowcount == 0:
                return JSONResponse(status_code=404, content={"errore": "Non trovato"})
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Eliminato"}

# ── API Admin — Specialità ────────────────────────────────────────────────────

@app.get("/api/admin/specialita")
def admin_lista_specialita():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, nome, descrizione FROM specialita ORDER BY nome")
            rows = cur.fetchall()
    finally:
        conn.close()
    return rows

class DatiSpecialita(BaseModel):
    nome: str
    descrizione: str = ""

@app.post("/api/admin/specialita")
def admin_crea_specialita(dati: DatiSpecialita):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO specialita (nome, descrizione) VALUES (%s, %s)",
                (dati.nome, dati.descrizione)
            )
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Specialità creata"}

@app.delete("/api/admin/specialita/{specialita_id}")
def admin_elimina_specialita(specialita_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM specialita WHERE id = %s", (specialita_id,))
            if cur.rowcount == 0:
                return JSONResponse(status_code=404, content={"errore": "Non trovata"})
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Specialità eliminata"}

# ── API Admin — Appuntamenti ──────────────────────────────────────────────────

@app.get("/api/admin/appuntamenti")
def admin_appuntamenti(stato: str = None):
    if stato and stato not in STATI_VALIDI:
        return JSONResponse(status_code=400, content={"errore": "Stato non valido"})
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            query = """
                SELECT a.id, a.stato, a.note, a.creato_il,
                       up.nome AS paziente_nome, up.cognome AS paziente_cognome,
                       um.nome AS medico_nome, um.cognome AS medico_cognome,
                       s.nome AS specialita,
                       d.data, d.ora_inizio, d.ora_fine
                FROM appuntamenti a
                JOIN disponibilita d ON a.disponibilita_id = d.id
                JOIN medici m ON d.medico_id = m.id
                JOIN utenti um ON m.utente_id = um.id
                JOIN specialita s ON m.specialita_id = s.id
                JOIN pazienti p ON a.paziente_id = p.id
                JOIN utenti up ON p.utente_id = up.id
            """
            params = []
            if stato:
                query += " WHERE a.stato = %s"
                params.append(stato)
            query += " ORDER BY d.data DESC, d.ora_inizio DESC"
            cur.execute(query, params)
            rows = cur.fetchall()
    finally:
        conn.close()
    return serializza_righe(rows)

@app.patch("/api/admin/appuntamenti/{appuntamento_id}/cancella")
def admin_cancella_appuntamento(appuntamento_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE appuntamenti SET stato = 'cancellato' WHERE id = %s",
                (appuntamento_id,)
            )
            cur.execute("""
                UPDATE disponibilita d
                JOIN appuntamenti a ON a.disponibilita_id = d.id
                SET d.stato = 'libero'
                WHERE a.id = %s
            """, (appuntamento_id,))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Appuntamento cancellato"}

# ── API Admin — Pazienti ──────────────────────────────────────────────────────

@app.get("/api/admin/pazienti")
def admin_pazienti():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT u.id, u.nome, u.cognome, u.email, p.telefono, p.data_nascita
                FROM pazienti p
                JOIN utenti u ON p.utente_id = u.id
                ORDER BY u.cognome
            """)
            rows = cur.fetchall()
    finally:
        conn.close()
    return serializza_righe(rows)


# ── API Medico ────────────────────────────────────────────────────────────────

def get_medico_id(utente_id: int, cur):
    cur.execute("SELECT id FROM medici WHERE utente_id = %s", (utente_id,))
    row = cur.fetchone()
    return row["id"] if row else None

@app.get("/api/medico/profilo")
def medico_profilo(utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT u.nome, u.cognome, u.email, s.nome AS specialita, m.id AS medico_id, m.durata_slot
                FROM medici m
                JOIN utenti u ON m.utente_id = u.id
                JOIN specialita s ON m.specialita_id = s.id
                WHERE u.id = %s
            """, (utente_id,))
            row = cur.fetchone()
    finally:
        conn.close()
    if not row:
        return JSONResponse(status_code=404, content={"errore": "Medico non trovato"})
    return row

@app.patch("/api/medico/durata-slot")
def medico_aggiorna_durata(dati: DatiDurataSlot, utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE medici SET durata_slot = %s WHERE utente_id = %s", (dati.durata_slot, utente_id))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Durata aggiornata"}

@app.get("/api/medico/appuntamenti")
def medico_appuntamenti(utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            medico_id = get_medico_id(utente_id, cur)
            if not medico_id:
                return JSONResponse(status_code=404, content={"errore": "Medico non trovato"})
            cur.execute("""
                SELECT a.id, a.stato, a.note, a.note_medico,
                       up.nome AS paziente_nome, up.cognome AS paziente_cognome,
                       d.data, d.ora_inizio, d.ora_fine
                FROM appuntamenti a
                JOIN disponibilita d ON a.disponibilita_id = d.id
                JOIN pazienti p ON a.paziente_id = p.id
                JOIN utenti up ON p.utente_id = up.id
                WHERE d.medico_id = %s
                ORDER BY d.data DESC, d.ora_inizio DESC
            """, (medico_id,))
            rows = cur.fetchall()
    finally:
        conn.close()
    return serializza_righe(rows)

@app.get("/api/medico/disponibilita")
def medico_disponibilita(utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            medico_id = get_medico_id(utente_id, cur)
            if not medico_id:
                return JSONResponse(status_code=404, content={"errore": "Medico non trovato"})
            cur.execute("""
                SELECT id, data, ora_inizio, ora_fine, stato
                FROM disponibilita
                WHERE medico_id = %s
                ORDER BY data DESC, ora_inizio
            """, (medico_id,))
            rows = cur.fetchall()
    finally:
        conn.close()
    return serializza_righe(rows)

class DatiDisponibilita(BaseModel):
    utente_id: int
    data: str
    ora_inizio: str
    ora_fine: str

def slot_valido(cur, medico_id, data, ora_inizio):
    """Rifiuta date passate e slot duplicati. Ritorna un messaggio di errore o None."""
    import datetime as dt
    try:
        giorno = dt.date.fromisoformat(data)
    except ValueError:
        return "Data non valida"
    if giorno < dt.date.today():
        return "Non è possibile aggiungere slot nel passato"
    cur.execute(
        "SELECT id FROM disponibilita WHERE medico_id = %s AND data = %s AND ora_inizio = %s",
        (medico_id, data, ora_inizio)
    )
    if cur.fetchone():
        return "Slot già esistente per questo orario"
    return None

@app.post("/api/medico/disponibilita")
def medico_aggiungi_disponibilita(dati: DatiDisponibilita):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            medico_id = get_medico_id(dati.utente_id, cur)
            if not medico_id:
                return JSONResponse(status_code=404, content={"errore": "Medico non trovato"})
            errore = slot_valido(cur, medico_id, dati.data, dati.ora_inizio)
            if errore:
                return JSONResponse(status_code=409, content={"errore": errore})
            cur.execute("""
                INSERT INTO disponibilita (medico_id, data, ora_inizio, ora_fine, stato)
                VALUES (%s, %s, %s, %s, 'libero')
            """, (medico_id, dati.data, dati.ora_inizio, dati.ora_fine))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Disponibilità aggiunta"}

@app.delete("/api/medico/disponibilita/{disponibilita_id}")
def medico_elimina_disponibilita(disponibilita_id: int, utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            medico_id = get_medico_id(utente_id, cur)
            if not medico_id:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            cur.execute(
                "SELECT stato, medico_id FROM disponibilita WHERE id = %s", (disponibilita_id,)
            )
            row = cur.fetchone()
            if not row:
                return JSONResponse(status_code=404, content={"errore": "Slot non trovato"})
            if row["medico_id"] != medico_id:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            if row["stato"] == "prenotato":
                return JSONResponse(status_code=409, content={"errore": "Slot già prenotato, non eliminabile"})
            cur.execute("DELETE FROM disponibilita WHERE id = %s", (disponibilita_id,))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Slot eliminato"}

class DatiStatoAppuntamento(BaseModel):
    stato: str

def appuntamento_del_medico(cur, appuntamento_id, medico_id):
    cur.execute("""
        SELECT a.id FROM appuntamenti a
        JOIN disponibilita d ON a.disponibilita_id = d.id
        WHERE a.id = %s AND d.medico_id = %s
    """, (appuntamento_id, medico_id))
    return cur.fetchone() is not None

@app.patch("/api/medico/appuntamenti/{appuntamento_id}/stato")
def medico_aggiorna_stato(appuntamento_id: int, dati: DatiStatoAppuntamento, utente_id: int):
    if dati.stato not in ("confermato", "cancellato", "completato"):
        return JSONResponse(status_code=400, content={"errore": "Stato non valido"})
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            medico_id = get_medico_id(utente_id, cur)
            if not medico_id or not appuntamento_del_medico(cur, appuntamento_id, medico_id):
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            cur.execute(
                "UPDATE appuntamenti SET stato = %s WHERE id = %s",
                (dati.stato, appuntamento_id)
            )
            if dati.stato == "cancellato":
                cur.execute("""
                    UPDATE disponibilita d
                    JOIN appuntamenti a ON a.disponibilita_id = d.id
                    SET d.stato = 'libero'
                    WHERE a.id = %s
                """, (appuntamento_id,))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Stato aggiornato"}


# ── API Paziente ──────────────────────────────────────────────────────────────

def get_paziente_id(utente_id: int, cur):
    cur.execute("SELECT id FROM pazienti WHERE utente_id = %s", (utente_id,))
    row = cur.fetchone()
    return row["id"] if row else None

@app.get("/api/paziente/profilo")
def paziente_profilo(utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT u.nome, u.cognome, u.email, p.telefono, p.data_nascita, p.consenso_dossier
                FROM pazienti p
                JOIN utenti u ON p.utente_id = u.id
                WHERE u.id = %s
            """, (utente_id,))
            row = cur.fetchone()
    finally:
        conn.close()
    if not row:
        return JSONResponse(status_code=404, content={"errore": "Paziente non trovato"})
    return serializza_righe([row])[0]

# ── API Referti ───────────────────────────────────────────────────────────────

@app.get("/api/referti")
def paziente_lista_referti(utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            paziente_id = get_paziente_id(utente_id, cur)
            if not paziente_id:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            cur.execute("""
                SELECT id, data_referto, titolo
                FROM referti
                WHERE id_paziente = %s
                ORDER BY data_referto DESC
            """, (paziente_id,))
            rows = cur.fetchall()
    finally:
        conn.close()
    return serializza_righe(rows)

@app.get("/api/referti/{referto_id}")
def paziente_dettaglio_referto(referto_id: int, utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            paziente_id = get_paziente_id(utente_id, cur)
            if not paziente_id:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            cur.execute("""
                SELECT id, id_paziente, data_referto, titolo, contenuto_testuale
                FROM referti
                WHERE id = %s
            """, (referto_id,))
            row = cur.fetchone()
            if not row:
                return JSONResponse(status_code=404, content={"errore": "Referto non trovato"})
            if row["id_paziente"] != paziente_id:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
    finally:
        conn.close()
    return serializza_righe([row])[0]

class DatiProfiloPaziente(BaseModel):
    utente_id: int
    telefono: str = ""
    data_nascita: str = ""

@app.put("/api/paziente/profilo")
def paziente_aggiorna_profilo(dati: DatiProfiloPaziente):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            paziente_id = get_paziente_id(dati.utente_id, cur)
            if not paziente_id:
                return JSONResponse(status_code=404, content={"errore": "Paziente non trovato"})
            cur.execute(
                "UPDATE pazienti SET telefono = %s, data_nascita = %s WHERE id = %s",
                (dati.telefono or None, dati.data_nascita or None, paziente_id)
            )
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Profilo aggiornato"}

@app.get("/api/paziente/appuntamenti")
def paziente_appuntamenti(utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            paziente_id = get_paziente_id(utente_id, cur)
            if not paziente_id:
                return JSONResponse(status_code=404, content={"errore": "Paziente non trovato"})
            cur.execute("""
                SELECT a.id, a.stato, a.note, a.creato_il,
                       um.nome AS medico_nome, um.cognome AS medico_cognome,
                       s.nome AS specialita,
                       d.data, d.ora_inizio, d.ora_fine
                FROM appuntamenti a
                JOIN disponibilita d ON a.disponibilita_id = d.id
                JOIN medici m ON d.medico_id = m.id
                JOIN utenti um ON m.utente_id = um.id
                JOIN specialita s ON m.specialita_id = s.id
                WHERE a.paziente_id = %s
                ORDER BY d.data DESC, d.ora_inizio DESC
            """, (paziente_id,))
            rows = cur.fetchall()
    finally:
        conn.close()
    return serializza_righe(rows)

@app.patch("/api/paziente/appuntamenti/{appuntamento_id}/cancella")
def paziente_cancella_appuntamento(appuntamento_id: int, utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            paziente_id = get_paziente_id(utente_id, cur)
            if not paziente_id:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            cur.execute(
                "SELECT stato, paziente_id FROM appuntamenti WHERE id = %s", (appuntamento_id,)
            )
            row = cur.fetchone()
            if not row:
                return JSONResponse(status_code=404, content={"errore": "Appuntamento non trovato"})
            if row["paziente_id"] != paziente_id:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            if row["stato"] == "cancellato":
                return JSONResponse(status_code=409, content={"errore": "Già cancellato"})
            cur.execute(
                "UPDATE appuntamenti SET stato = 'cancellato' WHERE id = %s",
                (appuntamento_id,)
            )
            cur.execute("""
                UPDATE disponibilita d
                JOIN appuntamenti a ON a.disponibilita_id = d.id
                SET d.stato = 'libero'
                WHERE a.id = %s
            """, (appuntamento_id,))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Appuntamento cancellato"}

# ── API Dossier Sanitario Condiviso ──────────────────────────────────────────

class DatiConsenso(BaseModel):
    utente_id: int
    consenso: bool

@app.put("/api/paziente/consenso")
def paziente_aggiorna_consenso(dati: DatiConsenso):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            paziente_id = get_paziente_id(dati.utente_id, cur)
            if not paziente_id:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            cur.execute(
                "UPDATE pazienti SET consenso_dossier = %s WHERE id = %s",
                (1 if dati.consenso else 0, paziente_id)
            )
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Consenso aggiornato", "consenso": dati.consenso}

@app.get("/api/medico/pazienti_prenotati")
def medico_pazienti_prenotati(utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            medico_id = get_medico_id(utente_id, cur)
            if not medico_id:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            cur.execute("""
                SELECT DISTINCT p.id, u.nome, u.cognome, p.consenso_dossier
                FROM appuntamenti a
                JOIN disponibilita d ON a.disponibilita_id = d.id
                JOIN pazienti p ON a.paziente_id = p.id
                JOIN utenti u ON p.utente_id = u.id
                WHERE d.medico_id = %s AND a.stato = 'confermato'
                ORDER BY u.cognome, u.nome
            """, (medico_id,))
            rows = cur.fetchall()
    finally:
        conn.close()
    return rows

@app.get("/api/medico/referti_paziente/{paziente_id}")
def medico_referti_paziente(paziente_id: int, utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            medico_id = get_medico_id(utente_id, cur)
            if not medico_id:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})

            cur.execute("SELECT consenso_dossier FROM pazienti WHERE id = %s", (paziente_id,))
            paziente = cur.fetchone()
            if not paziente:
                return JSONResponse(status_code=404, content={"errore": "Paziente non trovato"})

            if paziente["consenso_dossier"]:
                # Consenso prestato: dossier completo (referti di qualsiasi medico)
                cur.execute("""
                    SELECT r.id, r.data_referto, r.titolo, r.contenuto_testuale,
                           u.nome AS medico_nome, u.cognome AS medico_cognome
                    FROM referti r
                    LEFT JOIN medici m ON r.medico_id = m.id
                    LEFT JOIN utenti u ON m.utente_id = u.id
                    WHERE r.id_paziente = %s
                    ORDER BY r.data_referto DESC
                """, (paziente_id,))
                rows = cur.fetchall()
            else:
                # Minimizzazione GDPR: solo i referti di cui il medico è autore
                cur.execute("""
                    SELECT r.id, r.data_referto, r.titolo, r.contenuto_testuale,
                           u.nome AS medico_nome, u.cognome AS medico_cognome
                    FROM referti r
                    JOIN medici m ON r.medico_id = m.id
                    JOIN utenti u ON m.utente_id = u.id
                    WHERE r.id_paziente = %s AND r.medico_id = %s
                    ORDER BY r.data_referto DESC
                """, (paziente_id, medico_id))
                rows = cur.fetchall()
                if not rows:
                    return JSONResponse(status_code=403, content={
                        "errore": "Il paziente non ha prestato il consenso per la visualizzazione dei referti pregressi"
                    })
    finally:
        conn.close()
    return serializza_righe(rows)

# ── API Prenotazione (pubblica) ───────────────────────────────────────────────

@app.get("/api/prenotazione/specialita")
def prenotazione_specialita():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT s.id, s.nome
                FROM specialita s
                JOIN medici m ON m.specialita_id = s.id
                JOIN disponibilita d ON d.medico_id = m.id
                WHERE d.stato = 'libero' AND d.data >= CURDATE()
                ORDER BY s.nome
            """)
            rows = cur.fetchall()
    finally:
        conn.close()
    return rows

@app.get("/api/prenotazione/medici")
def prenotazione_medici(specialita_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT m.id, u.nome, u.cognome
                FROM medici m
                JOIN utenti u ON m.utente_id = u.id
                JOIN disponibilita d ON d.medico_id = m.id
                WHERE m.specialita_id = %s AND d.stato = 'libero' AND d.data >= CURDATE()
                ORDER BY u.cognome
            """, (specialita_id,))
            rows = cur.fetchall()
    finally:
        conn.close()
    return rows

@app.get("/api/prenotazione/slot")
def prenotazione_slot(medico_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, data, ora_inizio, ora_fine
                FROM disponibilita
                WHERE medico_id = %s AND stato = 'libero' AND data >= CURDATE()
                ORDER BY data, ora_inizio
            """, (medico_id,))
            rows = cur.fetchall()
    finally:
        conn.close()
    return serializza_righe(rows)

class DatiPrenotazione(BaseModel):
    utente_id: int
    disponibilita_id: int
    note: str = ""

@app.post("/api/prenotazione")
def crea_prenotazione(dati: DatiPrenotazione):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            paziente_id = get_paziente_id(dati.utente_id, cur)
            if not paziente_id:
                return JSONResponse(status_code=404, content={"errore": "Paziente non trovato"})
            cur.execute(
                "SELECT stato FROM disponibilita WHERE id = %s", (dati.disponibilita_id,)
            )
            slot = cur.fetchone()
            if not slot or slot["stato"] != "libero":
                return JSONResponse(status_code=409, content={"errore": "Slot non disponibile"})
            cur.execute("""
                INSERT INTO appuntamenti (paziente_id, disponibilita_id, stato, note)
                VALUES (%s, %s, 'in_attesa', %s)
            """, (paziente_id, dati.disponibilita_id, dati.note or None))
            cur.execute(
                "UPDATE disponibilita SET stato = 'prenotato' WHERE id = %s",
                (dati.disponibilita_id,)
            )
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Prenotazione effettuata"}


# ── API Segreteria ────────────────────────────────────────────────────────────

@app.get("/api/segreteria/oggi")
def segreteria_oggi():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT a.id, a.stato, a.richiesta_checkin, a.checkin_confermato, a.checkin_scadenza,
                       up.nome AS paziente_nome, up.cognome AS paziente_cognome,
                       um.nome AS medico_nome, um.cognome AS medico_cognome,
                       s.nome AS specialita, d.ora_inizio, d.ora_fine
                FROM appuntamenti a
                JOIN disponibilita d ON a.disponibilita_id = d.id
                JOIN medici m ON d.medico_id = m.id
                JOIN utenti um ON m.utente_id = um.id
                JOIN specialita s ON m.specialita_id = s.id
                JOIN pazienti p ON a.paziente_id = p.id
                JOIN utenti up ON p.utente_id = up.id
                WHERE d.data = CURDATE() AND a.stato != 'cancellato'
                ORDER BY d.ora_inizio
            """)
            rows = cur.fetchall()
    finally:
        conn.close()
    return serializza_righe(rows)

@app.get("/api/segreteria/appuntamenti")
def segreteria_appuntamenti(stato: str = None, medico_id: int = None, data: str = None, specialita_id: int = None):
    if stato and stato not in STATI_VALIDI:
        return JSONResponse(status_code=400, content={"errore": "Stato non valido"})
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            query = """
                SELECT a.id, a.stato, a.note, a.creato_il,
                       a.richiesta_checkin, a.checkin_confermato, a.checkin_scadenza,
                       up.nome AS paziente_nome, up.cognome AS paziente_cognome,
                       um.nome AS medico_nome, um.cognome AS medico_cognome,
                       m.id AS medico_id, s.nome AS specialita, s.id AS specialita_id,
                       d.data, d.ora_inizio, d.ora_fine
                FROM appuntamenti a
                JOIN disponibilita d ON a.disponibilita_id = d.id
                JOIN medici m ON d.medico_id = m.id
                JOIN utenti um ON m.utente_id = um.id
                JOIN specialita s ON m.specialita_id = s.id
                JOIN pazienti p ON a.paziente_id = p.id
                JOIN utenti up ON p.utente_id = up.id
                WHERE 1=1
            """
            params = []
            if stato:
                query += " AND a.stato = %s"; params.append(stato)
            if medico_id:
                query += " AND m.id = %s"; params.append(medico_id)
            if data:
                query += " AND d.data = %s"; params.append(data)
            if specialita_id:
                query += " AND s.id = %s"; params.append(specialita_id)
            query += " ORDER BY d.data DESC, d.ora_inizio DESC"
            cur.execute(query, params)
            rows = cur.fetchall()
    finally:
        conn.close()
    return serializza_righe(rows)

class DatiStatoSegreteria(BaseModel):
    stato: str

@app.patch("/api/segreteria/appuntamenti/{appuntamento_id}/stato")
def segreteria_aggiorna_stato(appuntamento_id: int, dati: DatiStatoSegreteria):
    if dati.stato not in ("confermato", "cancellato", "completato"):
        return JSONResponse(status_code=400, content={"errore": "Stato non valido"})
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE appuntamenti SET stato = %s WHERE id = %s", (dati.stato, appuntamento_id))
            if dati.stato == "cancellato":
                cur.execute("""
                    UPDATE disponibilita d JOIN appuntamenti a ON a.disponibilita_id = d.id
                    SET d.stato = 'libero' WHERE a.id = %s
                """, (appuntamento_id,))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Stato aggiornato"}

class DatiPrenotazioneManuale(BaseModel):
    paziente_utente_id: int
    disponibilita_id: int
    note: str = ""

@app.post("/api/segreteria/appuntamento")
def segreteria_crea_appuntamento(dati: DatiPrenotazioneManuale):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            paziente_id = get_paziente_id(dati.paziente_utente_id, cur)
            if not paziente_id:
                return JSONResponse(status_code=404, content={"errore": "Paziente non trovato"})
            cur.execute("SELECT stato FROM disponibilita WHERE id = %s", (dati.disponibilita_id,))
            slot = cur.fetchone()
            if not slot or slot["stato"] != "libero":
                return JSONResponse(status_code=409, content={"errore": "Slot non disponibile"})
            cur.execute("""
                INSERT INTO appuntamenti (paziente_id, disponibilita_id, stato, note)
                VALUES (%s, %s, 'confermato', %s)
            """, (paziente_id, dati.disponibilita_id, dati.note or None))
            cur.execute("UPDATE disponibilita SET stato = 'prenotato' WHERE id = %s", (dati.disponibilita_id,))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Appuntamento creato"}

@app.get("/api/segreteria/pazienti")
def segreteria_cerca_pazienti(q: str = ""):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            like = f"%{q}%"
            cur.execute("""
                SELECT u.id, u.nome, u.cognome, u.email, p.telefono, p.data_nascita
                FROM pazienti p JOIN utenti u ON p.utente_id = u.id
                WHERE u.nome LIKE %s OR u.cognome LIKE %s OR u.email LIKE %s
                ORDER BY u.cognome LIMIT 20
            """, (like, like, like))
            rows = cur.fetchall()
    finally:
        conn.close()
    return serializza_righe(rows)

@app.get("/api/segreteria/medici")
def segreteria_medici():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT m.id, u.nome, u.cognome, s.nome AS specialita, s.id AS specialita_id, m.durata_slot
                FROM medici m JOIN utenti u ON m.utente_id = u.id
                JOIN specialita s ON m.specialita_id = s.id
                ORDER BY u.cognome
            """)
            rows = cur.fetchall()
    finally:
        conn.close()
    return rows

class DatiSlotSegreteria(BaseModel):
    medico_id: int
    data: str
    ora_inizio: str
    ora_fine: str

@app.post("/api/segreteria/disponibilita")
def segreteria_aggiungi_slot(dati: DatiSlotSegreteria):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            errore = slot_valido(cur, dati.medico_id, dati.data, dati.ora_inizio)
            if errore:
                return JSONResponse(status_code=409, content={"errore": errore})
            cur.execute("""
                INSERT INTO disponibilita (medico_id, data, ora_inizio, ora_fine, stato)
                VALUES (%s, %s, %s, %s, 'libero')
            """, (dati.medico_id, dati.data, dati.ora_inizio, dati.ora_fine))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Slot aggiunto"}

@app.delete("/api/segreteria/disponibilita/{disponibilita_id}")
def segreteria_elimina_slot(disponibilita_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT stato FROM disponibilita WHERE id = %s", (disponibilita_id,))
            row = cur.fetchone()
            if not row:
                return JSONResponse(status_code=404, content={"errore": "Slot non trovato"})
            if row["stato"] == "prenotato":
                return JSONResponse(status_code=409, content={"errore": "Slot già prenotato, non eliminabile"})
            cur.execute("DELETE FROM disponibilita WHERE id = %s", (disponibilita_id,))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Slot eliminato"}

@app.get("/api/segreteria/disponibilita")
def segreteria_lista_slot(medico_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT d.id, d.data, d.ora_inizio, d.ora_fine,
                       (SELECT COUNT(*) FROM appuntamenti a WHERE a.disponibilita_id = d.id AND a.stato != 'cancellato') AS prenotato
                FROM disponibilita d
                WHERE d.medico_id = %s
                ORDER BY d.data, d.ora_inizio
            """, (medico_id,))
            rows = cur.fetchall()
    finally:
        conn.close()
    return serializza_righe(rows)

class DatiCheckin(BaseModel):
    ore_anticipo: int = 24

    @field_validator("ore_anticipo")
    @classmethod
    def ore_valide(cls, v):
        if v < 1 or v > 168:
            raise ValueError("Ore anticipo deve essere tra 1 e 168")
        return v

@app.post("/api/segreteria/appuntamenti/{appuntamento_id}/richiedi-checkin")
def segreteria_richiedi_checkin(appuntamento_id: int, dati: DatiCheckin):
    import datetime
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT d.data, d.ora_inizio FROM appuntamenti a
                JOIN disponibilita d ON a.disponibilita_id = d.id
                WHERE a.id = %s
            """, (appuntamento_id,))
            row = cur.fetchone()
            if not row:
                return JSONResponse(status_code=404, content={"errore": "Appuntamento non trovato"})
            import datetime as dt
            ora_str = str(row["ora_inizio"])
            if ":" in ora_str:
                h, m = int(ora_str.split(":")[0]), int(ora_str.split(":")[1])
            else:
                h, m = 0, 0
            appuntamento_dt = dt.datetime.combine(row["data"], dt.time(h, m))
            scadenza = appuntamento_dt - dt.timedelta(hours=dati.ore_anticipo)
            cur.execute("""
                UPDATE appuntamenti SET richiesta_checkin = 1, checkin_scadenza = %s
                WHERE id = %s
            """, (scadenza, appuntamento_id))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Richiesta check-in inviata", "scadenza": scadenza.isoformat()}

# ── API Check-in paziente ─────────────────────────────────────────────────────

@app.get("/api/paziente/notifiche")
def paziente_notifiche(utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            paziente_id = get_paziente_id(utente_id, cur)
            if not paziente_id:
                return []
            cur.execute("""
                SELECT a.id, a.checkin_scadenza, a.checkin_confermato,
                       um.nome AS medico_nome, um.cognome AS medico_cognome,
                       s.nome AS specialita, d.data, d.ora_inizio, d.ora_fine
                FROM appuntamenti a
                JOIN disponibilita d ON a.disponibilita_id = d.id
                JOIN medici m ON d.medico_id = m.id
                JOIN utenti um ON m.utente_id = um.id
                JOIN specialita s ON m.specialita_id = s.id
                WHERE a.paziente_id = %s AND a.richiesta_checkin = 1
                  AND a.checkin_confermato = 0 AND a.stato != 'cancellato'
                  AND d.data >= CURDATE()
                ORDER BY d.data, d.ora_inizio
            """, (paziente_id,))
            rows = cur.fetchall()
    finally:
        conn.close()
    return serializza_righe(rows)

@app.post("/api/paziente/checkin/{appuntamento_id}")
def paziente_confirma_checkin(appuntamento_id: int, utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            paziente_id = get_paziente_id(utente_id, cur)
            if not paziente_id:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            cur.execute(
                "SELECT paziente_id FROM appuntamenti WHERE id = %s AND richiesta_checkin = 1",
                (appuntamento_id,)
            )
            row = cur.fetchone()
            if not row:
                return JSONResponse(status_code=404, content={"errore": "Check-in non trovato"})
            if row["paziente_id"] != paziente_id:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            cur.execute(
                "UPDATE appuntamenti SET checkin_confermato = 1 WHERE id = %s",
                (appuntamento_id,)
            )
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Presenza confermata"}


class DatiNoteAppuntamento(BaseModel):
    note_medico: str

@app.patch("/api/medico/appuntamenti/{appuntamento_id}/note")
def medico_salva_note(appuntamento_id: int, dati: DatiNoteAppuntamento, utente_id: int):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            medico_id = get_medico_id(utente_id, cur)
            if not medico_id or not appuntamento_del_medico(cur, appuntamento_id, medico_id):
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            cur.execute(
                "UPDATE appuntamenti SET note_medico = %s WHERE id = %s",
                (dati.note_medico, appuntamento_id)
            )
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Note salvate"}

# ── API Medico — Referti ──────────────────────────────────────────────────────

class DatiNuovoReferto(BaseModel):
    utente_id: int
    appuntamento_id: int
    titolo: str
    contenuto_testuale: str

    @field_validator("titolo")
    @classmethod
    def titolo_valido(cls, v):
        v = v.strip()
        if not v or len(v) > 200:
            raise ValueError("Titolo obbligatorio (max 200 caratteri)")
        return v

    @field_validator("contenuto_testuale")
    @classmethod
    def contenuto_valido(cls, v):
        if not v.strip():
            raise ValueError("Contenuto obbligatorio")
        return v.strip()

@app.post("/api/medico/referti")
def medico_crea_referto(dati: DatiNuovoReferto):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            medico_id = get_medico_id(dati.utente_id, cur)
            if not medico_id:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            cur.execute("""
                SELECT a.paziente_id, a.stato FROM appuntamenti a
                JOIN disponibilita d ON a.disponibilita_id = d.id
                WHERE a.id = %s AND d.medico_id = %s
            """, (dati.appuntamento_id, medico_id))
            row = cur.fetchone()
            if not row:
                return JSONResponse(status_code=403, content={"errore": "Non autorizzato"})
            if row["stato"] != "completato":
                return JSONResponse(status_code=409, content={"errore": "Il referto si può scrivere solo per visite completate"})
            cur.execute("""
                INSERT INTO referti (id_paziente, medico_id, data_referto, titolo, contenuto_testuale)
                VALUES (%s, %s, CURDATE(), %s, %s)
            """, (row["paziente_id"], medico_id, dati.titolo, dati.contenuto_testuale))
        conn.commit()
    finally:
        conn.close()
    return {"messaggio": "Referto salvato"}

from fastapi.responses import HTMLResponse

@app.exception_handler(404)
async def not_found(request, exc):
    return HTMLResponse("""<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
    <title>Pagina non trovata</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f7f5ef;}
    .box{text-align:center;}.titolo{font-size:72px;font-weight:700;color:#1c2b45;margin:0;}
    .msg{font-size:18px;color:#9a8a6f;margin:12px 0 24px;}
    a{background:#1c2b45;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:15px;}</style>
    </head><body><div class="box"><div class="titolo">404</div>
    <div class="msg">Pagina non trovata</div>
    <a href="/">Torna alla home</a></div></body></html>""", status_code=404)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
