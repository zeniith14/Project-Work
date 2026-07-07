CREATE TABLE `pazienti` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `utente_id` int(11) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `data_nascita` date DEFAULT NULL,
  `consenso_dossier` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `utente_id` (`utente_id`),
  CONSTRAINT `pazienti_ibfk_1` FOREIGN KEY (`utente_id`) REFERENCES `utenti` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;insert into `pazienti` (`consenso_dossier`, `data_nascita`, `id`, `telefono`, `utente_id`) values (0, '2004-12-05', 1, '3518142713', 2);
insert into `pazienti` (`consenso_dossier`, `data_nascita`, `id`, `telefono`, `utente_id`) values (0, '2004-12-05', 2, '3518142713', 3);
insert into `pazienti` (`consenso_dossier`, `data_nascita`, `id`, `telefono`, `utente_id`) values (1, '2002-05-13', 3, '3518142713', 6);
insert into `pazienti` (`consenso_dossier`, `data_nascita`, `id`, `telefono`, `utente_id`) values (0, '2006-06-15', 4, '3518142813', 10);
insert into `pazienti` (`consenso_dossier`, `data_nascita`, `id`, `telefono`, `utente_id`) values (0, '2006-06-15', 5, '3518142813', 11);
