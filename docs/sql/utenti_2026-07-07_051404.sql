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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;insert into `utenti` (`cognome`, `creato_il`, `email`, `id`, `nome`, `password`, `primo_accesso`, `ruolo`) values ('Sistema', '2026-06-25 04:00:16', 'admin@vitaserena.it', 1, 'Amministratore', '$2b$12$wJUMfGB6PKbDRJ6SrnKwW.SjfZvi.xzlOLG5HGfPpPrBQ6T97DNoq', 0, 'admin');
insert into `utenti` (`cognome`, `creato_il`, `email`, `id`, `nome`, `password`, `primo_accesso`, `ruolo`) values ('carbone', '2026-07-01 02:03:41', 'giuseppe@prova.net', 2, 'giuseppe', '$2b$12$zLwfWo198Fviz6ieA.1hNewfNdfv7WACcRGNj6YMOMmQgZlbYSbLG', 0, 'paziente');
insert into `utenti` (`cognome`, `creato_il`, `email`, `id`, `nome`, `password`, `primo_accesso`, `ruolo`) values ('carbone', '2026-07-01 02:04:08', 'giuseppe@prova.it', 3, 'giuseppe', '$2b$12$FrnBMEEYcFsZf./lwR12zOWu5hZhqquGse/aq.f9No2VnAz.OJ3ca', 0, 'paziente');
insert into `utenti` (`cognome`, `creato_il`, `email`, `id`, `nome`, `password`, `primo_accesso`, `ruolo`) values ('Carbone', '2026-07-01 02:24:41', 'medico@vitaserena.it', 4, 'Giuseppe', '$2b$12$i8hNeMnbMLHK4SGGKABiOuBIDcmFtJfsQ4085ZAzFcH18xdbgdndy', 0, 'medico');
insert into `utenti` (`cognome`, `creato_il`, `email`, `id`, `nome`, `password`, `primo_accesso`, `ruolo`) values ('Carbone', '2026-07-01 02:26:54', 'segreteria@vitaserena.it', 5, 'Giuseppe', '$2b$12$6lHy0NGhGkoikovniJShYesQf6jn6wuv61k5XJsmzI8JftyYVLYua', 0, 'segretaria');
insert into `utenti` (`cognome`, `creato_il`, `email`, `id`, `nome`, `password`, `primo_accesso`, `ruolo`) values ('Carbone', '2026-07-01 02:50:15', 'giuseppecarbone514@gmail.com', 6, 'Giuseppe', '$2b$12$6mFmsg8nHTqPmSxIFkamAuapBkL0sBjQpGBJrLHMe7r3O5qclTwKi', 0, 'paziente');
insert into `utenti` (`cognome`, `creato_il`, `email`, `id`, `nome`, `password`, `primo_accesso`, `ruolo`) values ('Carbone', '2026-07-02 23:31:02', 'giuseppe.carbone@studenti.unipegaso.it', 7, 'Giuseppe', '$2b$12$g0ynNcFgpJiT6gjzIM4HDuJGIqB75P5NuPYhZ6R.E4pMubM993a42', 0, 'medico');
insert into `utenti` (`cognome`, `creato_il`, `email`, `id`, `nome`, `password`, `primo_accesso`, `ruolo`) values ('Carbone', '2026-07-02 23:42:30', 'giuseppe.carbone@studenti.unipegaso.com', 8, 'Giuseppe', '$2b$12$ZQShZM1qEoh6aK0n16w5VuDvrhAdkBqDXXE6aNOE661Lq2rmpOR6.', 1, 'segretaria');
insert into `utenti` (`cognome`, `creato_il`, `email`, `id`, `nome`, `password`, `primo_accesso`, `ruolo`) values ('Russo', '2026-07-07 04:15:18', 'fortniteginocamioncino@gmail.com', 10, 'Fabiana', '$2b$12$1HLkXrMEBf8osOn1HZ3dfu24IMRmcCqpzGRBhgPVtyrvEqJx.y6eq', 0, 'paziente');
insert into `utenti` (`cognome`, `creato_il`, `email`, `id`, `nome`, `password`, `primo_accesso`, `ruolo`) values ('Russo', '2026-07-07 04:15:53', 'fortniteginocamioncino@libero.it', 11, 'Fabiana', '$2b$12$3EuNdx1yFWPNaIhQNuomkOyGn6nT47FWhfwBnO9dBD9ghRLFc.Ab6', 0, 'paziente');
insert into `utenti` (`cognome`, `creato_il`, `email`, `id`, `nome`, `password`, `primo_accesso`, `ruolo`) values ('russo', '2026-07-07 04:36:00', 'russo@vitaserena.it', 12, 'federica', '$2b$12$oywVFeYF7tTSfClP0hq3jORR0C0/f.1gXamv5sgpNZsBbb8jjBiza', 0, 'medico');
