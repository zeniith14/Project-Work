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
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-02', 1, 1, '09:00:00', '08:00:00', 'prenotato');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-02', 2, 1, '10:00:00', '09:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-02', 3, 1, '11:00:00', '10:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-02', 5, 1, '13:00:00', '12:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-02', 6, 1, '19:00:00', '18:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-02', 7, 1, '18:00:00', '17:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-02', 8, 1, '17:00:00', '16:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-02', 9, 1, '16:00:00', '15:00:00', 'prenotato');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-02', 10, 1, '15:00:00', '14:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-02', 11, 1, '12:00:00', '11:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-02', 12, 1, '14:00:00', '13:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-03', 14, 1, '19:00:00', '18:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-04', 15, 1, '11:00:00', '10:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-04', 16, 1, '12:00:00', '11:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-06', 17, 2, '09:00:00', '08:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-06', 18, 2, '10:00:00', '09:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-06', 19, 2, '11:00:00', '10:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-06', 20, 2, '12:00:00', '11:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-06', 21, 2, '13:00:00', '12:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-06', 22, 2, '14:00:00', '13:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-06', 23, 1, '09:00:00', '08:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-06', 24, 1, '10:00:00', '09:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-06', 25, 1, '11:00:00', '10:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-06', 26, 1, '12:00:00', '11:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-06', 27, 1, '13:00:00', '12:00:00', 'prenotato');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-02', 28, 2, '09:00:00', '08:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-02', 29, 2, '10:00:00', '09:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-05', 30, 1, '09:30:00', '08:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-05', 31, 1, '10:30:00', '09:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-05', 32, 1, '11:30:00', '10:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-05', 33, 1, '12:30:00', '11:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 34, 1, '09:30:00', '08:00:00', 'prenotato');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 38, 1, '10:00:00', '09:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 39, 1, '11:00:00', '10:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 40, 1, '12:00:00', '11:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 41, 1, '13:00:00', '12:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 42, 1, '14:00:00', '13:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 43, 1, '15:00:00', '14:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 44, 1, '16:00:00', '15:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 45, 1, '17:00:00', '16:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 46, 1, '18:00:00', '17:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 47, 1, '19:00:00', '18:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 48, 4, '09:00:00', '08:00:00', 'prenotato');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 49, 4, '10:00:00', '09:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 50, 4, '11:00:00', '10:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 51, 4, '13:00:00', '12:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 52, 4, '19:00:00', '18:00:00', 'libero');
insert into `disponibilita` (`data`, `id`, `medico_id`, `ora_fine`, `ora_inizio`, `stato`) values ('2026-07-07', 53, 4, '18:00:00', '17:00:00', 'prenotato');
