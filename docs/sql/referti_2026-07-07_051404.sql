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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;insert into `referti` (`contenuto_testuale`, `data_referto`, `id`, `id_paziente`, `medico_id`, `titolo`) values ('Paziente in buone condizioni generali. Pressione arteriosa 120/80 mmHg, frequenza cardiaca 68 bpm. Auscultazione toracica nella norma. Si consiglia controllo annuale e attivita fisica regolare.', '2026-06-15', 1, 1, NULL, 'Referto visita di Medicina Generale');
insert into `referti` (`contenuto_testuale`, `data_referto`, `id`, `id_paziente`, `medico_id`, `titolo`) values ('Emocromo completo nella norma. Glicemia a digiuno: 88 mg/dl. Colesterolo totale: 185 mg/dl (HDL 55, LDL 110). Trigliceridi: 100 mg/dl. Funzionalita epatica e renale nei limiti. Nessuna alterazione significativa.', '2026-05-02', 2, 1, NULL, 'Esami ematochimici di routine');
insert into `referti` (`contenuto_testuale`, `data_referto`, `id`, `id_paziente`, `medico_id`, `titolo`) values ('Testo del referto qui...', '2026-07-03', 3, 1, NULL, 'Referto visita cardiologica');
insert into `referti` (`contenuto_testuale`, `data_referto`, `id`, `id_paziente`, `medico_id`, `titolo`) values ('Diagnosi perfetta', '2026-07-05', 4, 3, NULL, 'Referto visita medica');
insert into `referti` (`contenuto_testuale`, `data_referto`, `id`, `id_paziente`, `medico_id`, `titolo`) values ('Esito della visita ottimale', '2026-07-07', 5, 5, 4, 'Referto Cardiologia');
