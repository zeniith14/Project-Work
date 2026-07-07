CREATE TABLE `specialita` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `descrizione` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;insert into `specialita` (`descrizione`, `id`, `nome`) values ('Visite generali e medicina di base', 1, 'Medicina Generale');
insert into `specialita` (`descrizione`, `id`, `nome`) values ('', 2, 'Cardiologo');
