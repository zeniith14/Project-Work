-- ============================================================================
-- Vita Serena — Schema del database
-- Project Work PW 16 — Informatica per le Aziende Digitali (L-31)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS vitaserena CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vitaserena;

-- ── Tabella: utenti ──────────────────────────────────────────────────────────
-- Anagrafica comune a tutti i ruoli (admin, medico, segretaria, paziente)

CREATE TABLE `utenti` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `cognome` varchar(100) NOT NULL,
  `ruolo` enum('paziente','medico','segretaria','admin') NOT NULL DEFAULT 'paziente',
  `creato_il` timestamp NOT NULL DEFAULT current_timestamp(),
  `primo_accesso` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabella: specialita ──────────────────────────────────────────────────────
-- Catalogo delle specializzazioni mediche disponibili

CREATE TABLE `specialita` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `descrizione` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabella: pazienti ─────────────────────────────────────────────────────────
-- Dati estesi dei pazienti, collegati a utenti (relazione 1:1)
-- consenso_dossier: flag GDPR per il Dossier Sanitario Condiviso

CREATE TABLE `pazienti` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `utente_id` int(11) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `data_nascita` date DEFAULT NULL,
  `consenso_dossier` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `utente_id` (`utente_id`),
  CONSTRAINT `pazienti_ibfk_1` FOREIGN KEY (`utente_id`) REFERENCES `utenti` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabella: medici ───────────────────────────────────────────────────────────
-- Dati dei medici, collegati a utenti (relazione 1:1) e a specialita (relazione N:1)
-- durata_slot: durata configurabile della visita in minuti (15/20/30/45/60/90)

CREATE TABLE `medici` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `utente_id` int(11) NOT NULL,
  `specialita_id` int(11) NOT NULL,
  `durata_slot` int(11) NOT NULL DEFAULT 60,
  PRIMARY KEY (`id`),
  UNIQUE KEY `utente_id` (`utente_id`),
  KEY `specialita_id` (`specialita_id`),
  CONSTRAINT `medici_ibfk_1` FOREIGN KEY (`utente_id`) REFERENCES `utenti` (`id`) ON DELETE CASCADE,
  CONSTRAINT `medici_ibfk_2` FOREIGN KEY (`specialita_id`) REFERENCES `specialita` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabella: disponibilita ────────────────────────────────────────────────────
-- Slot orari resi disponibili dai medici

CREATE TABLE `disponibilita` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `medico_id` int(11) NOT NULL,
  `data` date NOT NULL,
  `ora_inizio` time NOT NULL,
  `ora_fine` time NOT NULL,
  `stato` enum('libero','prenotato') NOT NULL DEFAULT 'libero',
  PRIMARY KEY (`id`),
  KEY `medico_id` (`medico_id`),
  CONSTRAINT `disponibilita_ibfk_1` FOREIGN KEY (`medico_id`) REFERENCES `medici` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabella: appuntamenti ─────────────────────────────────────────────────────
-- Prenotazioni effettive: ciclo di vita in_attesa -> confermato -> completato (o cancellato)

CREATE TABLE `appuntamenti` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `paziente_id` int(11) NOT NULL,
  `disponibilita_id` int(11) NOT NULL,
  `stato` enum('in_attesa','confermato','cancellato','completato') NOT NULL DEFAULT 'in_attesa',
  `confermato_da` int(11) DEFAULT NULL,
  `note` varchar(255) DEFAULT NULL,
  `creato_il` timestamp NOT NULL DEFAULT current_timestamp(),
  `richiesta_checkin` tinyint(1) DEFAULT 0,
  `checkin_confermato` tinyint(1) DEFAULT 0,
  `checkin_scadenza` datetime DEFAULT NULL,
  `note_medico` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `disponibilita_id` (`disponibilita_id`),
  KEY `paziente_id` (`paziente_id`),
  KEY `confermato_da` (`confermato_da`),
  CONSTRAINT `appuntamenti_ibfk_1` FOREIGN KEY (`paziente_id`) REFERENCES `pazienti` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appuntamenti_ibfk_2` FOREIGN KEY (`disponibilita_id`) REFERENCES `disponibilita` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appuntamenti_ibfk_3` FOREIGN KEY (`confermato_da`) REFERENCES `utenti` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabella: referti ──────────────────────────────────────────────────────────
-- Referti medici redatti a visita completata
-- medico_id: autore del referto, usato per la logica del Dossier Sanitario Condiviso

CREATE TABLE `referti` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_paziente` int(11) NOT NULL,
  `data_referto` date NOT NULL,
  `titolo` varchar(200) NOT NULL,
  `contenuto_testuale` text NOT NULL,
  `medico_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_paziente` (`id_paziente`),
  KEY `fk_referti_medico` (`medico_id`),
  CONSTRAINT `fk_referti_medico` FOREIGN KEY (`medico_id`) REFERENCES `medici` (`id`) ON DELETE SET NULL,
  CONSTRAINT `referti_ibfk_1` FOREIGN KEY (`id_paziente`) REFERENCES `pazienti` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- Dati di esempio (seed) — dati fittizi per demo, nessun dato personale reale
-- Password di tutti gli utenti di esempio: "Password123" (hash bcrypt)
-- ============================================================================

INSERT INTO `utenti` (`email`, `password`, `nome`, `cognome`, `ruolo`, `primo_accesso`) VALUES
('admin@vitaserena.it', '$2b$12$wJUMfGB6PKbDRJ6SrnKwW.SjfZvi.xzlOLG5HGfPpPrBQ6T97DNoq', 'Amministratore', 'Sistema', 'admin', 0),
('mario.rossi@vitaserena.it', '$2b$12$wJUMfGB6PKbDRJ6SrnKwW.SjfZvi.xzlOLG5HGfPpPrBQ6T97DNoq', 'Mario', 'Rossi', 'medico', 0),
('anna.bianchi@vitaserena.it', '$2b$12$wJUMfGB6PKbDRJ6SrnKwW.SjfZvi.xzlOLG5HGfPpPrBQ6T97DNoq', 'Anna', 'Bianchi', 'segretaria', 0),
('luca.verdi@esempio.it', '$2b$12$wJUMfGB6PKbDRJ6SrnKwW.SjfZvi.xzlOLG5HGfPpPrBQ6T97DNoq', 'Luca', 'Verdi', 'paziente', 0);

INSERT INTO `specialita` (`nome`, `descrizione`) VALUES
('Medicina Generale', 'Visite generali e medicina di base'),
('Cardiologia', 'Visite ed esami cardiologici');

INSERT INTO `pazienti` (`utente_id`, `telefono`, `data_nascita`, `consenso_dossier`) VALUES
(4, '3331234567', '1995-03-20', 0);

INSERT INTO `medici` (`utente_id`, `specialita_id`, `durata_slot`) VALUES
(2, 1, 60);

INSERT INTO `disponibilita` (`medico_id`, `data`, `ora_inizio`, `ora_fine`, `stato`) VALUES
(1, CURDATE() + INTERVAL 1 DAY, '09:00:00', '10:00:00', 'libero'),
(1, CURDATE() + INTERVAL 1 DAY, '10:00:00', '11:00:00', 'libero');
