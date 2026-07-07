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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;insert into `medici` (`durata_slot`, `id`, `specialita_id`, `utente_id`) values (60, 1, 1, 4);
insert into `medici` (`durata_slot`, `id`, `specialita_id`, `utente_id`) values (90, 2, 1, 7);
insert into `medici` (`durata_slot`, `id`, `specialita_id`, `utente_id`) values (60, 4, 2, 12);
