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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;insert into `appuntamenti` (`checkin_confermato`, `checkin_scadenza`, `confermato_da`, `creato_il`, `disponibilita_id`, `id`, `note`, `note_medico`, `paziente_id`, `richiesta_checkin`, `stato`) values (1, '2026-06-30 15:00:00', NULL, '2026-07-01 02:50:32', 9, 1, NULL, NULL, 3, 1, 'completato');
insert into `appuntamenti` (`checkin_confermato`, `checkin_scadenza`, `confermato_da`, `creato_il`, `disponibilita_id`, `id`, `note`, `note_medico`, `paziente_id`, `richiesta_checkin`, `stato`) values (0, '2026-07-01 08:00:00', NULL, '2026-07-02 23:34:56', 1, 2, NULL, NULL, 3, 1, 'completato');
insert into `appuntamenti` (`checkin_confermato`, `checkin_scadenza`, `confermato_da`, `creato_il`, `disponibilita_id`, `id`, `note`, `note_medico`, `paziente_id`, `richiesta_checkin`, `stato`) values (0, NULL, NULL, '2026-07-05 03:21:56', 27, 3, NULL, 'boh', 3, 0, 'confermato');
insert into `appuntamenti` (`checkin_confermato`, `checkin_scadenza`, `confermato_da`, `creato_il`, `disponibilita_id`, `id`, `note`, `note_medico`, `paziente_id`, `richiesta_checkin`, `stato`) values (0, '2026-07-06 08:00:00', NULL, '2026-07-07 04:16:58', 34, 4, NULL, NULL, 5, 1, 'confermato');
insert into `appuntamenti` (`checkin_confermato`, `checkin_scadenza`, `confermato_da`, `creato_il`, `disponibilita_id`, `id`, `note`, `note_medico`, `paziente_id`, `richiesta_checkin`, `stato`) values (0, NULL, NULL, '2026-07-07 04:37:49', 38, 5, NULL, NULL, 5, 0, 'cancellato');
insert into `appuntamenti` (`checkin_confermato`, `checkin_scadenza`, `confermato_da`, `creato_il`, `disponibilita_id`, `id`, `note`, `note_medico`, `paziente_id`, `richiesta_checkin`, `stato`) values (0, NULL, NULL, '2026-07-07 04:38:32', 48, 6, NULL, NULL, 5, 0, 'completato');
insert into `appuntamenti` (`checkin_confermato`, `checkin_scadenza`, `confermato_da`, `creato_il`, `disponibilita_id`, `id`, `note`, `note_medico`, `paziente_id`, `richiesta_checkin`, `stato`) values (0, NULL, NULL, '2026-07-07 04:40:04', 53, 7, NULL, NULL, 5, 0, 'in_attesa');
