# Vita Serena - Piattaforma digitale per la gestione delle prenotazioni di un poliambulatorio

Project Work - Corso di Laurea in Informatica per le Aziende Digitali (L-31), Università Telematica Pegaso.
Traccia PW 16: sviluppo di un'applicazione full-stack API-based per un'organizzazione del settore sanitario.

## Descrizione

Vita Serena è un sistema web full-stack per la gestione delle prenotazioni di un poliambulatorio privato multidisciplinare. L'applicazione gestisce quattro ruoli distinti (Amministratore, Medico, Segreteria, Paziente), ciascuno con una propria dashboard dedicata, e copre l'intero ciclo di vita di una visita medica: dalla prenotazione online, alla conferma da parte del personale sanitario, fino alla redazione del referto clinico.

## Funzionalità principali

- Autenticazione con hashing bcrypt e primo accesso con password monouso
- Wizard di prenotazione a 4 step (specialità, medico, slot, conferma)
- Calendario disponibilità mediche con durata slot configurabile per medico
- Ciclo di vita appuntamento: in attesa, confermato, completato, cancellato
- Sistema di check-in in-app con scadenza configurabile
- Gestione referti medici con protezione anti-IDOR
- Dossier Sanitario Condiviso con consenso GDPR esplicito e revocabile
- Compliance GDPR: informativa privacy, cookie banner, minimizzazione dei dati
- Security headers HTTP (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- Documentazione API automatica (OpenAPI/Swagger) su `/docs`

## Stack tecnologico

- **Backend:** Python 3, FastAPI, Pydantic
- **Database:** MySQL, interrogato tramite PyMySQL
- **Frontend:** HTML5, CSS3, JavaScript Vanilla (nessun framework)
- **Sicurezza:** bcrypt per l'hashing delle password

## Struttura del progetto

```
Project-Work/
├── main.py                  # Backend FastAPI (tutti gli endpoint API)
├── requirements.txt          # Dipendenze Python
├── schema.sql                 # Schema del database MySQL
├── templates/                 # Pagine HTML
│   ├── index.html              # Login e registrazione
│   ├── dashboard-admin.html
│   ├── dashboard-medico.html
│   ├── dashboard-paziente.html
│   ├── dashboard-segreteria.html
│   ├── cambia-password.html
│   └── privacy.html            # Informativa privacy GDPR
└── static/
    ├── css/                    # Fogli di stile per ciascuna dashboard
    └── js/                     # Logica frontend per ciascuna dashboard
```

## Requisiti

- Python 3.10 o superiore
- MySQL (ad esempio tramite XAMPP)

## Installazione

1. Clona il repository:
   ```
   git clone https://github.com/zeniith14/Project-Work.git
   cd Project-Work
   ```

2. Crea un ambiente virtuale e installa le dipendenze:
   ```
   python -m venv venv
   venv\Scripts\activate        # Windows
   pip install -r requirements.txt
   ```

3. Avvia MySQL (ad esempio tramite XAMPP) e crea il database:
   ```
   mysql -u root -p < schema.sql
   ```

   Lo script crea il database `vitaserena`, tutte le tabelle necessarie e un utente amministratore di default.

4. Verifica in `main.py` i parametri di connessione al database nella funzione `get_connection()` (host, utente, password), adattandoli al proprio ambiente locale se necessario.

## Avvio dell'applicazione

```
python main.py
```

Il server si avvia all'indirizzo `http://localhost:8000`.

- Applicazione: `http://localhost:8000`
- Documentazione API interattiva (Swagger UI): `http://localhost:8000/docs`

## Credenziali di accesso predefinite

| Ruolo | Email | Password |
|---|---|---|
| Amministratore | admin@vitaserena.it | (impostata in fase di creazione del database) |

Gli account di medico e segreteria vengono creati dall'amministratore dalla propria dashboard: il sistema genera automaticamente una password temporanea da comunicare all'utente, che sarà obbligato a modificarla al primo accesso. I pazienti si registrano autonomamente dalla pagina di login.

## Sicurezza

Il progetto ha superato un audit di sicurezza interno che ha portato all'introduzione di:

- Controlli di autorizzazione (ownership check) su tutti gli endpoint sensibili, a prevenzione di vulnerabilità IDOR
- Sanitizzazione dell'output tramite funzione `escapeHtml()` a prevenzione di attacchi XSS
- Validazione rigorosa dei dati in ingresso tramite modelli Pydantic
- Middleware per l'iniezione di security header HTTP
- Configurazione CORS restrittiva

## Compliance GDPR

Trattandosi di un'applicazione che gestisce dati sanitari (categoria particolare ai sensi dell'art. 9 GDPR), il sistema implementa:

- Informativa privacy completa (`/privacy`)
- Cookie banner con consenso registrato
- Dossier Sanitario Condiviso basato sul principio di minimizzazione dei dati (art. 5 GDPR): in assenza di consenso esplicito del paziente, ciascun medico può consultare solo i referti di cui è autore

## Autore

Giuseppe Carbone - Corso di Laurea in Informatica per le Aziende Digitali (L-31), Università Telematica Pegaso
