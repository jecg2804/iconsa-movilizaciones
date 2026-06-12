SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict q4cqUjF1g5OKZiUx0a9auj5c4dZpQbQ3eHfZgl4PQ9KjmpC7w0sFUm7aNnRcJZX

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '1425a5ed-6d64-4f46-ac1a-da36126b5011', 'authenticated', 'authenticated', 'agonzalez@iconsanet.com', '$2a$06$NIsYaSJeHoLresg.yxG3wuSVzFhM.g448QfAIowxGTlH0ri4DokYO', '2026-03-15 22:25:09.964716+00', NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email": "agonzalez@iconsanet.com"}', false, '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '1611cae3-9e80-498c-8c90-d9bd074c4527', 'authenticated', 'authenticated', 'aperez@iconsanet.com', '$2a$06$yIW3vbA5X7Ak9MRmm3Daau0JaMZjlMKS6oXpcnHwBGOte9zO28gdi', '2026-03-15 22:25:09.964716+00', NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email": "aperez@iconsanet.com"}', false, '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'b1da55c2-55e7-4599-bcdc-7df9e0d61ba9', 'authenticated', 'authenticated', 'drios@iconsanet.com', '$2a$06$OX8I60/gOq2At2Xe7I2cLOtVGc7min9oKm6FiUKhD4mh9CJZJiqNe', '2026-03-15 22:25:09.964716+00', NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email": "drios@iconsanet.com"}', false, '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'fc342062-08a7-4e09-b0e3-52eadae07be8', 'authenticated', 'authenticated', 'erodriguez@iconsanet.com', '$2a$06$0oB75lvqZuffFUeSANtqUu9E5.oMjJ.3WvXIg9S2K/FklF1nZX5R6', '2026-03-15 22:25:09.964716+00', NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email": "erodriguez@iconsanet.com"}', false, '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'dae9215d-22fc-4d6f-aa78-74cf04f03c92', 'authenticated', 'authenticated', 'fmarciaga@iconsanet.com', '$2a$06$5rdbL/Ex53uXsEhln8tw0eLGg9dMxLG8FeqSLfJDFrAo5A6R4lUBu', '2026-03-15 22:25:09.964716+00', NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email": "fmarciaga@iconsanet.com"}', false, '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '6a5ac7fa-3395-4a82-a51f-383f5417f1d4', 'authenticated', 'authenticated', 'hpino@iconsanet.com', '$2a$06$WZeDrcO4PtoYtZY.e4Pe5O2O0F1VuYYnUPKAkb2yCobDTjDADEkt2', '2026-03-15 22:25:09.964716+00', NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email": "hpino@iconsanet.com"}', false, '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'b5aab55a-60d0-4e27-bf3a-2c47a095b343', 'authenticated', 'authenticated', 'jtroetsch@iconsanet.com', '$2a$06$R1a92M52F1mLNPbTG6qf.ei50f5L1oUw.J1d/k83AoFGQdG7gbAMu', '2026-03-15 22:25:09.964716+00', NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email": "jtroetsch@iconsanet.com"}', false, '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'ec321acd-8b0c-498f-8ec6-9cb3a5de83e3', 'authenticated', 'authenticated', 'mlange@iconsanet.com', '$2a$06$38lTmD.w9I/zENlyP.IS7.Nd.Mber8/wB67IyNTMwCEvX7v34kFm6', '2026-03-15 22:25:09.964716+00', NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email": "mlange@iconsanet.com"}', false, '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '380a4028-abef-47c0-8479-080c7970d00d', 'authenticated', 'authenticated', 'almacen@iconsa.test', '$2a$10$m.0O7DX.gej2jGgacArkK.9ez/Ysz5hRZ9Zc.0yiGJPKCoshYfFhu', '2026-03-04 22:36:51.81326+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-15 22:10:23.700234+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-03-04 22:36:51.809972+00', '2026-03-15 22:10:23.709756+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'b6397feb-ff36-45c6-81a6-7cc8fefa6e0c', 'authenticated', 'authenticated', 'mpozza@iconsanet.com', '$2a$06$jkkl0OIquGummsT7vL.82OCePpAnTV4Dmlw5j5TaQSOqxpZun8dGO', '2026-03-15 22:25:09.964716+00', NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email": "mpozza@iconsanet.com"}', false, '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'c57c7553-75bd-44c4-be07-28e0079f9aaa', 'authenticated', 'authenticated', 'vgonzalez@iconsanet.com', '$2a$06$PDUS4FGW1UIeLgvdWLAZEexca18LcZ5SwFbKqVtVNWMIVKNbowNrm', '2026-03-15 22:25:09.964716+00', NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email": "vgonzalez@iconsanet.com"}', false, '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '72933835-13a2-4026-95d0-ac320e32e182', 'authenticated', 'authenticated', 'conductor@iconsa.test', '$2a$10$iSvf7dy.yIctD8J7fiUxQO8RMeAIpaulSoxYjOuXLY6XObWJXI/SW', '2026-03-04 22:36:30.960377+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-15 23:10:27.90162+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-03-04 22:36:30.957105+00', '2026-03-15 23:10:27.909471+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'f545a620-0518-437c-a006-17da5d7f2d22', 'authenticated', 'authenticated', 'ccaballero@iconsanet.com', '$2a$06$9iMEnYCVHsj2JyYOIuctDe5in8gxbcdJ.NZCk06GjJKvCX3qzSlA6', '2026-03-04 22:36:13.984252+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-12 16:40:31.875356+00', '{"provider": "email", "providers": ["email"]}', '{"email": "ccaballero@iconsanet.com", "email_verified": true}', NULL, '2026-03-04 22:36:13.974979+00', '2026-03-15 22:27:31.35882+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', 'authenticated', 'authenticated', 'ccharris@iconsanet.com', '$2a$06$aOxNE/X4dr67wmcZ4O.7Y.kUO435YegGGd27mr1c7hQanlyqTraoy', '2026-03-04 22:34:18.714953+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-16 19:41:34.15724+00', '{"provider": "email", "providers": ["email"]}', '{"email": "ccharris@iconsanet.com", "email_verified": true}', NULL, '2026-03-04 22:34:18.668485+00', '2026-03-16 19:41:34.17242+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', 'authenticated', 'authenticated', 'jjacome@iconsanet.com', '$2a$06$7kZtZau/tUL5MKUI22/QEeKx7GQszUk2avE8kOXp8r8vXN81FuliS', '2026-03-04 22:35:05.942211+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-16 16:39:50.175998+00', '{"provider": "email", "providers": ["email"]}', '{"email": "jjacome@iconsanet.com", "email_verified": true}', NULL, '2026-03-04 22:35:05.889518+00', '2026-03-17 00:19:41.072582+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '7b707095-8390-4332-8ac3-0c43bb6cedc7', 'authenticated', 'authenticated', 'jcucalon@iconsanet.com', '$2a$06$BmZk3dONny/gfrCgutA6/ert5lVyx9zjYhEbRmPkyU2vyFHnVAnAG', '2026-03-04 22:37:21.834967+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-17 13:31:26.868039+00', '{"provider": "email", "providers": ["email"]}', '{"email": "jcucalon@iconsanet.com", "email_verified": true}', NULL, '2026-03-04 22:37:21.830932+00', '2026-03-17 13:31:26.880693+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('72933835-13a2-4026-95d0-ac320e32e182', '72933835-13a2-4026-95d0-ac320e32e182', '{"sub": "72933835-13a2-4026-95d0-ac320e32e182", "email": "conductor@iconsa.test", "email_verified": false, "phone_verified": false}', 'email', '2026-03-04 22:36:30.958654+00', '2026-03-04 22:36:30.958703+00', '2026-03-04 22:36:30.958703+00', '1bce7a57-3710-40c2-88c8-09b019aa474c'),
	('380a4028-abef-47c0-8479-080c7970d00d', '380a4028-abef-47c0-8479-080c7970d00d', '{"sub": "380a4028-abef-47c0-8479-080c7970d00d", "email": "almacen@iconsa.test", "email_verified": false, "phone_verified": false}', 'email', '2026-03-04 22:36:51.811748+00', '2026-03-04 22:36:51.811796+00', '2026-03-04 22:36:51.811796+00', '410340da-4e00-4d2b-8af3-ea80b2fc70be'),
	('7b707095-8390-4332-8ac3-0c43bb6cedc7', '7b707095-8390-4332-8ac3-0c43bb6cedc7', '{"sub": "7b707095-8390-4332-8ac3-0c43bb6cedc7", "email": "jcucalon@iconsanet.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-04 22:37:21.832592+00', '2026-03-04 22:37:21.832637+00', '2026-03-15 22:24:49.192151+00', '94b437d0-e46f-4ab6-8a7e-4360bef9566e'),
	('a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', 'a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', '{"sub": "a5b1f64c-e71e-4858-8f54-9082ebd6cbaa", "email": "ccharris@iconsanet.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-04 22:34:18.697693+00', '2026-03-04 22:34:18.697759+00', '2026-03-15 22:24:49.192151+00', '837453ee-01c6-4f95-a398-4f6689137d20'),
	('f545a620-0518-437c-a006-17da5d7f2d22', 'f545a620-0518-437c-a006-17da5d7f2d22', '{"sub": "f545a620-0518-437c-a006-17da5d7f2d22", "email": "ccaballero@iconsanet.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-04 22:36:13.977354+00', '2026-03-04 22:36:13.977403+00', '2026-03-15 22:24:49.192151+00', '4bc982f2-e142-408c-b7ec-bf85a8ef7efa'),
	('1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '{"sub": "1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03", "email": "jjacome@iconsanet.com", "email_verified": false, "phone_verified": false}', 'email', '2026-03-04 22:35:05.926859+00', '2026-03-04 22:35:05.929535+00', '2026-03-15 22:24:49.192151+00', '871bbb7a-beca-4165-9d3f-a8a5bcc4df97'),
	('1425a5ed-6d64-4f46-ac1a-da36126b5011', '1425a5ed-6d64-4f46-ac1a-da36126b5011', '{"sub": "1425a5ed-6d64-4f46-ac1a-da36126b5011", "email": "agonzalez@iconsanet.com", "email_verified": true, "phone_verified": false}', 'email', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', 'c849e80a-03bb-4cc0-8955-d944b035d8a2'),
	('1611cae3-9e80-498c-8c90-d9bd074c4527', '1611cae3-9e80-498c-8c90-d9bd074c4527', '{"sub": "1611cae3-9e80-498c-8c90-d9bd074c4527", "email": "aperez@iconsanet.com", "email_verified": true, "phone_verified": false}', 'email', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', 'c1716c75-97d2-41c5-a839-e266a2f7a72f'),
	('b1da55c2-55e7-4599-bcdc-7df9e0d61ba9', 'b1da55c2-55e7-4599-bcdc-7df9e0d61ba9', '{"sub": "b1da55c2-55e7-4599-bcdc-7df9e0d61ba9", "email": "drios@iconsanet.com", "email_verified": true, "phone_verified": false}', 'email', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', 'e8cd09d8-a775-4e34-b636-78104a250b23'),
	('fc342062-08a7-4e09-b0e3-52eadae07be8', 'fc342062-08a7-4e09-b0e3-52eadae07be8', '{"sub": "fc342062-08a7-4e09-b0e3-52eadae07be8", "email": "erodriguez@iconsanet.com", "email_verified": true, "phone_verified": false}', 'email', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', 'a9554988-df68-42de-9a8d-6b4b627308ff'),
	('dae9215d-22fc-4d6f-aa78-74cf04f03c92', 'dae9215d-22fc-4d6f-aa78-74cf04f03c92', '{"sub": "dae9215d-22fc-4d6f-aa78-74cf04f03c92", "email": "fmarciaga@iconsanet.com", "email_verified": true, "phone_verified": false}', 'email', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '860efaf4-1158-40a4-9425-d3ff77591a55'),
	('6a5ac7fa-3395-4a82-a51f-383f5417f1d4', '6a5ac7fa-3395-4a82-a51f-383f5417f1d4', '{"sub": "6a5ac7fa-3395-4a82-a51f-383f5417f1d4", "email": "hpino@iconsanet.com", "email_verified": true, "phone_verified": false}', 'email', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '6582acc8-1386-4ea8-920f-22549b368839'),
	('b5aab55a-60d0-4e27-bf3a-2c47a095b343', 'b5aab55a-60d0-4e27-bf3a-2c47a095b343', '{"sub": "b5aab55a-60d0-4e27-bf3a-2c47a095b343", "email": "jtroetsch@iconsanet.com", "email_verified": true, "phone_verified": false}', 'email', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '0884cb6c-f39e-44d4-ab07-c98af8c4129f'),
	('ec321acd-8b0c-498f-8ec6-9cb3a5de83e3', 'ec321acd-8b0c-498f-8ec6-9cb3a5de83e3', '{"sub": "ec321acd-8b0c-498f-8ec6-9cb3a5de83e3", "email": "mlange@iconsanet.com", "email_verified": true, "phone_verified": false}', 'email', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '30fbb676-47e1-4bca-8457-cee0c45d1967'),
	('b6397feb-ff36-45c6-81a6-7cc8fefa6e0c', 'b6397feb-ff36-45c6-81a6-7cc8fefa6e0c', '{"sub": "b6397feb-ff36-45c6-81a6-7cc8fefa6e0c", "email": "mpozza@iconsanet.com", "email_verified": true, "phone_verified": false}', 'email', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '7f919004-b613-4f48-b8e8-e3cf3c4bdb85'),
	('c57c7553-75bd-44c4-be07-28e0079f9aaa', 'c57c7553-75bd-44c4-be07-28e0079f9aaa', '{"sub": "c57c7553-75bd-44c4-be07-28e0079f9aaa", "email": "vgonzalez@iconsanet.com", "email_verified": true, "phone_verified": false}', 'email', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '2026-03-15 22:25:09.964716+00', '8d05b3e3-dff9-42da-9f20-289d65fd53be');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('a1d0beb0-ff2e-4db7-ab05-c8285b700f53', 'a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', '2026-03-16 19:41:34.157354+00', '2026-03-16 19:41:34.157354+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '138.84.46.115', NULL, NULL, NULL, NULL, NULL),
	('c4819264-a376-4225-ab82-9b25244efe8d', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '2026-03-16 16:39:50.176095+00', '2026-03-17 00:19:41.929098+00', NULL, 'aal1', NULL, '2026-03-17 00:19:41.929008', 'node', '100.54.89.2', NULL, NULL, NULL, NULL, NULL),
	('35e9bb56-6be8-4fd6-8c55-cacaf2accd72', '7b707095-8390-4332-8ac3-0c43bb6cedc7', '2026-03-17 13:31:26.868125+00', '2026-03-17 13:31:26.868125+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '200.46.122.178', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('c4819264-a376-4225-ab82-9b25244efe8d', '2026-03-16 16:39:50.18857+00', '2026-03-16 16:39:50.18857+00', 'password', 'cd314af8-7fb6-4879-8c3a-7218edd3ad2c'),
	('a1d0beb0-ff2e-4db7-ab05-c8285b700f53', '2026-03-16 19:41:34.173144+00', '2026-03-16 19:41:34.173144+00', 'password', 'b133060b-b5d2-4ac8-a8d0-917b6e513af5'),
	('35e9bb56-6be8-4fd6-8c55-cacaf2accd72', '2026-03-17 13:31:26.883375+00', '2026-03-17 13:31:26.883375+00', 'password', '941b1d6a-aeb6-4c0b-9de7-8fd90e1a91d6');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 159, 'lyccdbesuxng', 'a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', false, '2026-03-16 19:41:34.168227+00', '2026-03-16 19:41:34.168227+00', NULL, 'a1d0beb0-ff2e-4db7-ab05-c8285b700f53'),
	('00000000-0000-0000-0000-000000000000', 158, 'gywbdij34p7o', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', true, '2026-03-16 16:39:50.181421+00', '2026-03-17 00:19:41.069153+00', NULL, 'c4819264-a376-4225-ab82-9b25244efe8d'),
	('00000000-0000-0000-0000-000000000000', 160, 'ctuqlqxzh7in', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', false, '2026-03-17 00:19:41.070968+00', '2026-03-17 00:19:41.070968+00', 'gywbdij34p7o', 'c4819264-a376-4225-ab82-9b25244efe8d'),
	('00000000-0000-0000-0000-000000000000', 161, 'yaes3bs266lk', '7b707095-8390-4332-8ac3-0c43bb6cedc7', false, '2026-03-17 13:31:26.872783+00', '2026-03-17 13:31:26.872783+00', NULL, '35e9bb56-6be8-4fd6-8c55-cacaf2accd72');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: people; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."people" ("id", "auth_id", "code", "name", "department", "position", "phone", "email", "app_role", "status", "created_at", "city", "supervisor_id", "cedula", "license_type", "license_expiry", "hire_date", "emergency_contact_name", "emergency_contact_phone", "updated_at", "notifications_enabled") VALUES
	('a5908979-f50d-4e52-9cdf-c743b7d5385d', 'b5aab55a-60d0-4e27-bf3a-2c47a095b343', '	
TRO048', 'Jenniffer Troetsch', 'Proyectos', 'Ingeniero de Proyecto', NULL, 'jtroetsch@iconsanet.com', 'pm', 'Activo', '2026-03-06 13:40:54.148782+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 22:25:09.964716+00', false),
	('034ab5b4-f349-4372-90a4-b4371357b49f', NULL, 'ZAL576', 'Esteban Agrazal', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('b1b75c17-3430-4538-b294-29b89ccebd96', NULL, 'AIZ820', 'Alejandro Aizprua', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('52f0e8e2-4bcc-455c-a678-d28dae9a4a9d', '380a4028-abef-47c0-8479-080c7970d00d', NULL, 'Almacen', 'Almacén', 'Almacenista', NULL, 'almacen@iconsa.test', 'almacen', 'Activo', '2026-03-04 22:44:34.527973+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-04 22:52:42.971877+00', false),
	('d726fcc6-57b1-4691-900e-cba5ea361ff3', '72933835-13a2-4026-95d0-ac320e32e182', NULL, 'Conductor', 'Transporte', 'Conductor', NULL, 'conductor@iconsa.test', 'campo', 'Activo', '2026-03-04 22:44:34.527973+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-04 22:52:58.126924+00', false),
	('1f8b5127-b11d-4d91-8713-f27174569907', NULL, 'SOL256', 'Ninoska Correa De Solis', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('ebdafb17-a153-4423-b83c-782bd5633088', NULL, 'GAR253', 'Antonio Urbano Garcia', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('cfe8827e-6609-4044-9b17-0934c333f276', 'b6397feb-ff36-45c6-81a6-7cc8fefa6e0c', NULL, 'Marisa Pozza', 'Proyectos', 'Ingeniero de Proyecto', NULL, 'mpozza@iconsanet.com', 'pm', 'Activo', '2026-03-06 13:40:54.148782+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 22:25:09.964716+00', false),
	('4e1af0bc-a0ea-44af-8201-45a5f9ce73da', NULL, 'GOM609', 'Daniel Gomez', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('4889bda8-cbf7-4161-ae75-595eae9008cb', 'c57c7553-75bd-44c4-be07-28e0079f9aaa', 'GON289', 'Velideth A. Gonzalez', 'Proyectos', 'Ingeniero de Proyecto', NULL, 'vgonzalez@iconsanet.com', 'pm', 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 22:25:09.964716+00', false),
	('3f4124c7-dcea-4bcb-a8ba-ba20c7e09200', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', 'JAC161', 'Juan E. Jacome', 'Ingeniería', 'Asistente de Ingeniería', '', 'jjacome@iconsanet.com', 'pm', 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-16 02:46:53.258592+00', true),
	('08ee8bb6-aa37-416e-99d2-85569581d21e', 'f545a620-0518-437c-a006-17da5d7f2d22', 'CAB523', 'Cesar Caballero', 'Proyectos', 'Ingeniero de Proyecto', NULL, 'ccaballero@iconsanet.com', 'pm', 'Activo', '2026-03-04 22:44:34.527973+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('f463253e-d10f-4860-a022-44df8a6d0af8', '7b707095-8390-4332-8ac3-0c43bb6cedc7', NULL, 'Admin', 'TI', 'Administrador', NULL, 'jcucalon@iconsanet.com', 'admin', 'Activo', '2026-03-04 22:44:34.527973+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-16 02:46:53.258592+00', true),
	('abcd260d-e32a-460a-9ed8-a4a02fca78da', NULL, 'ABR239', 'Richard A. Abrego', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('743e04f6-6ba7-48e7-98a3-fbf694670c7e', NULL, 'ACO583', 'Noel Jose Acosta', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('d6b9a76d-a1d0-4242-b7c6-fa3fd777ab9f', NULL, 'AGU860', 'Fernando I. Aguilar', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('f0a04288-d51b-4dfb-9cf1-453266f3941d', NULL, 'ESP956', 'Jose V. Espinoza', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('af3bc93b-e926-4e8a-a2e4-b1c677c1a4c4', NULL, 'RIV765', 'Johan Guillermo Rivera', NULL, NULL, '6340-0548', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('de175673-3053-4a3f-a65f-658b83f0653a', NULL, 'CAM119', 'Gerardo Camarena', NULL, NULL, '6852-2744', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Este', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('bd665169-024f-40af-a8cc-83f154360d88', NULL, 'AGU006', 'Florentino J. Aguilar', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('0ece61ab-b643-4399-8df3-e9c9965aac23', NULL, 'CAM574', 'Kidd Campbell', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('1f5f284f-894b-40ed-b7fc-988d8ae7e51f', NULL, 'CAS193', 'Leslie Edgardo Castillo', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('5377699c-ffed-488e-a119-738db39797cd', NULL, 'GUE149', 'Pedro Guerra', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('a552721d-c9ed-4931-b410-ffb192ca2eab', NULL, 'GUE323', 'Florentino Guerra', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('7ff5ec9e-26df-4bf3-93ea-92ae76a8c98f', NULL, 'DIA886', 'Alberto Diaz', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Mananitas', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('0281629a-8e82-491f-a041-3000fba8d1c3', NULL, 'DOM343', 'Nicanor Dominguez', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Mananitas', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('dea3a171-0e45-432c-919a-25477f94046e', NULL, 'FUE542', 'Gabriel Fuentes', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:28:57.625428+00', false),
	('9e166721-ac74-4dc3-8323-e60b51d9b459', NULL, 'RAM397', 'Eric Rampola', 'Presupuestos', 'Jefe de Presupuestos', NULL, 'erampola@iconsanet.com', NULL, 'Activo', '2026-03-06 13:40:54.148782+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('efa8a775-6099-4ed5-9e9c-a19ad6d0a29a', NULL, 'FER337', 'Octavio Javier Ferrer', 'Gerencia', 'Vice Presidente', NULL, 'ojferrer@iconsanet.com', NULL, 'Activo', '2026-03-06 13:40:54.148782+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('c1b6f332-c2c0-4f28-a949-8c9088af2b54', NULL, 'GAL558', 'Alexis Gallardo', NULL, NULL, '6306-6337', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('9dc8c061-92db-4881-a37a-a4a3827c2ed4', NULL, 'GON122', 'Antonio Gonzalez', NULL, NULL, '6293-5734', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('7fd00dc3-7001-47fb-ac8a-9bb9d194f433', NULL, 'GAR754', 'Antony Garcia', NULL, NULL, '6225-4219', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('c26430ad-435c-490d-aac2-ecc6fbdaae33', NULL, 'ACO170', 'Aron Acosta', NULL, NULL, '6342-0087', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('f1fffaba-5b00-42e0-9473-f39c01ec4af4', NULL, 'ROJ636', 'Cristobal Rojas', NULL, NULL, '6422-8375', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('7ecc6e94-14f8-4815-9d28-f54b92cf27a0', NULL, 'ABR591', 'David Abrego', NULL, NULL, '6801-6141', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('3b99be36-3c47-4277-b7e8-541e742d838f', NULL, 'DER028', 'Derrick Casasola', NULL, NULL, '6489-6295', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('d9495a90-ddd3-4162-bb02-64812e72aab8', NULL, 'GON919', 'Ediberto Gonzalez', NULL, NULL, '6831-9201', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('1682950d-f6bd-4a5b-b75d-97d2fc2c7682', NULL, 'GOR599', 'Gabriel Gordon', NULL, NULL, '6718-4798', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('ba1bfd75-4ece-45be-9321-6460fbd370e9', NULL, 'GUE521', 'Geose Guerra', NULL, NULL, '6498-0662', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('3e5b6027-2958-4611-ae44-f00176316dfd', NULL, 'CAM060', 'Isidro Campos', NULL, NULL, '6607-6403', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('b753f5b7-6ae8-447b-a716-bb847c78e23f', '1425a5ed-6d64-4f46-ac1a-da36126b5011', 'GON784', 'Ariel A. Gonzalez', 'Ingeniería', 'Superintendente', NULL, 'agonzalez@iconsanet.com', 'pm', 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 22:25:09.964716+00', false),
	('3de44cfc-3a6b-434c-98af-c540e7ef8815', NULL, 'FIS071', 'Jean Pierre Fisher', NULL, NULL, '6805-7534', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('d3a408d4-87ec-4235-8d7a-54ebcbadde41', NULL, 'DEH797', 'Jose De Hoyos', NULL, NULL, '6411-6836', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('07193324-03ff-41a3-8d9c-09a1b6b80105', 'b1da55c2-55e7-4599-bcdc-7df9e0d61ba9', '	
RIO83', 'David Ríos', 'Ingeniería', 'Superintendente', NULL, 'drios@iconsanet.com', 'pm', 'Activo', '2026-03-06 13:40:54.148782+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 22:25:09.964716+00', false),
	('c1b9dc79-1a2d-4cdf-a0f3-649b0a721da5', 'dae9215d-22fc-4d6f-aa78-74cf04f03c92', NULL, 'Franklin Marciaga', 'Ingeniería', 'Director de Ingeniería y Construcción', NULL, 'fmarciaga@iconsanet.com', 'pm', 'Activo', '2026-03-06 13:40:54.148782+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 22:25:09.964716+00', false),
	('8d76c62e-09c4-4674-bec6-ae66a0d2e81e', NULL, 'JAE866', 'Armando Jaen', NULL, NULL, '6888-9721', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('9ea32383-aa15-42c1-9382-e8ab6fb09695', NULL, 'HER085', 'Edwin Herrera', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:28:57.625428+00', false),
	('00846859-4128-4b94-87f1-1f1ef8920895', NULL, 'GUT617', 'Evaristo Gutierrez', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('014233c1-6379-4d5c-bc37-a143b5a003a2', NULL, 'HER352', 'Gabriel Herrera', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('0693226b-d5a6-499c-abd8-e1574c6688ef', NULL, 'HER553', 'Juan Herrera', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('0ba7266c-7c07-438a-8dda-72a94103096f', NULL, 'MEN318', 'Jose Menchaca', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('376ed96b-4ac5-4a2f-9375-6dd0e40d937a', NULL, 'MON016', 'Joel Monrroy', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('b7c5960b-c21d-4a6a-afac-c64580999209', NULL, 'MOJ189', 'Luis Mojica', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:28:57.625428+00', false),
	('8bec4c0d-7cb5-400a-b7b4-8e5d7c790e29', NULL, 'ORT196', 'Luis Antonio Ortega', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('f582b6af-24a1-49d3-9aec-a7983c629906', NULL, 'OSO803', 'Francisco Osorio', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('5eca28d5-06fd-4f09-9f8d-62f1d4078df2', NULL, 'NEZ890', 'Diotildo Martinez P.', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:28:57.625428+00', false),
	('51f773a8-8689-4b11-b592-2a1379ecd2b5', NULL, 'PER757', 'Luis Ernesto Perez', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('188c6f66-f6fc-4c44-8fb3-2a9f78fa6dc4', NULL, 'PIT424', 'Elvis Pitti', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('18219ce0-84b5-4ac3-a063-ada47cac01e8', NULL, 'RIO203', 'Rigoberto Rios', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('4c5b5f90-62ef-4656-a757-6deb32a04dbc', NULL, 'RIO518', 'Jonathan R. Rios', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('af9ba6e6-2539-4673-bc8e-cc4367daa831', NULL, 'ROD814', 'Rigoberto Rodriguez', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('bd91e8ce-6438-46aa-a26f-77fdb4d6d4e9', NULL, 'ROD986', 'Hector Damian Rodriguez', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('6d3b5da6-7c19-4ca7-a887-20b2aeb2dbea', NULL, 'MOS468', 'Noel Alberto Mosquera', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:28:57.625428+00', false),
	('aa46945f-3d98-408a-88e4-92930e427604', NULL, 'MON670', 'Moises Montero', 'Transporte', 'Conductor', NULL, NULL, 'campo', 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('f0875003-49ed-4fe9-a1e2-b93312c03275', NULL, 'HER682', 'Cristian Hernandez', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('46a24914-3af7-4855-86e0-62b848cf36c8', NULL, 'MEL924', 'Juan D. Melendez', NULL, NULL, NULL, 'jmelendez@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('5c3113e9-9446-4871-bd2d-7297e3ff25e8', NULL, 'LOP125', 'Jose Miguel Lopez', NULL, NULL, NULL, 'asistentedeequipos@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('e25efced-5454-47e1-9237-9e6e8e03f02e', NULL, 'PIM165', 'Victor Pimentel', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:28:57.625428+00', false),
	('f75666eb-a3d6-42b8-a802-0f541d7110d5', '6a5ac7fa-3395-4a82-a51f-383f5417f1d4', 'PI1939', 'Hector Pino', NULL, NULL, '6312-8961', 'hpino@iconsanet.com', 'pm', 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 22:25:09.964716+00', false),
	('b6e12355-d43f-4da0-9b37-4e69ec6a4082', NULL, 'LEE352', 'Alexis B. Lee M.', 'Ingeniería', 'Ing. Asistente', '2925-854', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:54.148782+00', false),
	('86f98fcb-9c48-42c3-bd49-62b932f5d881', NULL, 'MIR828', 'Albis Miranda', NULL, NULL, '6046-0862', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('194a81ce-8abe-45d1-84e8-2ed8b7119526', NULL, 'MEN518', 'Alejandro Meneses', NULL, NULL, '6377-1518', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('76623109-7fc5-4ce1-a4b6-495ae3027453', NULL, 'POL522', 'Carlos Polanco Pena', NULL, NULL, '6942-8478', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('a9a1f0e6-ea67-41a5-8c83-2b7a925cc773', NULL, 'MOR428', 'Eduardo A. Morales', NULL, NULL, '6397-4027', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('34169e4c-4a35-4515-9e1a-779a38411dd2', NULL, 'HER324', 'Elias Hernandez R.', NULL, NULL, '6519-4642', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('b41c569b-9943-4740-b6bd-53c1c959dd33', NULL, 'PUG182', 'Eric Yurieth Puga', NULL, NULL, '6768-7884', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('f5dee0da-492d-482c-9380-f01a3873ae73', NULL, 'MAR935', 'Fernando Marin', NULL, NULL, '6895-0507', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('506efcbb-f525-4b28-96de-820fbf399f5e', NULL, 'MAR618', 'Francisco Martinez', NULL, NULL, '6926-4060', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('32fbe4cf-217b-4943-874e-598a950b9196', NULL, 'ALV341', 'Marcos Alvarez', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('bcaec198-4a8e-4097-8b98-d82924601501', NULL, 'ARA935', 'Hector Enrique Arauz', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('e0bf6964-afe7-477d-aafa-f01e65f20c94', NULL, 'ALM565', 'Ricardo Antonio Almanza', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('6a007480-10df-446e-aad9-dceca1485b18', NULL, 'BON930', 'Jose Bonilla', 'Transporte', 'Conductor', NULL, NULL, 'campo', 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('4ed9e1b5-ed7a-4edd-8f1f-6bf14d16e944', NULL, 'BEL359', 'Jorge D. Beluche', 'Proyectos', 'Gerente de Calidad', NULL, 'jbeluche@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('70e025a3-ba78-4b00-821f-c56b17af15a5', NULL, 'EIS772', 'Rodrigo Eisenmann', 'Gerencia', 'Presidente', NULL, 'reisenmann@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('d170896a-cf42-49b1-a47f-9c6ea66309be', NULL, 'AVE629', 'Alejandro Avendano', NULL, NULL, NULL, 'aavendano@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('d20d513b-4e2f-4251-83e6-4c7062508704', NULL, 'GRE998', 'Oscar S. Grenald', 'Administración', 'Aux. de Finanzas y Contabilidad', '6525-2654', 'ogrenald@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('d8d1b6c9-e596-4a91-8526-071a8be6b63a', NULL, 'AYA311', 'Gerardo Ayala', 'Ingeniería', 'Jefe de Agrimensura', NULL, 'gayala@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('d5ee5597-42e0-41e4-8ad3-f54a4a6e021b', NULL, 'BEC877', 'Alfredo Becerra', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:28:57.625428+00', false),
	('3abac773-4f7a-40f3-8b3f-16d555345400', NULL, 'CAB775', 'Yoseph Caballero', 'Equipo', 'Asistente de Equipo', '6927-0234', NULL, 'almacen', 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:56:00.877626+00', false),
	('f825abd3-72db-4fa5-b7c4-0fb8bba975f5', 'a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', 'CHA082', 'Carlos A. Charris', 'Equipo', 'Oficial de Logística', '', 'ccharris@iconsanet.com', 'logistica', 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-16 02:46:53.258592+00', true),
	('f9b7f6f8-84c1-4c65-a978-8a7167844500', NULL, 'ALV980', 'Anel Alvarado', NULL, NULL, '6540-9834', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('761299ca-4c12-474d-bdc7-fc5d639b4bcb', NULL, 'ARA371', 'Baleriano Araya C.', NULL, NULL, '6760-8858', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('fb50feb0-0857-4fea-85b0-4e186870d0c0', NULL, 'AVI298', 'Casildo Avila', NULL, NULL, '6724-8348', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('b8ed7706-37c2-424e-a979-cc4cd5a4a34e', NULL, 'ARA068', 'Edgar Arauz', NULL, NULL, '6858-5296', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('5694c615-e2e7-43e3-bd25-9c93cfc2be30', NULL, 'AYA273', 'Ernesto Ayarza', NULL, NULL, '6115-9867', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('2f73411b-3ca3-4ad9-abc9-3a740d4a765a', NULL, 'ARA161', 'Evaristo Arauz Flores', NULL, NULL, '6566-3570', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('83d33f0e-f405-456b-9323-8236bfa4ef70', NULL, 'ALM691', 'Jonathan Alexander Almengor', NULL, NULL, '6819-0608', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('236ca211-6fca-48de-afa2-1c281c990904', NULL, 'FLO652', 'Jose Flores', NULL, NULL, '6003-0425', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('595fcf74-778a-4fdd-8c54-a972363531f6', NULL, 'ROD664', 'Jose I Rodriguez', NULL, NULL, '6489-1453', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('a42b5909-5b43-4cb7-bb03-814f60067fbe', NULL, 'JIM894', 'Juan Jacinto Jimenez', NULL, NULL, '6508-9106', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('edabf35d-eeef-4607-867f-c45905afa1d2', NULL, 'ARI333', 'Laura E. Arias N.', NULL, NULL, '6392-7002', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('11266d46-dc26-4a36-b603-4915cedeb994', NULL, 'MOR639', 'Luis Alberto Moreno', NULL, NULL, '6623-2975', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('7a923e40-fe10-4ee0-ad51-236392be7d9a', NULL, 'GUE047', 'Luis Daniel Guevara Chi', NULL, NULL, '6289-3998', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('4efb229a-44c1-449a-a036-2d4fd70add3d', NULL, 'BLA048', 'Manuel Blanquicet', NULL, NULL, '6725-6789', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('c680d238-ce32-422e-ac1e-916ffa9321ba', NULL, 'DEL925', 'Manuel De Leon', NULL, NULL, '6937-3729', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('81993b83-bff6-45b7-a550-93c62123fffd', NULL, 'DIA742', 'Manuel Diaz', NULL, NULL, '6525-0443', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('c1b0ea3e-cf9a-4749-a1ce-9e3290486c0b', NULL, 'DES093', 'Nicolas De Sedas', NULL, NULL, '6624-7580', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('20acfa22-2a62-4940-9e55-4e02df09845b', NULL, 'JAE446', 'Oldemar Jaen', NULL, NULL, '6831-6421', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('00408301-9b8f-42ea-b416-cd6e6dffbd11', NULL, 'MUN386', 'Omar Munoz', NULL, NULL, '6390-6002', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('c5c32de9-cc49-4af1-9350-dcbc3ca64adb', NULL, 'ABR850', 'Oscar Abrego', NULL, NULL, '6048-9417', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('7bfe6cf3-2295-4435-ad3c-8307e7cd1b39', NULL, 'MIL608', 'Ricardo Miller', NULL, NULL, '6409-3422', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('aab81751-003b-461d-96f0-4127b24ebcd1', NULL, 'ARC583', 'Victor Arcia', NULL, NULL, '6692-2937', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('510a62a2-75bf-44cf-91af-f196807941f4', NULL, 'ASP955', 'Victor B. Asprilla', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'San Miguelito', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:27.451488+00', false),
	('92779bfc-ed3d-47ae-8bf0-ccc93d5ebcd3', NULL, 'DIA358', 'Rafael Diaz', 'Transporte', 'Conductor', NULL, NULL, 'campo', 'Activo', '2026-03-03 18:14:23.412153+00', 'San Miguelito', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:27.451488+00', false),
	('7fa2faea-efeb-49be-87c6-1c2672f90040', NULL, 'CAR347', 'Kevin Carpintero', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'San Miguelito', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:27.451488+00', false),
	('a3f588cd-5b6a-4d7e-b000-eae77141d0b1', NULL, 'HER823', 'Josue Iran Herrera', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'San Miguelito', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:27.451488+00', false),
	('9a0c226a-e532-457b-a0cc-9cadbb076102', NULL, 'MEN345', 'Miguel Mendoza', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'San Miguelito', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:27.451488+00', false),
	('7ad15d1c-f585-4a58-8528-4aa8fd87672c', NULL, 'MAR795', 'Indon Marciaga', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'San Miguelito', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:27.451488+00', false),
	('68995917-bc76-4fc1-9016-3439f2eb14c5', NULL, 'DEA770', 'Juan Manuel Deago', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Chepo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:27.451488+00', false),
	('c155a775-4d65-4741-9c81-3e8068b05b5b', NULL, 'DEL245', 'Abdiel A. Del Cid', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Chepo', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:27.451488+00', false),
	('1c5af8b0-be37-4bca-a9a0-a28f54e1650e', NULL, 'GON207', 'Jose Felix Gonzalez', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('437bd47c-3d3c-4834-8e32-a56cb0b5068f', NULL, 'PUG672', 'Eric Puga', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('34817e36-0941-46aa-9377-9a153b326356', NULL, 'MOR460', 'Isidro Moreno', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('55421548-5dc5-42e8-9f3d-41b721297343', NULL, 'ORT974', 'Luis A. Ortiz', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('72c9e5dc-8ebf-4f43-8e3d-faee1255515c', NULL, 'PIT090', 'Oscar Pitty', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('eba3a408-2b21-41f2-a9ee-86d551c8d43b', NULL, 'RIO375', 'Jose Rios', 'Transporte', 'Conductor', NULL, NULL, 'campo', 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('3b5fc839-0117-411a-967a-75916ef58226', NULL, 'GUE525', 'Daniel Guevara', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('68722a53-1609-4282-a61e-25266b4c22a8', NULL, 'GON453', 'Jean Carlos Gonzalez', NULL, NULL, '6770-1828', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('cb0ac4fe-48ed-491e-a021-a8c0ed48d791', NULL, 'JAE765', 'Angel I. Jaen', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('201f17a1-56b3-4c58-a26d-2995dee102e4', NULL, 'MAR519', 'Juan Martinez', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('f5081b46-8a47-45fa-80ca-e7861e0df89a', NULL, 'MOR088', 'Ernesto A. Moreno', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('37e68cbe-fbe7-437e-9566-08d8d92212c5', NULL, 'NUN148', 'Faustino Nuñez', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('91307ed7-7e2b-46b1-b13f-53f3217dfe2f', NULL, 'OUT102', 'Manuel Outten', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('7e9b393e-7c35-4907-bc68-e0722f1a01da', NULL, 'PER922', 'Victor Perea', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('c056016b-aade-477b-a643-0fc8b045a498', NULL, 'PIN309', 'Alexander B. Pinzon', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('8dff71c1-5e86-44af-93db-caa4d8fe58c2', NULL, 'AIZ472', 'Jorge Aizpurua', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Arraijan', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('be4cd804-fa86-4418-a6f9-a5b73bf63615', NULL, 'MON432', 'Millie Marie Monteza', 'Proyectos', 'Gerente de Calidad', NULL, 'mmonteza@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('0e81b6b0-56de-4455-95d2-ef17c9bf25df', NULL, 'LIM168', 'Luis Alfredo Lima', 'Ingeniería', 'Técnico en Control de Calidad', NULL, 'llima@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('1d153673-36b2-407e-9249-ba158dc46b2e', NULL, 'QUI487', 'Evidelia M. Quintero', 'Presupuestos', 'Asistente de Presupuestos', NULL, 'equintero@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('cd4015e3-d23d-4749-b1f4-bee889df6ff5', NULL, 'CHI217', 'Jurismar M. Chiari', 'Cumplimiento', 'Oficial de Seguridad', NULL, 'jchiari@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('68ec8402-bd11-4590-9c29-d096f122aba8', NULL, 'RIO806', 'Damaris Rios', 'Administración', 'Gerente de Finanzas y Contabilidad', NULL, 'driosm@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('33e239d2-a2a6-4e56-a742-0dc7f580596c', '1611cae3-9e80-498c-8c90-d9bd074c4527', 'PER062', 'Angel Joel Perez', 'Ingeniería', 'Asistente de Ingeniería', NULL, 'aperez@iconsanet.com', 'pm', 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 22:25:09.964716+00', false),
	('5a47cfc7-c4a5-4674-a2dc-4307d9c67f1a', 'ec321acd-8b0c-498f-8ec6-9cb3a5de83e3', 'LAN021', 'Madeleine R. Lange', 'Proyectos', 'Ingeniero de Proyecto', NULL, 'mlange@iconsanet.com', 'pm', 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 22:25:09.964716+00', false),
	('d3d0a1da-961a-4890-a73c-ac1a33c7508e', 'fc342062-08a7-4e09-b0e3-52eadae07be8', 'ROD522', 'Edward A. Rodriguez', 'Ingeniería', 'Superintendente', '', 'erodriguez@iconsanet.com', NULL, 'Inactivo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-16 14:16:23.454277+00', false),
	('5b6c4a5e-9276-48ba-ab1d-d0ec5bbf47f7', NULL, 'DOM689', 'Lourdes Del C. Dominguez', NULL, NULL, NULL, NULL, 'pm', 'Inactivo', '2026-03-03 18:14:23.412153+00', 'San Miguelito', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-16 14:16:29.904263+00', false),
	('7952f5b6-3bd3-46a8-a951-119d924396b3', NULL, 'ROJ657', 'Jonathan Rojas', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('a3dc1c07-d628-45b9-9455-1c0e797982a7', NULL, 'SAL228', 'Gregorio Saldana', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('9b07bce3-7670-4934-a28f-a7021a16641c', NULL, 'SAN312', 'Maximo Sanchez', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('7a85a110-b55b-4227-a59a-cdac2959af42', NULL, 'SAN937', 'Javier Santamaria', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('723d754b-b96d-4408-8b05-caaf372da5e0', NULL, 'SER230', 'Luis Enrique Serrano', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('ee4d4176-0865-45b3-b8e9-5b765f68f9b9', NULL, 'SOO979', 'Raul Soo', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('32b5fa8a-eb2a-4bcf-940f-42e7266f6627', NULL, 'TOR775', 'Ezequiel A. Toribio', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('88a1d2d2-7027-4075-b070-f480e54c8f8c', NULL, 'URR884', 'Jaime Urriola', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('7830ce0f-010a-4cf5-9bdc-21d20aa60fec', NULL, 'VAR983', 'Hector D. Varela', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('6a220f64-ff35-48e5-a492-b63df6d3d092', NULL, 'VER222', 'Luis Vergara', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('ad0c5c2d-4a73-4e04-9d36-db6f92442a71', NULL, 'VEL322', 'Manuel Velasquez', 'Administración', 'Mensajería', NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('0194404b-de40-4f6a-9f63-5a1aa6e5f1d4', NULL, 'SAN897', 'Jorge Sanchez', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('68ca5d60-0e05-4480-832a-cf8c2caeda56', NULL, 'VEG479', 'Juan Carlos Vega', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama Oeste', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('7050efa0-125e-46a3-af80-ce5d92b2436e', NULL, 'VAR643', 'Radhir Vargas', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:28:57.625428+00', false),
	('b32fb6b7-881f-4aab-8f1b-ea967fe32ea5', NULL, 'SIE363', 'Rafael Sievers', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('e9b196c8-8359-45c6-9930-2d88197a119c', NULL, 'ZUR647', 'Carlos S. Zurita', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Colon', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:44:25.901598+00', false),
	('77a63f82-dbbb-4102-bd02-d3661f189386', NULL, '	
KOSM01', 'Samantha Kosmas', 'Administración', 'Gerente de RRHH y ADM', NULL, NULL, NULL, 'Activo', '2026-03-06 13:40:54.148782+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 17:18:09.883876+00', false),
	('a61e2906-9b1a-44cd-bed1-82e2f5804cb9', NULL, '	
VAL130', 'Adolfo Valderrama', 'Equipo', 'Gerente', NULL, NULL, NULL, 'Activo', '2026-03-06 13:40:54.148782+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 17:19:38.615786+00', false),
	('340b9af1-3518-40c5-ae95-e163dd3ead16', NULL, 'VAS449', 'Andres Vasquez', NULL, NULL, '6505-7983', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('4da48e62-9b1b-418d-a757-3f62ec2f6cd1', NULL, 'VEG763', 'David Vega', NULL, NULL, '6386-9633', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('81ccb9a4-ef95-49dc-97c5-d0c9018b2101', NULL, 'WHA981', 'Kevin Wharton', NULL, NULL, '6319-4352', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('0c052cb4-184a-45bd-adf4-5908342a56ef', NULL, 'TEL777', 'Oscar Tello', NULL, NULL, '6864-2867', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('1917ed40-94e3-4aa3-b437-a2ed60e2b41f', NULL, 'VIL243', 'Victor Villa', NULL, NULL, '6653-4697', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('7dd7a6a0-ff3a-4f41-b462-9ea80b6f23ef', NULL, 'SAM084', 'Wilfredo Samudio', NULL, NULL, '6284-8465', NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:19.171999+00', false),
	('bf06c037-943f-4b7b-8c47-46e6aaee514d', NULL, 'SOL236', 'Andrés Solís', 'Proyectos', 'Gerente de Proyecto', NULL, NULL, 'pm', 'Activo', '2026-03-06 13:40:54.148782+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 19:13:34.069526+00', false),
	('55c85136-a439-4566-b10d-3d0c75db54ff', NULL, 'SAG899', 'Anai Del C. Sagel', 'Cumplimiento', 'Oficial de Seguridad', NULL, 'asagel@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('2b0b5fde-d232-4b84-995c-f65ca93ef859', NULL, 'TOR777', 'Ricardo A. Torres', 'Cumplimiento', 'Oficial de Seguridad', NULL, 'rtorres@iconsanet.com', NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'Panama', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('69853617-9649-4260-abed-faf7b80b281f', NULL, 'UGA301', 'Argelia Ugarte', 'Cumplimiento', 'Gerente', NULL, 'augarte@iconsanet.com', NULL, 'Activo', '2026-03-06 13:40:54.148782+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('7b05ce9a-7988-40cc-99ea-6732596e5a21', NULL, 'CAL204', 'Miguel Calderón', 'Administración', 'Comprador', NULL, 'compras1@iconsanet.com', NULL, 'Activo', '2026-03-06 13:40:54.148782+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('7cfeeb09-3112-46cf-abc3-cf0a21716bce', NULL, 'TOR424', 'Jorge Torres', 'Administración', 'Oficial de Informática', NULL, 'jtorres@iconsanet.com', NULL, 'Activo', '2026-03-06 13:40:54.148782+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('81b56b52-3091-429f-8503-99c71941468c', NULL, 'DEL893', 'Astrid De La Guardia', 'Gerencia', 'Proyectos Especiales', NULL, 'adelaguardia@iconsanet.com', NULL, 'Activo', '2026-03-06 13:40:54.148782+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-15 21:55:53.737629+00', false),
	('ab84b57b-c188-4401-9f8b-797315b628ea', NULL, 'RU1681', 'Deivis Alberto Ruiz', NULL, NULL, NULL, NULL, NULL, 'Activo', '2026-03-03 18:14:23.412153+00', 'San Miguelito', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-06 13:40:27.451488+00', false);


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: cost_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."cost_categories" ("id", "code", "description", "is_active", "created_at", "updated_at") VALUES
	('4202f30d-ff7a-42ff-bb38-76df19cdd90b', 'MAT', 'Materiales', true, '2026-03-06 19:50:15.125331+00', '2026-03-06 19:50:15.125331+00'),
	('78361e9e-be29-46e9-b04a-879040255ddf', 'SAL', 'Salarios', true, '2026-03-06 19:50:15.125331+00', '2026-03-06 19:50:15.125331+00'),
	('d6c1e04a-4360-403c-9f1c-144d8d9b37e1', 'OTR', 'Otros', true, '2026-03-06 19:50:15.125331+00', '2026-03-06 19:50:15.125331+00'),
	('c0a82436-914b-45e9-8d4f-f0fd499a2661', 'CON', 'Consumibles', true, '2026-03-06 19:50:15.125331+00', '2026-03-06 19:50:15.125331+00'),
	('119841f7-0427-4c71-ae6d-0c48b94ca383', 'EQA', 'Alquiler Equipo', true, '2026-03-06 19:50:15.125331+00', '2026-03-06 19:50:15.125331+00'),
	('71857524-bc6d-4a5d-8c5f-834546caf2c1', 'EQI', 'Uso de equipos', true, '2026-03-06 19:50:15.125331+00', '2026-03-06 19:50:15.125331+00'),
	('03422484-5964-4cc6-8b1c-cc09aeead777', 'ICS', 'Sub ICONSA', true, '2026-03-06 19:50:15.125331+00', '2026-03-06 19:50:15.125331+00'),
	('ba45f259-c180-42a5-9cea-7ae3d5560a79', 'SUB', 'Subcontratista', true, '2026-03-06 19:50:15.125331+00', '2026-03-06 19:50:15.125331+00');


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."projects" ("id", "code", "name", "manager", "status", "created_at", "location", "updated_at", "start_date", "end_date", "notes", "billing_code", "budget", "client") VALUES
	('0b01a7a4-752d-43ac-b719-3fc61a13419a', '25-505', 'Paraiso', 'Cesar Caballero', 'Activo', '2026-03-03 14:13:37.193382+00', NULL, '2026-03-03 19:26:20.644288+00', NULL, NULL, NULL, NULL, NULL, NULL),
	('6743665e-4c7c-4604-8cd0-c54167dfe921', '25-506', 'Muelle 14', 'Franklin Marciaga', 'Activo', '2026-03-03 14:13:37.193382+00', NULL, '2026-03-03 19:26:20.644288+00', NULL, NULL, NULL, NULL, NULL, NULL),
	('c41f7384-a000-4753-8283-87223ced9d64', '24-404', 'Costa Norte', 'Cesar Caballero', 'Activo', '2026-03-03 14:13:37.193382+00', NULL, '2026-03-03 19:26:20.644288+00', NULL, NULL, NULL, NULL, NULL, NULL),
	('c35ab299-e141-4ddf-8a33-d06dc6d961c6', '26-604', 'Inyecciones Metro', NULL, 'Activo', '2026-03-06 20:14:02.556546+00', NULL, '2026-03-06 20:14:02.556546+00', NULL, NULL, NULL, NULL, NULL, NULL),
	('c78bf836-4303-402a-8408-6713b1113d6f', '26-605', 'Micropilotes Multiplaza', NULL, 'Activo', '2026-03-06 20:14:02.556546+00', NULL, '2026-03-06 20:14:02.556546+00', NULL, NULL, NULL, NULL, NULL, NULL),
	('e5a51b23-4ff0-436b-b28f-dff15983713f', '25-504', 'Astillero de Balboa (ASTIBAL)', 'Ariel Gonzalez', 'Cerrado', '2026-03-03 14:13:37.193382+00', NULL, '2026-03-06 20:37:04.398378+00', NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: project_extras; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."project_extras" ("id", "project_id", "code", "description", "is_active", "notes", "created_at", "updated_at") VALUES
	('f695a306-ca9b-4a15-ab07-e5875491218a', 'c41f7384-a000-4753-8283-87223ced9d64', 'E1', 'Camino de acceso e infraestructura', true, NULL, '2026-03-10 17:19:00.21451+00', '2026-03-10 17:19:00.21451+00'),
	('d780bb17-75ef-4503-95ae-6741f8157348', 'c41f7384-a000-4753-8283-87223ced9d64', 'E2', 'Edificio Principal', true, NULL, '2026-03-10 17:19:00.21451+00', '2026-03-10 17:19:00.21451+00'),
	('f1c98987-7363-43a5-b87b-844e648cd515', 'c41f7384-a000-4753-8283-87223ced9d64', 'E3', 'Muelles Flotantes', true, NULL, '2026-03-10 17:19:00.21451+00', '2026-03-10 17:19:00.21451+00'),
	('c3d39383-3331-43cf-91de-098b23206625', 'c41f7384-a000-4753-8283-87223ced9d64', 'E4', 'Tanque de combustible', true, NULL, '2026-03-10 17:19:00.21451+00', '2026-03-10 17:19:00.21451+00'),
	('143a17ff-9774-4d23-89e7-2f261c2c41c5', 'c41f7384-a000-4753-8283-87223ced9d64', 'E5', 'Trabajos electricos', true, NULL, '2026-03-10 17:19:00.21451+00', '2026-03-10 17:19:00.21451+00'),
	('0d940c16-3356-467a-9de9-ab63329af8ad', 'c41f7384-a000-4753-8283-87223ced9d64', 'E6', 'Trabajos mecanicos', true, NULL, '2026-03-10 17:19:00.21451+00', '2026-03-10 17:19:00.21451+00'),
	('0c3655d0-c6f6-4c5f-ad96-d50564f0f1f6', '0b01a7a4-752d-43ac-b719-3fc61a13419a', 'E1', 'Pilotes De Acero De 24', true, NULL, '2026-03-10 17:19:00.21451+00', '2026-03-10 17:19:00.21451+00'),
	('7e3c671f-8a04-40d9-96f1-94e76f81cca9', '0b01a7a4-752d-43ac-b719-3fc61a13419a', 'E2', 'Suministro De Flotadores', true, NULL, '2026-03-10 17:19:00.21451+00', '2026-03-10 17:19:00.21451+00'),
	('1e6b71f4-94e0-4349-9387-e16ffafe8ac6', '0b01a7a4-752d-43ac-b719-3fc61a13419a', 'E3', 'Estructuras Fijas Acceso', true, NULL, '2026-03-10 17:19:00.21451+00', '2026-03-10 17:19:00.21451+00'),
	('59400c94-89d8-49e5-a114-f189caf9819b', '0b01a7a4-752d-43ac-b719-3fc61a13419a', 'E4', 'Estructura Para Rampas', true, NULL, '2026-03-10 17:19:00.21451+00', '2026-03-10 17:19:00.21451+00'),
	('75858634-edf0-4baf-8c5c-d917913f5b2a', '0b01a7a4-752d-43ac-b719-3fc61a13419a', 'E5', 'Trabajos Electricos', true, NULL, '2026-03-10 17:19:00.21451+00', '2026-03-10 17:19:00.21451+00'),
	('1a396b7b-85b4-41db-99a5-6260aa67e6f6', '0b01a7a4-752d-43ac-b719-3fc61a13419a', 'E6', 'Reparacion pintura flotadores', true, NULL, '2026-03-10 17:19:00.21451+00', '2026-03-10 17:19:00.21451+00');


--
-- Data for Name: cost_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."cost_codes" ("id", "project_id", "phase_code", "phase_description", "full_code", "created_at", "updated_at", "extra_id") VALUES
	('57528ffd-4d6b-43d5-ad5d-954f0d465aa3', 'c41f7384-a000-4753-8283-87223ced9d64', '01-3100', 'Gestion de proyectos', '24-404-01-3100', '2026-03-13 19:17:28.640776+00', '2026-03-13 19:17:28.640776+00', NULL),
	('fcc76661-d8b7-42b7-9b6d-756356972c6a', 'c41f7384-a000-4753-8283-87223ced9d64', '01-3118', 'Servicios de ingenieria', '24-404-01-3118', '2026-03-13 19:17:28.640776+00', '2026-03-13 19:17:28.640776+00', NULL),
	('9b980af2-28a7-4b45-ae3f-5865f8e682a2', 'c41f7384-a000-4753-8283-87223ced9d64', '01-3526', 'Seguridad Ocupacional-Amb', '24-404-01-3526', '2026-03-13 19:17:28.640776+00', '2026-03-13 19:17:28.640776+00', NULL),
	('995491ff-1dbc-4025-a891-77e997e8a4ef', 'c41f7384-a000-4753-8283-87223ced9d64', '01-4500', 'Control de calidad', '24-404-01-4500', '2026-03-13 19:17:28.640776+00', '2026-03-13 19:17:28.640776+00', NULL),
	('a731c29f-7818-48d5-a370-4dbf3542af39', 'c41f7384-a000-4753-8283-87223ced9d64', '01-5200', 'Campamento', '24-404-01-5200', '2026-03-13 19:17:28.640776+00', '2026-03-13 19:17:28.640776+00', NULL),
	('0a651cc4-062c-49f1-947a-cf05e6e9c72b', 'c41f7384-a000-4753-8283-87223ced9d64', '01-7113', 'Movilizacion', '24-404-01-7113', '2026-03-13 19:17:28.640776+00', '2026-03-13 19:17:28.640776+00', NULL),
	('50580624-16b2-4204-a000-fafec2be0459', 'c41f7384-a000-4753-8283-87223ced9d64', '01-7123', 'Agrimensura', '24-404-01-7123', '2026-03-13 19:17:28.640776+00', '2026-03-13 19:17:28.640776+00', NULL),
	('e135e03a-a270-4002-bc9a-f80d5371a4d2', 'c41f7384-a000-4753-8283-87223ced9d64', '01-7423', 'Limpieza final', '24-404-01-7423', '2026-03-13 19:17:28.640776+00', '2026-03-13 19:17:28.640776+00', NULL),
	('85fbddfc-d741-44ed-9b06-7efc1c385279', 'c41f7384-a000-4753-8283-87223ced9d64', '01-7833', 'Fianzas', '24-404-01-7833', '2026-03-13 19:17:28.640776+00', '2026-03-13 19:17:28.640776+00', NULL),
	('3f2ef526-981e-4b4d-bf95-c2fcb73595de', 'c41f7384-a000-4753-8283-87223ced9d64', '01-7834', 'Seguros', '24-404-01-7834', '2026-03-13 19:17:28.640776+00', '2026-03-13 19:17:28.640776+00', NULL),
	('e0a37014-92ef-49d5-a8af-fc4d1eebf09f', 'c41f7384-a000-4753-8283-87223ced9d64', '02-3213', 'Estudios geotecnicos', '24-404-02-3213', '2026-03-13 19:17:28.640776+00', '2026-03-13 19:17:28.640776+00', NULL),
	('f12aa0f8-b26b-49d0-911a-64718af282ee', 'c41f7384-a000-4753-8283-87223ced9d64', '08-1100', 'Puerta y marco metalicos', '24-404-E2-08-1100', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'd780bb17-75ef-4503-95ae-6741f8157348'),
	('21a7be09-677b-482f-9c8b-184606f6b9c6', 'c41f7384-a000-4753-8283-87223ced9d64', '08-5100', 'Ventanas de metal', '24-404-E2-08-5100', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'd780bb17-75ef-4503-95ae-6741f8157348'),
	('d344bd4e-e159-42c6-9422-d0286c604151', 'c41f7384-a000-4753-8283-87223ced9d64', '09-3000', 'Colocacion de azulejos', '24-404-E2-09-3000', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'd780bb17-75ef-4503-95ae-6741f8157348'),
	('d198e4b0-7085-4eec-960b-8c3b579d477d', 'c41f7384-a000-4753-8283-87223ced9d64', '09-5000', 'Cielorrasos', '24-404-E2-09-5000', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'd780bb17-75ef-4503-95ae-6741f8157348'),
	('2d059d52-0c8c-4945-b510-40490e8a66b3', 'c41f7384-a000-4753-8283-87223ced9d64', '09-9100', 'Pintura general', '24-404-E2-09-9100', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'd780bb17-75ef-4503-95ae-6741f8157348'),
	('be82e05e-3091-4f84-9375-345bef69df24', 'c41f7384-a000-4753-8283-87223ced9d64', '12-5100', 'Mobiliario de oficina', '24-404-E2-12-5100', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'd780bb17-75ef-4503-95ae-6741f8157348'),
	('10158037-b0d6-4f2a-a588-5f0c71a0709d', 'c41f7384-a000-4753-8283-87223ced9d64', '31-2300', 'Excavacion y relleno', '24-404-E2-31-2300', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'd780bb17-75ef-4503-95ae-6741f8157348'),
	('71b97568-0200-43eb-8209-df6702229521', 'c41f7384-a000-4753-8283-87223ced9d64', '01-5200', 'Campamento', '24-404-E3-01-5200', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'f1c98987-7363-43a5-b87b-844e648cd515'),
	('85104b76-5155-480f-9cc7-a221a83e994a', 'c41f7384-a000-4753-8283-87223ced9d64', '05-5000', 'Fabricaciones Metalicas', '24-404-E3-05-5000', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'f1c98987-7363-43a5-b87b-844e648cd515'),
	('5f2e1f1d-c69a-49b3-85e8-cfe6f0db7d03', 'c41f7384-a000-4753-8283-87223ced9d64', '07-6100', 'Techado de metal laminado', '24-404-E3-07-6100', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'f1c98987-7363-43a5-b87b-844e648cd515'),
	('dedee1df-1135-4fe5-baa8-4a6168fbeed3', 'c41f7384-a000-4753-8283-87223ced9d64', '09-9700', 'Recubrimiento especial', '24-404-E3-09-9700', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'f1c98987-7363-43a5-b87b-844e648cd515'),
	('d6c9c323-9592-4dd6-9682-c50eb25e6bce', 'c41f7384-a000-4753-8283-87223ced9d64', '26-4200', 'Proteccion catodica', '24-404-E3-26-4200', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'f1c98987-7363-43a5-b87b-844e648cd515'),
	('9ce30d48-75b1-4b31-a60c-887cd6e243e5', 'c41f7384-a000-4753-8283-87223ced9d64', '31-6313', 'Pilotes concr colados', '24-404-E3-31-6313', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'f1c98987-7363-43a5-b87b-844e648cd515'),
	('0f49c58e-97cb-41cd-8bf4-5cb73e7d460b', 'c41f7384-a000-4753-8283-87223ced9d64', '35-5113', 'Muelles flotantes', '24-404-E3-35-5113', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'f1c98987-7363-43a5-b87b-844e648cd515'),
	('05e9ef4a-c1fc-444e-b713-b23f9188a94c', 'c41f7384-a000-4753-8283-87223ced9d64', '35-5913', 'Defensas marinas', '24-404-E3-35-5913', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'f1c98987-7363-43a5-b87b-844e648cd515'),
	('bebf996f-521d-4d0d-b9f6-c8056f0728fd', 'c41f7384-a000-4753-8283-87223ced9d64', '35-5933', 'Bolardos marinos', '24-404-E3-35-5933', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'f1c98987-7363-43a5-b87b-844e648cd515'),
	('8bf888c5-eb25-4c8e-85a0-c6d08ca45daf', 'c41f7384-a000-4753-8283-87223ced9d64', '01-3100', 'Gestion de proyectos', '24-404-E4-01-3100', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'c3d39383-3331-43cf-91de-098b23206625'),
	('cf0419d5-5ea3-4c94-8c2f-288de491bb8b', 'c41f7384-a000-4753-8283-87223ced9d64', '01-5200', 'Campamento', '24-404-E4-01-5200', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'c3d39383-3331-43cf-91de-098b23206625'),
	('90a0ed9e-2910-43ce-bbe8-090ced2416f3', 'c41f7384-a000-4753-8283-87223ced9d64', '03-4719', 'Estructura concr en sitio', '24-404-E4-03-4719', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'c3d39383-3331-43cf-91de-098b23206625'),
	('172f37e0-55c4-46e2-8346-dba748952a32', 'c41f7384-a000-4753-8283-87223ced9d64', '05-5300', 'Rejilla metalica grating', '24-404-E4-05-5300', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'c3d39383-3331-43cf-91de-098b23206625'),
	('0dea6755-b74f-4666-a156-248f4f0306d4', 'c41f7384-a000-4753-8283-87223ced9d64', '22-1000', 'Sistema de plomeria', '24-404-E4-22-1000', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'c3d39383-3331-43cf-91de-098b23206625'),
	('51e8858f-792d-491e-9935-c06f5a1ae9ed', 'c41f7384-a000-4753-8283-87223ced9d64', '23-1300', 'Tanque de combustible', '24-404-E4-23-1300', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', 'c3d39383-3331-43cf-91de-098b23206625'),
	('0c5225b0-e6c4-4de4-97c8-24271b2a47a3', 'c41f7384-a000-4753-8283-87223ced9d64', '01-3100', 'Gestion de proyectos', '24-404-E5-01-3100', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', '143a17ff-9774-4d23-89e7-2f261c2c41c5'),
	('e65d01f3-6e41-486e-a389-3e468ac43090', 'c41f7384-a000-4753-8283-87223ced9d64', '26-0500', 'Trabajos electricos', '24-404-E5-26-0500', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', '143a17ff-9774-4d23-89e7-2f261c2c41c5'),
	('66c27899-3422-43e4-a427-3e771610e101', 'c41f7384-a000-4753-8283-87223ced9d64', '26-0610', 'Dist electr media tension', '24-404-E5-26-0610', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', '143a17ff-9774-4d23-89e7-2f261c2c41c5'),
	('84b63eea-4c2b-4590-ac02-8cb11c7c00b1', 'c41f7384-a000-4753-8283-87223ced9d64', '26-0620', 'Dist electr baja tension', '24-404-E5-26-0620', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', '143a17ff-9774-4d23-89e7-2f261c2c41c5'),
	('c1551338-9812-4016-aa0c-9c1d31ac3eca', 'c41f7384-a000-4753-8283-87223ced9d64', '28-0500', 'Sist electr de seguridad', '24-404-E5-28-0500', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', '143a17ff-9774-4d23-89e7-2f261c2c41c5'),
	('c9b8808d-b807-4ede-99ce-7a25d431004a', 'c41f7384-a000-4753-8283-87223ced9d64', '01-5200', 'Campamento', '24-404-E6-01-5200', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', '0d940c16-3356-467a-9de9-ab63329af8ad'),
	('cc60025e-fc67-4f03-a9fd-32601742c5ea', 'c41f7384-a000-4753-8283-87223ced9d64', '21-1100', 'Sist antiincendio agua', '24-404-E6-21-1100', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', '0d940c16-3356-467a-9de9-ab63329af8ad'),
	('1ae6f5d8-d689-4fc0-aa0b-65844b07b11c', 'c41f7384-a000-4753-8283-87223ced9d64', '22-1000', 'Sistema de plomeria', '24-404-E6-22-1000', '2026-03-13 19:22:50.393848+00', '2026-03-13 19:22:50.393848+00', '0d940c16-3356-467a-9de9-ab63329af8ad'),
	('cc8738e4-0988-4f8b-91e8-261b939bd1ea', 'c41f7384-a000-4753-8283-87223ced9d64', '23-7000', 'Equipo HVAC', '24-404-E6-23-7000', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '0d940c16-3356-467a-9de9-ab63329af8ad'),
	('3cf7796b-7bc3-430c-ae16-e8edcb1e2b4d', 'c41f7384-a000-4753-8283-87223ced9d64', '33-3216', 'Bomba de aguas residuales', '24-404-E6-33-3216', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '0d940c16-3356-467a-9de9-ab63329af8ad'),
	('15ad7187-c60b-4f30-8121-1b72632136cc', 'c41f7384-a000-4753-8283-87223ced9d64', '44-4100', 'Sistema de aguas oleosas', '24-404-E6-44-4100', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '0d940c16-3356-467a-9de9-ab63329af8ad'),
	('3fcfdde0-981a-4816-9832-15ea77742424', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-3100', 'Gestion de proyectos', '25-505-01-3100', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', NULL),
	('19690622-fc02-4629-90bd-a3aed9c6ed97', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-3110', 'Personal de campo', '25-505-01-3110', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', NULL),
	('3dd5a996-f4b8-4e8e-b7ca-797eb4ac9ed0', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-3118', 'Servicios de ingenieria', '25-505-01-3118', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', NULL),
	('ba174105-bd43-4a9f-8c4f-a28e057648d6', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-3526', 'Seguridad Ocupacional-Amb', '25-505-01-3526', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', NULL),
	('e7c26408-c400-466b-bd04-55da4daf253f', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-5100', 'Servicios temporales', '25-505-01-5100', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', NULL),
	('e5f75070-f80b-4085-b314-8340ce6d2203', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-5200', 'Campamento', '25-505-01-5200', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', NULL),
	('81fa0d91-cf68-469c-8b0c-2a8eb698d71a', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-7113', 'Movilizacion', '25-505-01-7113', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', NULL),
	('ddeb5c71-42f2-433e-a2f8-821dc6d99c9f', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-7123', 'Agrimensura', '25-505-01-7123', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', NULL),
	('702ff176-eec5-4fed-a579-33a73cce05ba', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-7833', 'Fianzas', '25-505-01-7833', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', NULL),
	('4dc5ce03-645b-4c75-8cc9-560d7b33ab40', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-7113', 'Movilizacion', '25-505-E1-01-7113', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '0c3655d0-c6f6-4c5f-ad96-d50564f0f1f6'),
	('a2124dda-2ed9-41af-b04e-7b58a17e57ae', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '31-6313', 'Pilotes concr colados', '25-505-E1-31-6313', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '0c3655d0-c6f6-4c5f-ad96-d50564f0f1f6'),
	('78f0a213-4b29-455e-a871-277e0a19f767', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-2116', 'Contingencias', '25-505-E2-01-2116', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '7e3c671f-8a04-40d9-96f1-94e76f81cca9'),
	('c51a5e5d-d9cd-439a-9a94-d85e72d649e3', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-5234', 'Medios auxiliares', '25-505-E2-01-5234', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '7e3c671f-8a04-40d9-96f1-94e76f81cca9'),
	('3fbd37f8-629f-4f62-81ae-573e34737e8b', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-5323', 'Acceso temporal/MOF', '25-505-E2-01-5323', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '7e3c671f-8a04-40d9-96f1-94e76f81cca9'),
	('b5b9245d-591e-4728-a3d9-5e57df96f896', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-7113', 'Movilizacion', '25-505-E2-01-7113', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '7e3c671f-8a04-40d9-96f1-94e76f81cca9'),
	('418fd393-9ea1-4642-b7c2-b6df7dd703a8', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '02-4116', 'Demolicion de estructuras', '25-505-E2-02-4116', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '7e3c671f-8a04-40d9-96f1-94e76f81cca9'),
	('ec4c891a-eb17-4e0a-a245-88f654c6553b', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '03-4719', 'Estructura concr en sitio', '25-505-E2-03-4719', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '7e3c671f-8a04-40d9-96f1-94e76f81cca9'),
	('d900dd0f-57f4-419e-a46a-f82d376e216d', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '05-1200', 'Estructuras de acero', '25-505-E2-05-1200', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '7e3c671f-8a04-40d9-96f1-94e76f81cca9'),
	('d4f5671a-905e-4db8-96d3-5df699e2db2a', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '05-5701', 'Pernos de anclaje y plato', '25-505-E2-05-5701', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '7e3c671f-8a04-40d9-96f1-94e76f81cca9'),
	('5876ffa2-00e1-4d3a-a319-884fa8c2eec1', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '35-5113', 'Muelles flotantes', '25-505-E2-35-5113', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '7e3c671f-8a04-40d9-96f1-94e76f81cca9'),
	('1af4244a-35c9-436a-9dde-65c30165f66a', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '35-5913', 'Defensas marinas', '25-505-E2-35-5913', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '7e3c671f-8a04-40d9-96f1-94e76f81cca9'),
	('a0605bed-038e-4d4f-925e-ff6aea32543e', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-5200', 'Campamento', '25-505-E3-01-5200', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '1e6b71f4-94e0-4349-9387-e16ffafe8ac6'),
	('f01f9d09-007b-4755-a826-268bbe3880f0', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-7113', 'Movilizacion', '25-505-E3-01-7113', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '1e6b71f4-94e0-4349-9387-e16ffafe8ac6'),
	('d5d8db1a-e996-4dc7-a634-28f334baa279', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '02-4116', 'Demolicion de estructuras', '25-505-E3-02-4116', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '1e6b71f4-94e0-4349-9387-e16ffafe8ac6'),
	('e496593f-2e7c-4824-9886-ec901398fdf7', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '03-4719', 'Estructura concr en sitio', '25-505-E3-03-4719', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '1e6b71f4-94e0-4349-9387-e16ffafe8ac6'),
	('0dadc5c4-40b1-48e1-8daa-1aa0b8f0aca6', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '05-1200', 'Estructuras de acero', '25-505-E3-05-1200', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '1e6b71f4-94e0-4349-9387-e16ffafe8ac6'),
	('f0e16d7e-1ea6-481f-a0c2-7e02fbe630bf', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '05-5300', 'Rejilla metalica grating', '25-505-E3-05-5300', '2026-03-13 19:23:04.370107+00', '2026-03-13 19:23:04.370107+00', '1e6b71f4-94e0-4349-9387-e16ffafe8ac6'),
	('0ab71499-856d-478e-b423-246d6e953182', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '05-5701', 'Pernos de anclaje y plato', '25-505-E3-05-5701', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', '1e6b71f4-94e0-4349-9387-e16ffafe8ac6'),
	('db530660-bceb-4f44-901b-2004f565f959', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-7113', 'Movilizacion', '25-505-E4-01-7113', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', '59400c94-89d8-49e5-a114-f189caf9819b'),
	('898dc988-d0f7-4cdf-930c-c82ceb1ec3ef', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '05-1200', 'Estructuras de acero', '25-505-E4-05-1200', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', '59400c94-89d8-49e5-a114-f189caf9819b'),
	('fa31882d-b7d6-434f-a3b0-1025f828285e', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '05-5300', 'Rejilla metalica grating', '25-505-E4-05-5300', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', '59400c94-89d8-49e5-a114-f189caf9819b'),
	('224d96dd-3cba-48ea-98e0-b2599f5f8452', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '01-7113', 'Movilizacion', '25-505-E5-01-7113', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', '75858634-edf0-4baf-8c5c-d917913f5b2a'),
	('525a9424-6d7e-47de-9a2a-700953f6e5c1', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '02-4116', 'Demolicion de estructuras', '25-505-E5-02-4116', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', '75858634-edf0-4baf-8c5c-d917913f5b2a'),
	('1e017d44-538e-4dd0-98d9-c20e4b3521fb', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '23-1300', 'Tanque de combustible', '25-505-E5-23-1300', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', '75858634-edf0-4baf-8c5c-d917913f5b2a'),
	('8a434e49-9fc6-48ea-b2e0-a839ed627d4e', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '26-0500', 'Trabajos electricos', '25-505-E5-26-0500', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', '75858634-edf0-4baf-8c5c-d917913f5b2a'),
	('0a87f87e-0387-426a-8ee4-8a7c351496a3', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '09-9700', 'Recubrimiento especial', '25-505-E6-09-9700', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', '1a396b7b-85b4-41db-99a5-6260aa67e6f6'),
	('f2d36d38-525f-4896-8ce5-f9dabd7ef313', '6743665e-4c7c-4604-8cd0-c54167dfe921', '01-2116', 'Contingencias', '25-506-01-2116', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('0e35722e-8321-4daa-b1c3-31a66cc5062a', '6743665e-4c7c-4604-8cd0-c54167dfe921', '01-3100', 'Gestion de proyectos', '25-506-01-3100', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('9a0416ad-e525-4a71-99fd-f128915ea9fa', '6743665e-4c7c-4604-8cd0-c54167dfe921', '01-3118', 'Servicios de ingenieria', '25-506-01-3118', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('5c1fc7ba-2d58-44a4-ae99-f0fb92fb6919', '6743665e-4c7c-4604-8cd0-c54167dfe921', '01-3526', 'Seguridad Ocupacional-Amb', '25-506-01-3526', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('129474c2-88b6-4055-b31d-bb1b19e4cff3', '6743665e-4c7c-4604-8cd0-c54167dfe921', '01-5200', 'Campamento', '25-506-01-5200', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('bddebcbc-a1a4-4c48-8662-3d43d06c3471', '6743665e-4c7c-4604-8cd0-c54167dfe921', '01-7113', 'Movilizacion', '25-506-01-7113', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('ca8fce20-39de-4f3f-ae59-b11885421fdb', '6743665e-4c7c-4604-8cd0-c54167dfe921', '01-7123', 'Agrimensura', '25-506-01-7123', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('e92be4b1-7611-443d-a715-3c2d5a4d293c', '6743665e-4c7c-4604-8cd0-c54167dfe921', '01-7423', 'Limpieza final', '25-506-01-7423', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('6d55ea8b-dcea-4a94-aa8a-91b7dab99653', '6743665e-4c7c-4604-8cd0-c54167dfe921', '01-7833', 'Fianzas', '25-506-01-7833', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('5edbb4f5-2486-498a-9c3f-40b0e8888863', '6743665e-4c7c-4604-8cd0-c54167dfe921', '01-7834', 'Seguros', '25-506-01-7834', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('592ef8be-e2d8-4b97-ac20-6bb5b9611054', '6743665e-4c7c-4604-8cd0-c54167dfe921', '02-4116', 'Demolicion de estructuras', '25-506-02-4116', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('285f3c07-0e8c-47a2-8a11-424886384664', '6743665e-4c7c-4604-8cd0-c54167dfe921', '03-0000', 'Concreto', '25-506-03-0000', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('5c58d42a-f1e7-4896-bcc2-a23f9ad3ac6a', '6743665e-4c7c-4604-8cd0-c54167dfe921', '03-0130', 'Rehab de concreto', '25-506-03-0130', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('fc5e4250-d1d2-4711-a8b5-a84da355acff', '6743665e-4c7c-4604-8cd0-c54167dfe921', '03-4540', 'Barrera concreto prefab', '25-506-03-4540', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('615cab93-7f26-40b9-9595-2d7c53ba271b', '6743665e-4c7c-4604-8cd0-c54167dfe921', '05-5000', 'Fabricaciones Metalicas', '25-506-05-5000', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('fefbe032-906b-4eb4-b2fa-9eb368231c4b', '6743665e-4c7c-4604-8cd0-c54167dfe921', '26-0500', 'Trabajos electricos', '25-506-26-0500', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('f05de040-7ca3-4763-867c-ce68ad4fcb90', '6743665e-4c7c-4604-8cd0-c54167dfe921', '31-3500', 'Proteccion de taludes', '25-506-31-3500', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('10521db6-2018-4542-a69b-cc8184b76408', '6743665e-4c7c-4604-8cd0-c54167dfe921', '31-6313', 'Pilotes concr colados', '25-506-31-6313', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('12b95415-12ef-4627-9884-ea5957de7810', '6743665e-4c7c-4604-8cd0-c54167dfe921', '32-1313', 'Pavimentacion de concreto', '25-506-32-1313', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('01020001-e75a-4ecb-8f07-743669f4c40d', '6743665e-4c7c-4604-8cd0-c54167dfe921', '32-1723', 'Senalizacion de pavimento', '25-506-32-1723', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('14af16e7-c65b-4f48-8519-c8a66f994b3b', '6743665e-4c7c-4604-8cd0-c54167dfe921', '32-9200', 'Cesped y pasto', '25-506-32-9200', '2026-03-13 19:23:15.272219+00', '2026-03-13 19:23:15.272219+00', NULL),
	('26eb4199-2600-4fe4-9345-07f33c552cc4', '6743665e-4c7c-4604-8cd0-c54167dfe921', '33-1411', 'Tuberias de dist de agua', '25-506-33-1411', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('bf3c287e-4a66-45bd-b946-2944f5004e42', '6743665e-4c7c-4604-8cd0-c54167dfe921', '33-4200', 'Drenajes de agua pluvial', '25-506-33-4200', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('fe389499-231e-4ee7-8a70-1bfa410901ef', '6743665e-4c7c-4604-8cd0-c54167dfe921', '33-4623', 'Sist. atenuacion crecida', '25-506-33-4623', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('7eae30c3-2fa0-4bd1-94e4-112b220d70f2', 'c35ab299-e141-4ddf-8a33-d06dc6d961c6', '01-3100', 'Gestion de proyectos', '26-604-01-3100', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('e5f37f81-57b0-434a-9bb7-e75e49799be3', 'c35ab299-e141-4ddf-8a33-d06dc6d961c6', '01-3118', 'Servicios de ingenieria', '26-604-01-3118', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('2432057e-558e-420d-9643-422e097abd71', 'c35ab299-e141-4ddf-8a33-d06dc6d961c6', '01-3526', 'Seguridad Ocupacional-Amb', '26-604-01-3526', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('3ec0fe21-89fb-40e6-a967-4ce054df0166', 'c35ab299-e141-4ddf-8a33-d06dc6d961c6', '01-5200', 'Campamento', '26-604-01-5200', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('cf755d12-c463-4b78-97c8-0ce4d51a75bd', 'c35ab299-e141-4ddf-8a33-d06dc6d961c6', '01-7113', 'Movilizacion', '26-604-01-7113', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('0f7bc805-0279-43ea-98ed-ef32ce09656b', 'c35ab299-e141-4ddf-8a33-d06dc6d961c6', '03-0130', 'Rehab de concreto', '26-604-03-0130', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('c1309b79-25b0-4be4-ac8d-d873ef6be102', 'c35ab299-e141-4ddf-8a33-d06dc6d961c6', '03-6300', 'Inyeccion epoxica', '26-604-03-6300', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('4e1afad2-7b5f-4949-997b-2a0e2e771ce7', 'c78bf836-4303-402a-8408-6713b1113d6f', '01-3100', 'Gestion de proyectos', '26-605-01-3100', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('0243f02d-7abd-4e9e-bb20-67cfd4f716f1', 'c78bf836-4303-402a-8408-6713b1113d6f', '01-3118', 'Servicios de ingenieria', '26-605-01-3118', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('c00783f6-2457-40c1-995c-4b074c82b986', 'c78bf836-4303-402a-8408-6713b1113d6f', '01-3526', 'Seguridad Ocupacional-Amb', '26-605-01-3526', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('14544436-ef17-459f-9d9a-592b1fc101a2', 'c78bf836-4303-402a-8408-6713b1113d6f', '01-4500', 'Control de calidad', '26-605-01-4500', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('f6fdb489-5678-43c1-87ed-a4b7c14d0011', 'c78bf836-4303-402a-8408-6713b1113d6f', '01-5200', 'Campamento', '26-605-01-5200', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('881f2b69-79e2-41e2-b117-8c5f092e6cdb', 'c78bf836-4303-402a-8408-6713b1113d6f', '01-7113', 'Movilizacion', '26-605-01-7113', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('6d67ea64-9861-4af4-a0ab-4e67ccd0d505', 'c78bf836-4303-402a-8408-6713b1113d6f', '03-8200', 'Perforacion de concreto', '26-605-03-8200', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('a88204c6-6ff8-4325-84fe-6b834aff7618', 'c78bf836-4303-402a-8408-6713b1113d6f', '31-6333', 'Micropilotes', '26-605-31-6333', '2026-03-13 19:23:28.462789+00', '2026-03-13 19:23:28.462789+00', NULL),
	('6c9a03fd-0719-44cf-a3e9-e0516402e932', 'c41f7384-a000-4753-8283-87223ced9d64', '01-3100', 'Gestion de proyectos', '24-404-E1-01-3100', '2026-03-13 19:37:14.178664+00', '2026-03-13 19:37:14.178664+00', 'f695a306-ca9b-4a15-ab07-e5875491218a'),
	('514234d0-0ec5-44ba-84f4-f6c0e2826806', 'c41f7384-a000-4753-8283-87223ced9d64', '01-5200', 'Campamento', '24-404-E1-01-5200', '2026-03-13 19:37:14.178664+00', '2026-03-13 19:37:14.178664+00', 'f695a306-ca9b-4a15-ab07-e5875491218a'),
	('8771334c-5019-44ce-9f01-5cb53de749ec', 'c41f7384-a000-4753-8283-87223ced9d64', '02-4116', 'Demolicion de estructuras', '24-404-E1-02-4116', '2026-03-13 19:37:14.178664+00', '2026-03-13 19:37:14.178664+00', 'f695a306-ca9b-4a15-ab07-e5875491218a'),
	('1c1be2ab-5544-4193-ab87-2f4649796172', 'c41f7384-a000-4753-8283-87223ced9d64', '03-3050', 'Concreto 4K-6K', '24-404-E1-03-3050', '2026-03-13 19:37:14.178664+00', '2026-03-13 19:37:14.178664+00', 'f695a306-ca9b-4a15-ab07-e5875491218a'),
	('221c996e-bcf0-4b38-bcbe-6f2920750128', 'c41f7384-a000-4753-8283-87223ced9d64', '10-1453', 'Senales de trafico', '24-404-E1-10-1453', '2026-03-13 19:37:14.178664+00', '2026-03-13 19:37:14.178664+00', 'f695a306-ca9b-4a15-ab07-e5875491218a'),
	('c82baa0f-525f-43d8-99e7-e75a83ae579e', 'c41f7384-a000-4753-8283-87223ced9d64', '31-1100', 'Desbroce y desmonte', '24-404-E1-31-1100', '2026-03-13 19:37:14.178664+00', '2026-03-13 19:37:14.178664+00', 'f695a306-ca9b-4a15-ab07-e5875491218a'),
	('5aa10828-cac9-4788-a75e-ff1414283102', 'c41f7384-a000-4753-8283-87223ced9d64', '31-2300', 'Excavacion y relleno', '24-404-E1-31-2300', '2026-03-13 19:37:14.178664+00', '2026-03-13 19:37:14.178664+00', 'f695a306-ca9b-4a15-ab07-e5875491218a'),
	('13a56082-0cfe-4a14-ba95-23712c2a0d83', 'c41f7384-a000-4753-8283-87223ced9d64', '31-2500', 'Control de erosion', '24-404-E1-31-2500', '2026-03-13 19:37:14.178664+00', '2026-03-13 19:37:14.178664+00', 'f695a306-ca9b-4a15-ab07-e5875491218a'),
	('1285919b-d064-4c96-b8aa-354dfa3f3e89', 'c41f7384-a000-4753-8283-87223ced9d64', '32-1216', 'Pavimentacion asfaltica', '24-404-E1-32-1216', '2026-03-13 19:37:14.178664+00', '2026-03-13 19:37:14.178664+00', 'f695a306-ca9b-4a15-ab07-e5875491218a'),
	('56c9d72d-5b8f-4aab-9113-f60fa8b500b0', 'c41f7384-a000-4753-8283-87223ced9d64', '32-1313', 'Pavimentacion de concreto', '24-404-E1-32-1313', '2026-03-13 19:37:14.178664+00', '2026-03-13 19:37:14.178664+00', 'f695a306-ca9b-4a15-ab07-e5875491218a'),
	('3550f73f-992b-4291-b080-79030f2388b3', 'c41f7384-a000-4753-8283-87223ced9d64', '32-3113', 'Cercas de alambre ciclon', '24-404-E1-32-3113', '2026-03-13 19:37:14.178664+00', '2026-03-13 19:37:14.178664+00', 'f695a306-ca9b-4a15-ab07-e5875491218a'),
	('57e406bb-e316-4223-945b-dd8ef6e12101', 'c41f7384-a000-4753-8283-87223ced9d64', '32-9200', 'Cesped y pasto', '24-404-E1-32-9200', '2026-03-13 19:37:14.178664+00', '2026-03-13 19:37:14.178664+00', 'f695a306-ca9b-4a15-ab07-e5875491218a'),
	('5d04c2f3-f9ab-475a-9a4e-b5772ce7d6d2', 'c41f7384-a000-4753-8283-87223ced9d64', '33-4200', 'Drenajes de agua pluvial', '24-404-E1-33-4200', '2026-03-13 19:37:14.178664+00', '2026-03-13 19:37:14.178664+00', 'f695a306-ca9b-4a15-ab07-e5875491218a'),
	('b6dadbca-aa4c-4ac6-bbde-6584178b4736', 'c41f7384-a000-4753-8283-87223ced9d64', '01-3100', 'Gestion de proyectos', '24-404-E2-01-3100', '2026-03-13 19:37:37.061585+00', '2026-03-13 19:37:37.061585+00', 'd780bb17-75ef-4503-95ae-6741f8157348'),
	('cbdc76d2-cf85-4cfa-8301-32565957df0f', 'c41f7384-a000-4753-8283-87223ced9d64', '01-3526', 'Seguridad Ocupacional-Amb', '24-404-E2-01-3526', '2026-03-13 19:37:37.061585+00', '2026-03-13 19:37:37.061585+00', 'd780bb17-75ef-4503-95ae-6741f8157348'),
	('fba70339-6d27-470e-9543-657e3e5b0e4c', 'c41f7384-a000-4753-8283-87223ced9d64', '03-4719', 'Estructura concr en sitio', '24-404-E2-03-4719', '2026-03-13 19:37:37.061585+00', '2026-03-13 19:37:37.061585+00', 'd780bb17-75ef-4503-95ae-6741f8157348'),
	('89734220-bfff-4b18-846a-ba5e11428c98', 'c41f7384-a000-4753-8283-87223ced9d64', '04-2200', 'Mamposteria bloques concr', '24-404-E2-04-2200', '2026-03-13 19:37:37.061585+00', '2026-03-13 19:37:37.061585+00', 'd780bb17-75ef-4503-95ae-6741f8157348'),
	('d2065eeb-6e36-4066-b40a-960637142cf1', 'c41f7384-a000-4753-8283-87223ced9d64', '05-5000', 'Fabricaciones Metalicas', '24-404-E2-05-5000', '2026-03-13 19:37:37.061585+00', '2026-03-13 19:37:37.061585+00', 'd780bb17-75ef-4503-95ae-6741f8157348'),
	('acfd2978-8b22-4db3-84ad-a7c715d4a0cb', 'c41f7384-a000-4753-8283-87223ced9d64', '07-6100', 'Techado de metal laminado', '24-404-E2-07-6100', '2026-03-13 19:37:37.061585+00', '2026-03-13 19:37:37.061585+00', 'd780bb17-75ef-4503-95ae-6741f8157348');


--
-- Data for Name: cost_code_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."cost_code_categories" ("id", "cost_code_id", "cost_category_id", "created_at") VALUES
	('e685e1f6-5806-4a6a-983c-f3f9836bcd7f', '57528ffd-4d6b-43d5-ad5d-954f0d465aa3', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:17:28.640776+00'),
	('806aa7f7-4201-45d6-9948-5739d112af96', '57528ffd-4d6b-43d5-ad5d-954f0d465aa3', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:17:28.640776+00'),
	('52606d45-f31b-4bb2-8d76-e47a61a3e8ac', '57528ffd-4d6b-43d5-ad5d-954f0d465aa3', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:17:28.640776+00'),
	('a06f61cc-62f9-4dce-b9a4-93f56469efff', '57528ffd-4d6b-43d5-ad5d-954f0d465aa3', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:17:28.640776+00'),
	('632d9869-902b-4193-b09d-8e5fed54e046', '57528ffd-4d6b-43d5-ad5d-954f0d465aa3', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:17:28.640776+00'),
	('a2fa4339-9dbd-49dc-8d8f-63834fc9723f', '57528ffd-4d6b-43d5-ad5d-954f0d465aa3', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:17:28.640776+00'),
	('71eef8de-319a-4ccf-8b98-4ef03b0245d8', 'fcc76661-d8b7-42b7-9b6d-756356972c6a', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:17:28.640776+00'),
	('a3bd3b90-48dc-4a93-b9db-8c8574d52fc7', 'fcc76661-d8b7-42b7-9b6d-756356972c6a', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:17:28.640776+00'),
	('c59c8604-1c57-4c4c-83d4-524e547d7696', 'fcc76661-d8b7-42b7-9b6d-756356972c6a', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:17:28.640776+00'),
	('5f98ca6d-ef1e-418b-ba6d-e21166f8841b', 'fcc76661-d8b7-42b7-9b6d-756356972c6a', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:17:28.640776+00'),
	('0716ebae-ef1c-484a-9de7-06cab4f4c548', 'fcc76661-d8b7-42b7-9b6d-756356972c6a', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:17:28.640776+00'),
	('c604c7ce-4fdd-4d95-98b8-6de5f04b92b4', '9b980af2-28a7-4b45-ae3f-5865f8e682a2', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:17:28.640776+00'),
	('a10710aa-b3c9-4a57-8b90-8092769b11e3', '9b980af2-28a7-4b45-ae3f-5865f8e682a2', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:17:28.640776+00'),
	('a2534970-c569-422f-87b8-30f36040e099', '9b980af2-28a7-4b45-ae3f-5865f8e682a2', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:17:28.640776+00'),
	('fade6bf8-d0fe-4572-959b-2595f4ed3e20', '9b980af2-28a7-4b45-ae3f-5865f8e682a2', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:17:28.640776+00'),
	('5b74f9fa-34f5-4d76-90b1-05f9bdc7c157', '9b980af2-28a7-4b45-ae3f-5865f8e682a2', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:17:28.640776+00'),
	('88a4d6cd-e523-46e7-96c2-58ca283e5b3e', '995491ff-1dbc-4025-a891-77e997e8a4ef', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:17:28.640776+00'),
	('0eacce28-b0fe-4773-9b3a-4c6245642b12', '995491ff-1dbc-4025-a891-77e997e8a4ef', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:17:28.640776+00'),
	('7adb174e-7805-4427-98a3-c61484f8fc3c', '995491ff-1dbc-4025-a891-77e997e8a4ef', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:17:28.640776+00'),
	('9325cf6d-1f12-4b96-aec0-c474a09e26a2', '995491ff-1dbc-4025-a891-77e997e8a4ef', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:17:28.640776+00'),
	('58dfdcb0-2e2e-45ec-8e10-07634bb6f0b4', '995491ff-1dbc-4025-a891-77e997e8a4ef', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:17:28.640776+00'),
	('5e25b017-dea3-4425-b371-404d689a7e02', 'a731c29f-7818-48d5-a370-4dbf3542af39', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:17:28.640776+00'),
	('26d9e997-59dc-434c-8b02-6fbc41e6f290', 'a731c29f-7818-48d5-a370-4dbf3542af39', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:17:28.640776+00'),
	('62eff006-121c-457c-a74e-52aa36b37a5d', 'a731c29f-7818-48d5-a370-4dbf3542af39', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:17:28.640776+00'),
	('16e7ddac-92f8-45ec-ba14-d7b4bb064b9e', 'a731c29f-7818-48d5-a370-4dbf3542af39', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:17:28.640776+00'),
	('d8eddbf8-f2c1-435a-9ef0-d6866be96c71', 'a731c29f-7818-48d5-a370-4dbf3542af39', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:17:28.640776+00'),
	('6c0d9129-afd1-4f75-a4dc-1eb31da52d17', 'a731c29f-7818-48d5-a370-4dbf3542af39', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:17:28.640776+00'),
	('b3ce722e-1d49-413a-869f-66fa45da77b0', 'a731c29f-7818-48d5-a370-4dbf3542af39', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:17:28.640776+00'),
	('fb2099bc-11d0-415f-a1a2-ae0fcfbb97f0', 'a731c29f-7818-48d5-a370-4dbf3542af39', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:17:28.640776+00'),
	('fde855fc-7420-4f1a-887c-e887b69a1656', '0a651cc4-062c-49f1-947a-cf05e6e9c72b', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:17:28.640776+00'),
	('1bdab08d-3be1-477c-b95f-9204439749e2', '0a651cc4-062c-49f1-947a-cf05e6e9c72b', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:17:28.640776+00'),
	('e4f6970d-7b9e-4932-aa52-01f5007badd0', '0a651cc4-062c-49f1-947a-cf05e6e9c72b', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:17:28.640776+00'),
	('1110193e-700b-4310-a902-1820ebd5cec3', '0a651cc4-062c-49f1-947a-cf05e6e9c72b', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:17:28.640776+00'),
	('2bd9c5c6-c377-4742-8459-09edcfe30b8c', '0a651cc4-062c-49f1-947a-cf05e6e9c72b', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:17:28.640776+00'),
	('977a18b9-aece-48e3-9636-0bbd742eb29a', '0a651cc4-062c-49f1-947a-cf05e6e9c72b', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:17:28.640776+00'),
	('0eacd4fb-e6b2-4375-a2e6-c756ddb7c2f6', '50580624-16b2-4204-a000-fafec2be0459', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:17:28.640776+00'),
	('333ca0d9-363f-4e51-b372-963abebf7f74', '50580624-16b2-4204-a000-fafec2be0459', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:17:28.640776+00'),
	('4a1137f1-39c3-4797-886b-fea9c1a6552d', '50580624-16b2-4204-a000-fafec2be0459', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:17:28.640776+00'),
	('7951c040-e04c-4382-ad31-aa79a4350e29', '50580624-16b2-4204-a000-fafec2be0459', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:17:28.640776+00'),
	('5ecb8b7c-475c-4890-9135-9ee3334132cf', '50580624-16b2-4204-a000-fafec2be0459', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:17:28.640776+00'),
	('01d84785-49f7-46c1-8782-4410f23f02b9', '50580624-16b2-4204-a000-fafec2be0459', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:17:28.640776+00'),
	('9a6dfafc-20d1-4171-adba-5e4bbe87be81', 'e135e03a-a270-4002-bc9a-f80d5371a4d2', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:17:28.640776+00'),
	('f3844b11-8afa-43dd-be8d-cdcebd782553', 'e135e03a-a270-4002-bc9a-f80d5371a4d2', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:17:28.640776+00'),
	('094e474b-c5aa-4ac7-b522-b09b23f65474', 'e135e03a-a270-4002-bc9a-f80d5371a4d2', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:17:28.640776+00'),
	('5595fdcb-a7c3-4012-9cc0-3c38075f329f', 'e135e03a-a270-4002-bc9a-f80d5371a4d2', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:17:28.640776+00'),
	('7028361d-6110-45b9-9f14-4f162be17ae6', '85fbddfc-d741-44ed-9b06-7efc1c385279', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:17:28.640776+00'),
	('698e5599-f3e2-425c-9187-55dcbe21ad8d', '3f2ef526-981e-4b4d-bf95-c2fcb73595de', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:17:28.640776+00'),
	('c8efb1bb-ced7-4ec6-948b-02789dbd0cae', 'e0a37014-92ef-49d5-a8af-fc4d1eebf09f', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:17:28.640776+00'),
	('0812f1c7-fb6f-45c4-9cbd-2f50c97830ee', 'e0a37014-92ef-49d5-a8af-fc4d1eebf09f', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:17:28.640776+00'),
	('b840fdf9-e205-4fbc-9723-5bd425dfe0c3', 'e0a37014-92ef-49d5-a8af-fc4d1eebf09f', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:17:28.640776+00'),
	('33e89ab8-18bb-4aae-a35e-6748f119ee28', 'e0a37014-92ef-49d5-a8af-fc4d1eebf09f', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:17:28.640776+00'),
	('88213878-9590-4347-afe7-636f9a1def7f', 'e0a37014-92ef-49d5-a8af-fc4d1eebf09f', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:17:28.640776+00'),
	('ee714632-2d15-48a3-82b6-8200482a95ca', 'e0a37014-92ef-49d5-a8af-fc4d1eebf09f', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:17:28.640776+00'),
	('6caae51c-d95b-4ec7-8637-4e7163e28c6d', 'f12aa0f8-b26b-49d0-911a-64718af282ee', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('11d1fa04-1e30-4bbe-a337-1b0ff353373b', 'f12aa0f8-b26b-49d0-911a-64718af282ee', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('125eae32-2259-42eb-a752-0104590e605c', 'f12aa0f8-b26b-49d0-911a-64718af282ee', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('fa2d1e2d-993e-4f98-8536-b24b96b05e8d', 'f12aa0f8-b26b-49d0-911a-64718af282ee', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('3dceadc0-1d41-4ae3-a693-39a193a340a2', 'f12aa0f8-b26b-49d0-911a-64718af282ee', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('d61a0d49-8974-4d4e-b024-b4b48f412761', 'f12aa0f8-b26b-49d0-911a-64718af282ee', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('d6b63bf8-7150-4161-b6ba-23c36143aa02', 'f12aa0f8-b26b-49d0-911a-64718af282ee', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('e2dc1cc4-2849-4e5b-97e2-cb49837369d7', 'f12aa0f8-b26b-49d0-911a-64718af282ee', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('640c6628-e705-47ba-bae3-46e8673be413', '21a7be09-677b-482f-9c8b-184606f6b9c6', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('7f13995a-a6ec-4632-9652-830891830843', '21a7be09-677b-482f-9c8b-184606f6b9c6', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('8e34d0de-0d10-47c4-bd08-492754cfe9fe', '21a7be09-677b-482f-9c8b-184606f6b9c6', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('7da4b7f8-58d2-44d2-bc04-05f320b285e1', '21a7be09-677b-482f-9c8b-184606f6b9c6', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('8a3cd199-f81a-4f79-8406-27050f518515', '21a7be09-677b-482f-9c8b-184606f6b9c6', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('a704ea97-aeae-4a98-811b-25b514c66467', '21a7be09-677b-482f-9c8b-184606f6b9c6', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('b4559dbd-fb43-4bb4-b8de-9bff6b8a7d0e', '21a7be09-677b-482f-9c8b-184606f6b9c6', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('5b25f8df-db11-4dae-8e57-a1d0ba166683', '21a7be09-677b-482f-9c8b-184606f6b9c6', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('169be351-b580-41b3-95e7-b93e34eb4b15', 'd344bd4e-e159-42c6-9422-d0286c604151', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('a7f59690-d6cb-45f1-aa1c-640aa0aa146a', 'd344bd4e-e159-42c6-9422-d0286c604151', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('015f2d52-f57d-458b-8845-4fe05cc0052d', 'd344bd4e-e159-42c6-9422-d0286c604151', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('4fe468dd-9c17-40bc-88da-1de68cc607a6', 'd344bd4e-e159-42c6-9422-d0286c604151', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('a403cb42-328d-461c-8bad-cdad3753a963', 'd344bd4e-e159-42c6-9422-d0286c604151', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('8898a1ea-dde4-4d58-8510-4bfed92101fc', 'd344bd4e-e159-42c6-9422-d0286c604151', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('2f88c859-e4cb-4f2f-bc66-4ada0b0c8a0b', 'd344bd4e-e159-42c6-9422-d0286c604151', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('54effd5a-d23d-4d28-9787-ad8ab92125e8', 'd344bd4e-e159-42c6-9422-d0286c604151', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('9c041aec-1058-4290-8207-706c1e72c9f8', 'd198e4b0-7085-4eec-960b-8c3b579d477d', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('70c1c473-99a5-4e6c-be85-3c8138331b6a', 'd198e4b0-7085-4eec-960b-8c3b579d477d', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('60712da8-148f-43c7-bbec-01c738ef26f4', 'd198e4b0-7085-4eec-960b-8c3b579d477d', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('85cca50c-4122-4201-91e7-616a2f25df9a', 'd198e4b0-7085-4eec-960b-8c3b579d477d', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('3e849ebd-90d8-46f4-8a88-38c110f02202', 'd198e4b0-7085-4eec-960b-8c3b579d477d', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('e2aa81de-c140-4fa1-9ae5-bf06da3fbdb2', 'd198e4b0-7085-4eec-960b-8c3b579d477d', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('393344cc-0a68-413a-9360-e870a10c94b8', 'd198e4b0-7085-4eec-960b-8c3b579d477d', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('fd60deb1-1eb0-4d0d-86b5-23d040e91adf', 'd198e4b0-7085-4eec-960b-8c3b579d477d', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('46c67643-ac1c-45de-90c2-908382eb22b0', '2d059d52-0c8c-4945-b510-40490e8a66b3', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('bb3274fa-8699-4c37-9883-e9892a4d7ea1', '2d059d52-0c8c-4945-b510-40490e8a66b3', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('5eae3aaf-1063-40b4-a38a-636383408c30', '2d059d52-0c8c-4945-b510-40490e8a66b3', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('86526a3a-1825-489d-b57b-9d761d223f4d', '2d059d52-0c8c-4945-b510-40490e8a66b3', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('9a563247-ad71-4861-b1ea-32d1b2355a71', '2d059d52-0c8c-4945-b510-40490e8a66b3', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('7b6c05d2-5f02-4901-9caf-0966d074b793', '2d059d52-0c8c-4945-b510-40490e8a66b3', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('b47e53be-f969-436d-a91b-b72f8cbea9dc', '2d059d52-0c8c-4945-b510-40490e8a66b3', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('91e869f3-9dff-465f-b5a1-35f4f3a508a4', '2d059d52-0c8c-4945-b510-40490e8a66b3', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('c55993b2-60b5-43c0-a0dd-855df0462f4a', 'be82e05e-3091-4f84-9375-345bef69df24', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('b1705e19-9a33-455c-9288-034820ad128f', 'be82e05e-3091-4f84-9375-345bef69df24', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('bb853afa-3c48-47ee-9c94-32d470e03a4f', 'be82e05e-3091-4f84-9375-345bef69df24', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('cfa6766b-65c7-4049-a120-89823d6389b7', 'be82e05e-3091-4f84-9375-345bef69df24', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('2e665d06-0e05-4a36-8a97-e26436a9cd18', 'be82e05e-3091-4f84-9375-345bef69df24', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('617bf2c9-0125-4949-8688-eefc5c328bb7', 'be82e05e-3091-4f84-9375-345bef69df24', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('d9a34d96-adca-4ba9-ac32-f884145e2e6b', '10158037-b0d6-4f2a-a588-5f0c71a0709d', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('1c6f10c3-602b-4803-a537-1819f02f5aa3', '10158037-b0d6-4f2a-a588-5f0c71a0709d', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('6d2f6a79-15c5-4757-87fb-efbddb756bec', '10158037-b0d6-4f2a-a588-5f0c71a0709d', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('b829fb9d-10cb-48b5-aa9f-4eada7f9423c', '10158037-b0d6-4f2a-a588-5f0c71a0709d', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('7cc81773-8015-4a47-8477-967d29a93a40', '10158037-b0d6-4f2a-a588-5f0c71a0709d', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('ade85479-f571-49ed-9825-5d6a35ba215d', '10158037-b0d6-4f2a-a588-5f0c71a0709d', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('a47fe2fc-afdb-4681-84c4-34a47a75772c', '10158037-b0d6-4f2a-a588-5f0c71a0709d', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('a2c37fb0-349d-40ea-9375-92dcdc083462', '10158037-b0d6-4f2a-a588-5f0c71a0709d', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('a165a51c-3198-468f-ae12-57c861773df0', '71b97568-0200-43eb-8209-df6702229521', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('3052e476-311c-4498-aa22-684157772d78', '85104b76-5155-480f-9cc7-a221a83e994a', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('7a2a7442-c587-4e59-b21c-9bf80ac19a9b', '85104b76-5155-480f-9cc7-a221a83e994a', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('3e5290df-df29-4e70-9414-9d9f63fc6297', '85104b76-5155-480f-9cc7-a221a83e994a', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('566a7754-df3c-4ac1-80e7-ee6cc763a74e', '85104b76-5155-480f-9cc7-a221a83e994a', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('ddd4ebf9-60c2-46b9-9515-748e3aff97c8', '85104b76-5155-480f-9cc7-a221a83e994a', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('e4c0304e-b470-4123-baf1-5a68c642ffe6', '85104b76-5155-480f-9cc7-a221a83e994a', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('9748546f-cb77-4fa4-8c15-3c8182c7bc57', '85104b76-5155-480f-9cc7-a221a83e994a', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('0bd671e3-0f0e-42e6-b3f2-65736d6b0e88', '85104b76-5155-480f-9cc7-a221a83e994a', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('d2800ec3-3b1f-4b1d-8540-6b6531e62e51', '5f2e1f1d-c69a-49b3-85e8-cfe6f0db7d03', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('45c6f5b7-b8ce-441b-9698-b1eede24544c', '5f2e1f1d-c69a-49b3-85e8-cfe6f0db7d03', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('eba201fa-0d50-487b-8667-f60fc2774980', '5f2e1f1d-c69a-49b3-85e8-cfe6f0db7d03', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('f64e02af-4980-4a8f-976c-569ccafe38e9', '5f2e1f1d-c69a-49b3-85e8-cfe6f0db7d03', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('af650d85-57f6-4949-8d76-8e009501bcd4', '5f2e1f1d-c69a-49b3-85e8-cfe6f0db7d03', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('5b7d3cb4-da42-422a-9da3-e22f4ac150a4', '5f2e1f1d-c69a-49b3-85e8-cfe6f0db7d03', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('97214b02-ed48-4042-8d0a-2704e2840fa8', '5f2e1f1d-c69a-49b3-85e8-cfe6f0db7d03', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('063e3f4d-f625-4af2-b3f6-2b6d2f01c755', '5f2e1f1d-c69a-49b3-85e8-cfe6f0db7d03', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('b6cb28bc-1681-4178-8282-c2423045a38d', 'dedee1df-1135-4fe5-baa8-4a6168fbeed3', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('eeb5eef7-9301-408e-8413-b7d6cf3bc87f', 'dedee1df-1135-4fe5-baa8-4a6168fbeed3', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('4508e82f-a0ba-4c64-a5bd-6e846f043b3a', 'dedee1df-1135-4fe5-baa8-4a6168fbeed3', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('392ba31a-550d-4d9c-8867-22f6bc0592e1', 'dedee1df-1135-4fe5-baa8-4a6168fbeed3', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('d8bd68cc-c4e0-412e-b3d2-359c33886986', 'dedee1df-1135-4fe5-baa8-4a6168fbeed3', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('f9417c81-0e4f-4a75-a223-d0887cc10bed', 'dedee1df-1135-4fe5-baa8-4a6168fbeed3', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('43243833-3f00-4f58-8bd9-ce6f1ea7321d', 'dedee1df-1135-4fe5-baa8-4a6168fbeed3', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('ae0eb0ee-69b5-4cbe-8ee8-5d45d972b665', 'dedee1df-1135-4fe5-baa8-4a6168fbeed3', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('6647ca9b-9055-4976-b8d4-f0c5ba14f42a', 'd6c9c323-9592-4dd6-9682-c50eb25e6bce', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('56a6de1b-f9e5-4ec8-8c6f-1de5610f12a3', 'd6c9c323-9592-4dd6-9682-c50eb25e6bce', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('066d0137-6e8a-4887-a72a-cd61d7ff33dc', 'd6c9c323-9592-4dd6-9682-c50eb25e6bce', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('83cec59c-ab7d-4b51-b6c2-f80ca3f93e8d', 'd6c9c323-9592-4dd6-9682-c50eb25e6bce', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('1e550358-e11b-4bcc-9239-a322ea66acca', 'd6c9c323-9592-4dd6-9682-c50eb25e6bce', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('8d14cbb2-75b0-44bd-bcdc-2eeb407cc99a', '9ce30d48-75b1-4b31-a60c-887cd6e243e5', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('d5cc55cc-ccc7-4940-a164-27929b97ff29', '9ce30d48-75b1-4b31-a60c-887cd6e243e5', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('9f9eb202-3d65-4cae-9bc6-4716fbfa2fef', '9ce30d48-75b1-4b31-a60c-887cd6e243e5', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('9932fa8c-6c87-488a-9961-40da99f49677', '9ce30d48-75b1-4b31-a60c-887cd6e243e5', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('2ae1abd9-ef14-4a9f-9dd2-5b6b0bf95461', '9ce30d48-75b1-4b31-a60c-887cd6e243e5', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('a75ce35d-ab93-49fb-ac8d-2c9d6ef6f3a7', '9ce30d48-75b1-4b31-a60c-887cd6e243e5', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('a6fea700-9b81-403e-94cc-a11b639d8fc0', '9ce30d48-75b1-4b31-a60c-887cd6e243e5', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('35d1fedd-1896-4092-8d53-88081d63827e', '9ce30d48-75b1-4b31-a60c-887cd6e243e5', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('cb533a62-859d-4744-97bc-a973695a439c', '0f49c58e-97cb-41cd-8bf4-5cb73e7d460b', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('5587eef8-6f42-48d6-801c-73b08f139897', '0f49c58e-97cb-41cd-8bf4-5cb73e7d460b', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('e1784ceb-23b9-4cb6-8cd2-2745cc12711e', '0f49c58e-97cb-41cd-8bf4-5cb73e7d460b', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('11fbeabe-69cd-462e-aa04-78f7e0aa424b', '0f49c58e-97cb-41cd-8bf4-5cb73e7d460b', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('3233abdf-18fc-4247-b201-4936ac5aac66', '0f49c58e-97cb-41cd-8bf4-5cb73e7d460b', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('9971e447-a33e-40c7-9cfd-d48161479266', '0f49c58e-97cb-41cd-8bf4-5cb73e7d460b', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('c485dedf-ddd4-4f9a-8dbc-d7402b399d41', '0f49c58e-97cb-41cd-8bf4-5cb73e7d460b', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('696ea4bc-2aec-4caf-8c14-6eab3d3aa0c2', '0f49c58e-97cb-41cd-8bf4-5cb73e7d460b', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('25879447-15fd-40bc-bb04-c2aa43c7e078', '05e9ef4a-c1fc-444e-b713-b23f9188a94c', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('5acd71ea-d688-4620-a365-800a42f926f0', '05e9ef4a-c1fc-444e-b713-b23f9188a94c', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('90fa963b-119c-4898-a9d4-e91d36762518', '05e9ef4a-c1fc-444e-b713-b23f9188a94c', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('598d8a67-f85a-406f-acc1-191aff33560c', '05e9ef4a-c1fc-444e-b713-b23f9188a94c', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('67ecd995-7eea-4e08-85ec-03e8c5741957', '05e9ef4a-c1fc-444e-b713-b23f9188a94c', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('72d9af06-02eb-4905-8534-4e832a9be12e', '05e9ef4a-c1fc-444e-b713-b23f9188a94c', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('e3d4f2b4-b5d4-4cf0-9875-af51e6f50983', '05e9ef4a-c1fc-444e-b713-b23f9188a94c', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('d585e3f1-e867-4aa8-ae92-a7a849bcd65f', 'bebf996f-521d-4d0d-b9f6-c8056f0728fd', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('bb552303-fa67-459d-88bc-52b0c134a529', 'bebf996f-521d-4d0d-b9f6-c8056f0728fd', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('f0f38bbf-81f5-4d7d-985f-8afac07d667b', 'bebf996f-521d-4d0d-b9f6-c8056f0728fd', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('edbd5812-0063-40da-bad8-4f53f36d4181', 'bebf996f-521d-4d0d-b9f6-c8056f0728fd', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('34215310-cd6d-4620-be31-3d3d62001536', 'bebf996f-521d-4d0d-b9f6-c8056f0728fd', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('4354c6e3-c313-48d5-bef6-5cbc1a2e45ff', 'bebf996f-521d-4d0d-b9f6-c8056f0728fd', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('5d5aff70-4452-4eb1-9318-4c27607fcc91', 'bebf996f-521d-4d0d-b9f6-c8056f0728fd', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('96627893-0062-46f8-97ba-9abcb0b3e068', '8bf888c5-eb25-4c8e-85a0-c6d08ca45daf', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('5aa95fc6-d430-42c4-864f-92a6e2c9510f', 'cf0419d5-5ea3-4c94-8c2f-288de491bb8b', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('fc638f49-f641-46f1-aa65-34a42a81f190', '90a0ed9e-2910-43ce-bbe8-090ced2416f3', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('7d3228c5-f9e7-45dd-bd53-6dadb1b2a24e', '90a0ed9e-2910-43ce-bbe8-090ced2416f3', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('589eb6ea-0878-4126-9f69-6530144abf42', '90a0ed9e-2910-43ce-bbe8-090ced2416f3', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('b53d5c1b-e9cf-4635-8c86-317e9c86ccaa', '90a0ed9e-2910-43ce-bbe8-090ced2416f3', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('32e941a7-a009-4a5a-98ca-c3408ea9c664', '90a0ed9e-2910-43ce-bbe8-090ced2416f3', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('580ad737-9a17-455b-ac48-ea6de095fc33', '90a0ed9e-2910-43ce-bbe8-090ced2416f3', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('5ac13e24-9e5e-4c51-9acc-5bb6c5feae37', '90a0ed9e-2910-43ce-bbe8-090ced2416f3', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('4693e5bd-a1bf-440f-9832-70a3a195e5a7', '90a0ed9e-2910-43ce-bbe8-090ced2416f3', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('147f9d89-0920-46eb-80c4-afea975c0a3e', '172f37e0-55c4-46e2-8346-dba748952a32', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('1a510fed-32b5-4839-9cd3-84f6665754da', '172f37e0-55c4-46e2-8346-dba748952a32', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('689557c1-d545-4d2c-9130-ba62029a7f33', '172f37e0-55c4-46e2-8346-dba748952a32', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('ae3ef801-2fed-4aa0-bc2d-e5b8361b80f2', '172f37e0-55c4-46e2-8346-dba748952a32', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('1d90ee16-481c-4e17-8d6f-29f67a374aee', '172f37e0-55c4-46e2-8346-dba748952a32', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('7e4054bb-4859-4e70-b3fa-9681764086dd', '172f37e0-55c4-46e2-8346-dba748952a32', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('52ca74eb-7c6e-410b-adce-42f41ad6c976', '172f37e0-55c4-46e2-8346-dba748952a32', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('44174053-0e31-4a2b-b13d-5c620668009f', '172f37e0-55c4-46e2-8346-dba748952a32', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('a24f201b-8b6f-48ac-9da0-c91255c21b8f', '0dea6755-b74f-4666-a156-248f4f0306d4', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('292cb8dc-33b1-4618-b8ab-261b0c8acf21', '0dea6755-b74f-4666-a156-248f4f0306d4', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('e95fc8d8-4fa0-4ea1-83e5-7a533e068819', '0dea6755-b74f-4666-a156-248f4f0306d4', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('21da498b-279a-4a4d-b1bd-d05a6e8e216f', '0dea6755-b74f-4666-a156-248f4f0306d4', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('0f8c941f-8ad2-4e9e-8e30-2074ff5ee6d3', '0dea6755-b74f-4666-a156-248f4f0306d4', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('a1f5588c-8208-439f-9fd1-30a393741ac2', '0dea6755-b74f-4666-a156-248f4f0306d4', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('c63237e6-a430-46dd-895b-fbe54a17320e', '0dea6755-b74f-4666-a156-248f4f0306d4', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('52817a3f-f9fa-4843-bb18-ed1b9b61009d', '0dea6755-b74f-4666-a156-248f4f0306d4', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('db61e5cd-9319-41a7-9207-2a994790403b', '51e8858f-792d-491e-9935-c06f5a1ae9ed', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('739a0ee1-be7c-4223-9912-69363fc7f0f3', '51e8858f-792d-491e-9935-c06f5a1ae9ed', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('4870e526-15c0-49d8-a95c-23f591fd4895', '51e8858f-792d-491e-9935-c06f5a1ae9ed', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('b1ece554-7cc8-4fe3-8da5-a23a024cc147', '51e8858f-792d-491e-9935-c06f5a1ae9ed', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('28073e59-263a-478c-a9e2-83fe2eb5a348', '51e8858f-792d-491e-9935-c06f5a1ae9ed', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('7fa9a5d4-dc05-4cb7-967a-e0113e0e5321', '51e8858f-792d-491e-9935-c06f5a1ae9ed', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('edb8c1df-340f-4dcb-864d-2f4a39706ef8', '51e8858f-792d-491e-9935-c06f5a1ae9ed', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('cbcab4ac-fbe7-46a4-ad59-7185e58461e1', '51e8858f-792d-491e-9935-c06f5a1ae9ed', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('873b79a1-14df-47fa-8df6-aeee0f81cb0e', '0c5225b0-e6c4-4de4-97c8-24271b2a47a3', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('19e44481-d61f-4bbe-bdf7-85950bf0beaf', 'e65d01f3-6e41-486e-a389-3e468ac43090', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('35079826-3330-4373-a539-6cd358b52f05', 'e65d01f3-6e41-486e-a389-3e468ac43090', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('6a88baab-e67b-48b1-ba01-21ded63a0abb', 'e65d01f3-6e41-486e-a389-3e468ac43090', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('05b90ddb-b744-4e3f-8d22-7c5da5d3f0a0', 'e65d01f3-6e41-486e-a389-3e468ac43090', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('6e41ba34-cd3c-41cb-909a-6998fe7d1dae', 'e65d01f3-6e41-486e-a389-3e468ac43090', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('cee85562-2290-487a-ac60-ac8bdb9138ec', 'e65d01f3-6e41-486e-a389-3e468ac43090', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('7207f65d-8d3a-423e-ad22-3d2b0293fff9', 'e65d01f3-6e41-486e-a389-3e468ac43090', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('2e921b91-db51-4d30-81ec-92df18465ff3', 'e65d01f3-6e41-486e-a389-3e468ac43090', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('9b555943-82e0-4b95-9406-6be5c1003630', '66c27899-3422-43e4-a427-3e771610e101', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('852511a7-389a-4411-af42-36803d1365c3', '66c27899-3422-43e4-a427-3e771610e101', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('b04bd454-83a4-417a-874a-95b60b47a47a', '66c27899-3422-43e4-a427-3e771610e101', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('4529b73d-3090-4091-88a3-4d0dbb2e85ae', '66c27899-3422-43e4-a427-3e771610e101', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('a4bf88ce-90d3-4055-a5c9-b81e79f235a9', '66c27899-3422-43e4-a427-3e771610e101', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('26a9b948-e40e-4ef0-a926-2500ff03c5bf', '66c27899-3422-43e4-a427-3e771610e101', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('0420a6da-f77b-4a82-ba6b-ecbd90a2c867', '66c27899-3422-43e4-a427-3e771610e101', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('cda2bd1a-3b17-4ea1-b229-0f41debe777c', '66c27899-3422-43e4-a427-3e771610e101', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('c32b4489-5f3e-47e7-9f10-182af8049b79', '84b63eea-4c2b-4590-ac02-8cb11c7c00b1', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('5b8ab04f-5528-481c-bfed-b82a6b9bd07b', '84b63eea-4c2b-4590-ac02-8cb11c7c00b1', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('ba5f0d29-9987-41b5-a204-77ff7b8fc366', '84b63eea-4c2b-4590-ac02-8cb11c7c00b1', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('caa91dc4-bf5e-4dd0-9496-b03501af3971', '84b63eea-4c2b-4590-ac02-8cb11c7c00b1', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('a14d7a7f-331d-4b9b-b483-10bf4d71273f', '84b63eea-4c2b-4590-ac02-8cb11c7c00b1', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('12cdefa0-629e-4514-a175-00898084af9d', '84b63eea-4c2b-4590-ac02-8cb11c7c00b1', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('9e6499b6-42af-402a-ad57-36ae25afe088', '84b63eea-4c2b-4590-ac02-8cb11c7c00b1', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('589aafd3-a147-42c1-bded-f155b2af5402', '84b63eea-4c2b-4590-ac02-8cb11c7c00b1', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('debebfec-b73f-4b6a-a474-8c89b60db61b', 'c1551338-9812-4016-aa0c-9c1d31ac3eca', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('7114002d-2220-4df0-8084-b5f7493604a0', 'c1551338-9812-4016-aa0c-9c1d31ac3eca', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('9720a9a0-e3bf-40a3-9759-ea6453c3feda', 'c1551338-9812-4016-aa0c-9c1d31ac3eca', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('2be72e96-f7d1-4468-bded-b03ee0d07c77', 'c1551338-9812-4016-aa0c-9c1d31ac3eca', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('3f8cd5e8-616f-4e32-a855-0ed898a275be', 'c1551338-9812-4016-aa0c-9c1d31ac3eca', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('8a2ec092-2792-463e-9fb6-eeef7b3a7099', 'c1551338-9812-4016-aa0c-9c1d31ac3eca', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('70b75013-fa56-48c4-9630-0cc4562b011c', 'c1551338-9812-4016-aa0c-9c1d31ac3eca', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('0cdd58d7-b067-4fbc-9b9e-1b114f4f0f72', 'c9b8808d-b807-4ede-99ce-7a25d431004a', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('18e7bd91-43af-4475-a1a2-c9b1d92599c4', 'cc60025e-fc67-4f03-a9fd-32601742c5ea', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('e9022e73-bc22-49e4-bed3-b5d7359ea609', 'cc60025e-fc67-4f03-a9fd-32601742c5ea', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('cb47949c-801e-4cc0-9ad0-539dd80b6b3e', 'cc60025e-fc67-4f03-a9fd-32601742c5ea', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('5e7b050e-5be8-4348-8214-9cc45ddd66f8', 'cc60025e-fc67-4f03-a9fd-32601742c5ea', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('cc7b3252-f936-4541-8315-504fc5a24803', 'cc60025e-fc67-4f03-a9fd-32601742c5ea', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('107a15ae-0b31-4a7e-a18b-c1a952c886c1', 'cc60025e-fc67-4f03-a9fd-32601742c5ea', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('02e74f7d-214c-467a-b835-33bba30184ac', 'cc60025e-fc67-4f03-a9fd-32601742c5ea', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('2de70868-4502-4834-985f-2b84244cae73', 'cc60025e-fc67-4f03-a9fd-32601742c5ea', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('8387a2c6-e7b6-448d-81a4-dc941452c2e3', '1ae6f5d8-d689-4fc0-aa0b-65844b07b11c', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:22:50.393848+00'),
	('13b062b6-9eab-41d8-bf5d-90ca0369da2d', '1ae6f5d8-d689-4fc0-aa0b-65844b07b11c', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:22:50.393848+00'),
	('e7a66374-8db5-4620-bbe9-f9dce71e0a2a', '1ae6f5d8-d689-4fc0-aa0b-65844b07b11c', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:22:50.393848+00'),
	('8dafd22d-45e0-48af-8f9a-4c92f6df2140', '1ae6f5d8-d689-4fc0-aa0b-65844b07b11c', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:22:50.393848+00'),
	('2439cdd8-1b37-47f5-98bd-3bb3859c23f2', '1ae6f5d8-d689-4fc0-aa0b-65844b07b11c', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:22:50.393848+00'),
	('0ad92278-7d20-4ea8-9d11-df7b51d81630', '1ae6f5d8-d689-4fc0-aa0b-65844b07b11c', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:22:50.393848+00'),
	('8a69e562-23f2-48d3-b70a-ec5f042de83b', '1ae6f5d8-d689-4fc0-aa0b-65844b07b11c', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:22:50.393848+00'),
	('c18a310b-7eea-419d-b19a-88f9464ea2d6', '1ae6f5d8-d689-4fc0-aa0b-65844b07b11c', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:22:50.393848+00'),
	('084b50aa-c415-4e03-9719-62e5403904e1', 'cc8738e4-0988-4f8b-91e8-261b939bd1ea', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:04.370107+00'),
	('cb698b5e-2756-4f1b-8670-e691dc3aa42c', 'cc8738e4-0988-4f8b-91e8-261b939bd1ea', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:04.370107+00'),
	('b6f7c2d5-1d85-4e37-8fda-2581dc972d08', 'cc8738e4-0988-4f8b-91e8-261b939bd1ea', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('7e1a93ea-d98a-4759-bb5b-c7099b6565c6', 'cc8738e4-0988-4f8b-91e8-261b939bd1ea', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:04.370107+00'),
	('cda926a8-2035-45a1-9efa-a611c1a91bf9', 'cc8738e4-0988-4f8b-91e8-261b939bd1ea', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('22e9ec66-ee0d-4984-8477-182340afb64a', 'cc8738e4-0988-4f8b-91e8-261b939bd1ea', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:04.370107+00'),
	('056163bd-4dff-4503-9baf-dea003e34f4f', 'cc8738e4-0988-4f8b-91e8-261b939bd1ea', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('9b269259-b860-489a-9917-3b61cd755d68', 'cc8738e4-0988-4f8b-91e8-261b939bd1ea', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:04.370107+00'),
	('4abb5b79-3e68-4601-8a90-ec54039a70b8', '3cf7796b-7bc3-430c-ae16-e8edcb1e2b4d', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:04.370107+00'),
	('bd9bcea5-ff8d-4be5-a964-f3aa2308dcd3', '3cf7796b-7bc3-430c-ae16-e8edcb1e2b4d', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:04.370107+00'),
	('1bcc899b-cace-4c74-9812-81d4d4adc71e', '3cf7796b-7bc3-430c-ae16-e8edcb1e2b4d', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('d9bfdac8-da12-4cc1-bda3-7551f949db1f', '3cf7796b-7bc3-430c-ae16-e8edcb1e2b4d', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:04.370107+00'),
	('c0a6944f-74a9-467f-870c-d93705dbe4ff', '3cf7796b-7bc3-430c-ae16-e8edcb1e2b4d', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('f2763f9a-49b0-439e-9002-d0e3658b54db', '3cf7796b-7bc3-430c-ae16-e8edcb1e2b4d', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:04.370107+00'),
	('8895e2e9-226d-40a6-ac5d-48a7d756303f', '3cf7796b-7bc3-430c-ae16-e8edcb1e2b4d', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('8f9c5218-14c4-413f-b360-90c94e12ccb9', '3cf7796b-7bc3-430c-ae16-e8edcb1e2b4d', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:04.370107+00'),
	('4d4eb8f8-ca06-45d3-925c-838d40ec91f9', '15ad7187-c60b-4f30-8121-1b72632136cc', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:04.370107+00'),
	('b3df2dc8-1a11-4996-98c7-51a91f940cae', '15ad7187-c60b-4f30-8121-1b72632136cc', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:04.370107+00'),
	('44e171ca-3600-4259-9195-608d94b7a472', '15ad7187-c60b-4f30-8121-1b72632136cc', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('63982a37-c3bb-4619-92a6-63c501223282', '15ad7187-c60b-4f30-8121-1b72632136cc', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('86b17963-60f8-42e6-b841-7dd147716364', '15ad7187-c60b-4f30-8121-1b72632136cc', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:04.370107+00'),
	('49d28e5f-d215-44de-81d2-8fc8e2540c2e', '15ad7187-c60b-4f30-8121-1b72632136cc', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('6fb4b236-d32b-44a6-bdd0-afb35d2626d8', '15ad7187-c60b-4f30-8121-1b72632136cc', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:04.370107+00'),
	('bf49aa8b-beef-40b5-8a1a-555fb7ba5e1d', '3fcfdde0-981a-4816-9832-15ea77742424', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('ca351fcc-78cc-4c78-96b9-ed4a89ed4a17', '3fcfdde0-981a-4816-9832-15ea77742424', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:04.370107+00'),
	('bd1f0aa6-61d1-4fdd-a66e-11d165bb6500', '3fcfdde0-981a-4816-9832-15ea77742424', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('b3213691-2a34-45d6-af36-05d9f94efb62', '19690622-fc02-4629-90bd-a3aed9c6ed97', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:04.370107+00'),
	('a0daddd8-19f8-4aaf-abd5-29981380a5d1', '19690622-fc02-4629-90bd-a3aed9c6ed97', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:04.370107+00'),
	('c441841c-4fe4-4f20-b8f7-fd3370571a99', '19690622-fc02-4629-90bd-a3aed9c6ed97', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('c1235f26-05a1-4336-82bb-7d55249cc437', '3dd5a996-f4b8-4e8e-b7ca-797eb4ac9ed0', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:04.370107+00'),
	('6777057f-0674-431f-a292-9bda44295175', 'ba174105-bd43-4a9f-8c4f-a28e057648d6', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:04.370107+00'),
	('d3a34a1b-df6a-4abc-a22a-3e4caf1d0665', 'ba174105-bd43-4a9f-8c4f-a28e057648d6', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:04.370107+00'),
	('7473dd6e-ff42-43d4-b5b9-b2eb0171ba54', 'ba174105-bd43-4a9f-8c4f-a28e057648d6', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:04.370107+00'),
	('8f257f12-bada-4736-9ddc-fa4bffec38ac', 'ba174105-bd43-4a9f-8c4f-a28e057648d6', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('b9799527-f7b2-4b48-b468-7052c8847031', 'e7c26408-c400-466b-bd04-55da4daf253f', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:04.370107+00'),
	('82316e0b-906b-40b7-96d7-48072b117803', 'e5f75070-f80b-4085-b314-8340ce6d2203', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:04.370107+00'),
	('2ce41a36-6417-4bcb-9e16-f30ffd1e995e', 'e5f75070-f80b-4085-b314-8340ce6d2203', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:04.370107+00'),
	('77f95449-0222-4ef5-ae53-8d7924082977', 'e5f75070-f80b-4085-b314-8340ce6d2203', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('d7049aad-89d2-46a0-92ef-57efde622e20', 'e5f75070-f80b-4085-b314-8340ce6d2203', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('58352f7d-0331-4877-91ec-ff0272b0a83a', 'e5f75070-f80b-4085-b314-8340ce6d2203', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:04.370107+00'),
	('59b7d55c-6b47-478d-85f5-33af0289760d', 'e5f75070-f80b-4085-b314-8340ce6d2203', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('5db656dd-8e51-499c-bef4-a02583f62f0e', 'e5f75070-f80b-4085-b314-8340ce6d2203', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:04.370107+00'),
	('a58e8324-45ec-4c3e-88a0-f7c155f6a381', '81fa0d91-cf68-469c-8b0c-2a8eb698d71a', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('dc638a79-867f-41cf-94cc-75f34a6ff304', '81fa0d91-cf68-469c-8b0c-2a8eb698d71a', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:04.370107+00'),
	('f8997e38-ed79-4015-acf0-5ba0dbfb5e5c', 'ddeb5c71-42f2-433e-a2f8-821dc6d99c9f', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:04.370107+00'),
	('b457e573-01af-47fa-9802-7c0c11286c72', 'ddeb5c71-42f2-433e-a2f8-821dc6d99c9f', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('6cc57254-f34e-4f86-bd63-8cc144a577c7', '702ff176-eec5-4fed-a579-33a73cce05ba', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:04.370107+00'),
	('6c177621-639b-4441-b9f8-ad33fb47fb5a', '4dc5ce03-645b-4c75-8cc9-560d7b33ab40', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:04.370107+00'),
	('041f0031-66ac-4946-bde6-20814e1bdcea', 'a2124dda-2ed9-41af-b04e-7b58a17e57ae', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:04.370107+00'),
	('3f51b5e5-f96b-45fa-a0fd-5bc491b7eabc', 'a2124dda-2ed9-41af-b04e-7b58a17e57ae', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('23cf3157-6519-4fd9-a0b0-a638e8f991c6', 'a2124dda-2ed9-41af-b04e-7b58a17e57ae', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:04.370107+00'),
	('d59f3410-488e-42c5-9ca9-49623c808031', 'a2124dda-2ed9-41af-b04e-7b58a17e57ae', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('ad911aa7-9a30-4c7f-b8c5-0495cca05bf5', 'a2124dda-2ed9-41af-b04e-7b58a17e57ae', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('bbfcc566-c66d-484b-a753-62d6d6d52235', 'a2124dda-2ed9-41af-b04e-7b58a17e57ae', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:04.370107+00'),
	('fbc17976-dcdd-4d35-9578-04e176b11a3c', '78f0a213-4b29-455e-a871-277e0a19f767', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:04.370107+00'),
	('3954b152-553b-458c-a47a-d5894716f7e4', 'c51a5e5d-d9cd-439a-9a94-d85e72d649e3', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('7f575291-63c8-4914-8f75-4dcd30aa8344', 'c51a5e5d-d9cd-439a-9a94-d85e72d649e3', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('ca5a5a44-881b-4890-bd78-cf35c16ee951', 'c51a5e5d-d9cd-439a-9a94-d85e72d649e3', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('f2bfd5a6-a6c7-4b26-945e-f4abf3828115', '3fbd37f8-629f-4f62-81ae-573e34737e8b', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('b2b8148d-838b-4c60-b8e3-14efd9e5d392', '3fbd37f8-629f-4f62-81ae-573e34737e8b', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('851009c0-8a07-4fac-a1de-4317cac05369', '3fbd37f8-629f-4f62-81ae-573e34737e8b', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('514e9cde-844a-4f04-8524-1142d898d219', 'b5b9245d-591e-4728-a3d9-5e57df96f896', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('dd3aaaf2-e60c-4fbb-89ad-808d3a978766', 'b5b9245d-591e-4728-a3d9-5e57df96f896', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:04.370107+00'),
	('e1a91900-6749-4b2e-b0eb-8862e28a538e', 'b5b9245d-591e-4728-a3d9-5e57df96f896', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('ab2e2123-2864-42cb-a5a0-d0a4e4d63d3b', 'b5b9245d-591e-4728-a3d9-5e57df96f896', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:04.370107+00'),
	('55c17344-1dc2-45c2-829e-38deb96e2aa6', 'b5b9245d-591e-4728-a3d9-5e57df96f896', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('a352589f-c385-4d2e-924d-44edb7d46587', '418fd393-9ea1-4642-b7c2-b6df7dd703a8', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('b521eb44-ec88-4c8e-b3ac-9f87faf097b9', '418fd393-9ea1-4642-b7c2-b6df7dd703a8', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('87941cd8-8a6d-4d05-917c-2a3e8ce14eeb', '418fd393-9ea1-4642-b7c2-b6df7dd703a8', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('e6caabea-962e-4c0e-9745-8abde9badf98', '418fd393-9ea1-4642-b7c2-b6df7dd703a8', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:04.370107+00'),
	('e7bde976-f8ac-4c14-8ef0-ccd2be8788e0', 'ec4c891a-eb17-4e0a-a245-88f654c6553b', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('dcc0325d-fa06-437c-9c12-73ca50d73a19', 'd900dd0f-57f4-419e-a46a-f82d376e216d', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('cb86a9fb-702b-49d9-b88c-2f924aec4e55', 'd900dd0f-57f4-419e-a46a-f82d376e216d', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('f7b0e2dc-8d56-4992-9503-dfec45567a59', 'd900dd0f-57f4-419e-a46a-f82d376e216d', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('1af9d69b-4952-40ef-8db3-2b51933ca201', 'd900dd0f-57f4-419e-a46a-f82d376e216d', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:04.370107+00'),
	('922bd4b6-e6f5-4293-8c9b-e50b02897d74', 'd4f5671a-905e-4db8-96d3-5df699e2db2a', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('57fdcc43-b4fe-472b-a427-6eb04cd0555a', '5876ffa2-00e1-4d3a-a319-884fa8c2eec1', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('dbc349e1-2a77-42c5-b4ed-e6fa0ff7a5b5', '5876ffa2-00e1-4d3a-a319-884fa8c2eec1', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('b06bc7ce-2c08-492a-87fb-524407a6694d', '5876ffa2-00e1-4d3a-a319-884fa8c2eec1', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('64e5ff4c-8604-4a84-95c8-c5eee2a4e442', '5876ffa2-00e1-4d3a-a319-884fa8c2eec1', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:04.370107+00'),
	('4cb73e98-957c-4f12-9644-8215339f999e', '1af4244a-35c9-436a-9dde-65c30165f66a', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('42bc0a68-b3a9-4931-a0fc-f6909a3af183', '1af4244a-35c9-436a-9dde-65c30165f66a', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('0103e803-d1ed-4201-8f20-55b6b3533993', '1af4244a-35c9-436a-9dde-65c30165f66a', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:04.370107+00'),
	('8bdd2245-1fe4-43e5-b1c2-7b73c3a6e57e', '1af4244a-35c9-436a-9dde-65c30165f66a', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('dda55ba8-b1ec-453c-a8a7-c2fd3593b1b5', '1af4244a-35c9-436a-9dde-65c30165f66a', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:04.370107+00'),
	('4204bcbe-fc8f-4dc2-930d-cde6b049442d', 'a0605bed-038e-4d4f-925e-ff6aea32543e', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('958e71b6-b5fc-43c7-8a42-4135a8ba4f1f', 'f01f9d09-007b-4755-a826-268bbe3880f0', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:04.370107+00'),
	('74578147-73ce-458f-921d-825e6653555b', 'd5d8db1a-e996-4dc7-a634-28f334baa279', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('4b954da7-0fee-4dad-bd37-10ef52c7eabe', 'd5d8db1a-e996-4dc7-a634-28f334baa279', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('3cde8b90-ef20-465d-b877-d0fefc573b95', 'e496593f-2e7c-4824-9886-ec901398fdf7', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('386bc45d-23a4-4e01-b3a0-7da45ed12f27', '0dadc5c4-40b1-48e1-8daa-1aa0b8f0aca6', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('ae79d59e-eeca-4871-984c-aed1726923cc', '0dadc5c4-40b1-48e1-8daa-1aa0b8f0aca6', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('f4ce5874-3553-4b53-8584-5a3f25090e37', '0dadc5c4-40b1-48e1-8daa-1aa0b8f0aca6', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('eddfd0e6-1302-478a-aa26-2dc697ae5344', '0dadc5c4-40b1-48e1-8daa-1aa0b8f0aca6', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:04.370107+00'),
	('74e04de1-a232-45ca-b452-c40b20511f6e', 'f0e16d7e-1ea6-481f-a0c2-7e02fbe630bf', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:04.370107+00'),
	('2e1a2e55-cc24-483f-bd84-4093882f10be', 'f0e16d7e-1ea6-481f-a0c2-7e02fbe630bf', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:04.370107+00'),
	('2908495a-5923-4ee8-b519-8a1db420474a', 'f0e16d7e-1ea6-481f-a0c2-7e02fbe630bf', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:04.370107+00'),
	('e249246f-261f-43b5-b8f9-400177d889ad', '0ab71499-856d-478e-b423-246d6e953182', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('e4400afb-00c0-4b92-a6aa-77c581791370', '0ab71499-856d-478e-b423-246d6e953182', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('61f846f3-741f-4c9c-a2bd-a486de6e8674', '0ab71499-856d-478e-b423-246d6e953182', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('1bd46aa5-be73-4e6b-ac61-815ea108fb78', '0ab71499-856d-478e-b423-246d6e953182', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('bdc1df1d-d308-4ccd-9e47-3b03c33fbc7c', 'db530660-bceb-4f44-901b-2004f565f959', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:15.272219+00'),
	('f64eda94-ef4a-4080-9af9-60f2f64e325f', '898dc988-d0f7-4cdf-930c-c82ceb1ec3ef', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('6af3410b-8f89-4829-a42f-1b848c1c9f40', '898dc988-d0f7-4cdf-930c-c82ceb1ec3ef', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:15.272219+00'),
	('b1cfdbb5-ff4f-4f98-aa8f-0ca40f5e6611', '898dc988-d0f7-4cdf-930c-c82ceb1ec3ef', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('8cb0da56-25f4-4b75-bf60-ecabc3104e9a', '898dc988-d0f7-4cdf-930c-c82ceb1ec3ef', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('5efe6170-2e05-492a-aafe-198b8f4d66fe', '898dc988-d0f7-4cdf-930c-c82ceb1ec3ef', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('391f0e7b-fe86-428a-8994-28dc3f742b8d', 'fa31882d-b7d6-434f-a3b0-1025f828285e', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('82bdb3e2-098d-416a-bfde-a369ac3e5ad9', 'fa31882d-b7d6-434f-a3b0-1025f828285e', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('c5a795f9-8362-4b7d-9d82-b806bc7a5f81', 'fa31882d-b7d6-434f-a3b0-1025f828285e', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('bd53fe58-85eb-4c6a-855c-e1ef7a914723', '224d96dd-3cba-48ea-98e0-b2599f5f8452', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:15.272219+00'),
	('a54236ca-64f0-483b-9a09-92dd1368cb84', '525a9424-6d7e-47de-9a2a-700953f6e5c1', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('cb20af6c-0f3b-4897-a3d6-fdd429660d41', '525a9424-6d7e-47de-9a2a-700953f6e5c1', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('849bcdc6-5b5b-4bc1-afca-37ccd12b91eb', '525a9424-6d7e-47de-9a2a-700953f6e5c1', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('dda3a7e5-c73d-4d98-93f5-034d0dccde72', '1e017d44-538e-4dd0-98d9-c20e4b3521fb', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('7e4d157e-8ac5-4672-b327-645120855a5a', '1e017d44-538e-4dd0-98d9-c20e4b3521fb', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:15.272219+00'),
	('1e8a9f99-8cdd-4889-9fe3-859c99e48ad6', '1e017d44-538e-4dd0-98d9-c20e4b3521fb', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('84766b04-9830-468a-aa67-8a7e917b90ad', '1e017d44-538e-4dd0-98d9-c20e4b3521fb', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('fd665c01-e3fe-425c-927c-b764147cd3e1', '1e017d44-538e-4dd0-98d9-c20e4b3521fb', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('7f33f1cf-2836-4f01-82f0-28925f7ffcd9', '8a434e49-9fc6-48ea-b2e0-a839ed627d4e', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('d2d782ff-bfad-465e-9137-abccf136ef3e', '0a87f87e-0387-426a-8ee4-8a7c351496a3', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('31a68514-34e6-4e5d-a520-a2be4fbfd97a', '0a87f87e-0387-426a-8ee4-8a7c351496a3', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:15.272219+00'),
	('ced4145c-0167-4e9a-b2a3-f9bfb26e855d', '0a87f87e-0387-426a-8ee4-8a7c351496a3', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('e32f52db-6b12-43d1-b6b2-3a9d8c690f56', '0a87f87e-0387-426a-8ee4-8a7c351496a3', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:15.272219+00'),
	('fa7b2c10-2fe9-42d6-b962-34912a2db1b8', '0a87f87e-0387-426a-8ee4-8a7c351496a3', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('76c17d83-ed2c-4b5b-882c-4117d56da19f', '0a87f87e-0387-426a-8ee4-8a7c351496a3', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:15.272219+00'),
	('cdda9ab8-c07b-45ef-8a88-8d87df324868', '0a87f87e-0387-426a-8ee4-8a7c351496a3', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('10cc156e-ec95-4b34-8b7b-34f4504f5431', '0a87f87e-0387-426a-8ee4-8a7c351496a3', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('7b5601cf-cff6-4f48-86dc-9cbffe00d547', 'f2d36d38-525f-4896-8ce5-f9dabd7ef313', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:15.272219+00'),
	('b297f7d5-c458-45fe-9277-f7ac6e519782', '0e35722e-8321-4daa-b1c3-31a66cc5062a', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('d384c577-960f-4039-9fb6-2aba7bca264f', '0e35722e-8321-4daa-b1c3-31a66cc5062a', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:15.272219+00'),
	('05f29ba7-acfa-486e-8b2b-49686d94370a', '0e35722e-8321-4daa-b1c3-31a66cc5062a', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('deebbb01-8b0b-4dd1-8126-d34d4f60fbd1', '0e35722e-8321-4daa-b1c3-31a66cc5062a', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:15.272219+00'),
	('0314d095-60f5-4c9a-8928-8b5d772b3494', '0e35722e-8321-4daa-b1c3-31a66cc5062a', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('4b57bc90-704b-4679-8257-c095a9928858', '9a0416ad-e525-4a71-99fd-f128915ea9fa', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:15.272219+00'),
	('a4d20eeb-e6fb-4708-b43c-838adf70c8d7', '5c1fc7ba-2d58-44a4-ae99-f0fb92fb6919', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('34094c98-6a2d-402a-92ce-ae544f374581', '5c1fc7ba-2d58-44a4-ae99-f0fb92fb6919', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:15.272219+00'),
	('a0ac3a7b-57d3-440d-9258-425196f4e508', '5c1fc7ba-2d58-44a4-ae99-f0fb92fb6919', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('8eb0d501-aca1-4d78-beec-0eed72819ca7', '5c1fc7ba-2d58-44a4-ae99-f0fb92fb6919', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:15.272219+00'),
	('f94c66a1-96f3-4c44-8030-1b79c3a8e436', '5c1fc7ba-2d58-44a4-ae99-f0fb92fb6919', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('2ac0b28c-224b-4a4e-a0e4-5cec2db1362d', '129474c2-88b6-4055-b31d-bb1b19e4cff3', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('4cde2317-4d8c-4bc9-bf7b-cb6b08223c3b', '129474c2-88b6-4055-b31d-bb1b19e4cff3', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:15.272219+00'),
	('9123fb11-f99d-45e6-b5ae-e89f6d84c67a', '129474c2-88b6-4055-b31d-bb1b19e4cff3', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('a777e3be-db7b-4ea6-940f-c57f9846dbf8', '129474c2-88b6-4055-b31d-bb1b19e4cff3', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:15.272219+00'),
	('0638f62b-8cfa-4c45-8a79-406a72698104', '129474c2-88b6-4055-b31d-bb1b19e4cff3', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('7f80efe5-dccd-4e70-bb5b-b0b4906c1de5', '129474c2-88b6-4055-b31d-bb1b19e4cff3', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('39618dd2-6894-4803-bdae-b6c7c726aaf0', 'bddebcbc-a1a4-4c48-8662-3d43d06c3471', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('1b0c8e27-bb32-4b92-89dc-1afb52e74e02', 'bddebcbc-a1a4-4c48-8662-3d43d06c3471', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:15.272219+00'),
	('a6866fd4-9311-4a2b-a1df-9a1600a5cb0e', 'ca8fce20-39de-4f3f-ae59-b11885421fdb', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:15.272219+00'),
	('6d47721a-b252-4b5d-8cff-21529e87db25', 'ca8fce20-39de-4f3f-ae59-b11885421fdb', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('87e8ab81-a322-4049-b52e-3603e523ca9a', 'e92be4b1-7611-443d-a715-3c2d5a4d293c', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('2db5d2a7-3388-49b3-9736-d230ef2984c2', 'e92be4b1-7611-443d-a715-3c2d5a4d293c', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('edbea4c3-e251-4483-a55d-e9923750f9f7', 'e92be4b1-7611-443d-a715-3c2d5a4d293c', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:15.272219+00'),
	('8e7ef837-8020-41f3-8f46-67c799ffbbc0', 'e92be4b1-7611-443d-a715-3c2d5a4d293c', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('421e5bf0-f32b-4ee5-8f2e-1d1a6ad15668', 'e92be4b1-7611-443d-a715-3c2d5a4d293c', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('df80c9a0-5ebc-4b7c-8152-39ea7e92e41a', '6d55ea8b-dcea-4a94-aa8a-91b7dab99653', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:15.272219+00'),
	('8c61252b-7f3c-4816-9018-ef87290a73c9', '5edbb4f5-2486-498a-9c3f-40b0e8888863', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:15.272219+00'),
	('0bee06e4-ddd6-42c9-b046-3df594ac2e1d', '592ef8be-e2d8-4b97-ac20-6bb5b9611054', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('9c84ae72-3c42-4dba-8db5-01a48eabafb7', '592ef8be-e2d8-4b97-ac20-6bb5b9611054', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:15.272219+00'),
	('31b9d441-b756-4523-b02c-d0c24fbd2062', '592ef8be-e2d8-4b97-ac20-6bb5b9611054', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('a4a069cc-8d70-49ea-8a3a-61a4818b4a0b', '592ef8be-e2d8-4b97-ac20-6bb5b9611054', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:15.272219+00'),
	('be408247-7f42-48b2-bbf6-e0a54837c97e', '592ef8be-e2d8-4b97-ac20-6bb5b9611054', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('e942a735-15f9-4d5d-a264-8f3db47d2602', '592ef8be-e2d8-4b97-ac20-6bb5b9611054', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('d063b61a-4118-48e9-9257-82094054f41c', '592ef8be-e2d8-4b97-ac20-6bb5b9611054', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('e03b11ba-af0d-446e-9713-ee5538b30783', '285f3c07-0e8c-47a2-8a11-424886384664', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('25e6511d-9251-47ad-b615-ca04de00f0e8', '285f3c07-0e8c-47a2-8a11-424886384664', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:15.272219+00'),
	('5ff89e2e-4a70-49dd-9056-18e7d3894928', '285f3c07-0e8c-47a2-8a11-424886384664', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('dda295c5-4d02-4f7b-a65a-57855c1547ed', '285f3c07-0e8c-47a2-8a11-424886384664', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('ab78c5f8-8e4a-4651-bcb9-6ea2305bcc61', '285f3c07-0e8c-47a2-8a11-424886384664', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('ac530a42-4738-436e-a9e6-d59b68f24879', '285f3c07-0e8c-47a2-8a11-424886384664', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('66643fc5-ae8e-4e69-b405-cf0d1ffef0c5', '5c58d42a-f1e7-4896-bcc2-a23f9ad3ac6a', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('2f586ac2-2f77-49d7-b718-81aa23b9bcb9', '5c58d42a-f1e7-4896-bcc2-a23f9ad3ac6a', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('2b4985c6-1623-4fdc-a6dc-65a7a019eecf', '5c58d42a-f1e7-4896-bcc2-a23f9ad3ac6a', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('089820c4-67f4-4251-8cc9-621fabaa89d3', '5c58d42a-f1e7-4896-bcc2-a23f9ad3ac6a', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:15.272219+00'),
	('15b7e4a4-a62f-4fa9-bd35-6e51b1663271', '5c58d42a-f1e7-4896-bcc2-a23f9ad3ac6a', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('339d6ee1-3152-4241-969b-5bc4c91ee4ca', '5c58d42a-f1e7-4896-bcc2-a23f9ad3ac6a', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('aeadb087-ff8f-4008-943d-7b644a06b7ce', 'fc5e4250-d1d2-4711-a8b5-a84da355acff', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('8bf37e39-ee11-4ca8-b76e-df1126a3a312', 'fc5e4250-d1d2-4711-a8b5-a84da355acff', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('7bf5f418-0ccb-430b-aa69-cf12a9d208d7', 'fc5e4250-d1d2-4711-a8b5-a84da355acff', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('a8b4d2eb-f6cc-4a8a-a106-09848a3347a7', 'fc5e4250-d1d2-4711-a8b5-a84da355acff', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('a1379a16-9c94-4c40-82a8-027813ce8299', 'fc5e4250-d1d2-4711-a8b5-a84da355acff', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('b95725ed-6d1b-4711-92a2-70bf1cd7f389', '615cab93-7f26-40b9-9595-2d7c53ba271b', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('3b4c3265-35e2-4078-8dd6-fc68d4f20c78', '615cab93-7f26-40b9-9595-2d7c53ba271b', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('3d4a64cd-7d11-438d-bab6-a49ae4295a60', '615cab93-7f26-40b9-9595-2d7c53ba271b', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('6d26236a-1a85-4b8f-9e13-2a9967377c07', '615cab93-7f26-40b9-9595-2d7c53ba271b', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:15.272219+00'),
	('b2325adf-70d3-4891-8297-93a433d32ee1', '615cab93-7f26-40b9-9595-2d7c53ba271b', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('b9ea3e31-e6f0-4cf2-ab28-60d356c344e0', '615cab93-7f26-40b9-9595-2d7c53ba271b', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('5d7ce2cc-74bb-4783-9d2a-bf9f6c3f0bd6', 'fefbe032-906b-4eb4-b2fa-9eb368231c4b', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('43ba65f6-bb55-4f64-8cda-094abe64f108', 'fefbe032-906b-4eb4-b2fa-9eb368231c4b', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:15.272219+00'),
	('f984d3e9-cba5-4545-9bf3-0851ff1ccdcf', 'fefbe032-906b-4eb4-b2fa-9eb368231c4b', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('30c366ef-3a28-42b2-989c-c27914473923', 'fefbe032-906b-4eb4-b2fa-9eb368231c4b', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('866efbc1-69ae-492d-af48-a0905a90715a', 'fefbe032-906b-4eb4-b2fa-9eb368231c4b', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:15.272219+00'),
	('fac03e94-8e95-4663-b476-f8f67dc02f6b', 'fefbe032-906b-4eb4-b2fa-9eb368231c4b', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('0a8bf67a-1c9e-4bca-844a-ded7e51ef251', 'fefbe032-906b-4eb4-b2fa-9eb368231c4b', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('6d19c2ab-8c0c-4ff4-93f4-ff742633a20f', 'f05de040-7ca3-4763-867c-ce68ad4fcb90', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('751fda38-5c25-4420-bd06-df4cd09cefc6', 'f05de040-7ca3-4763-867c-ce68ad4fcb90', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:15.272219+00'),
	('6e43ee2f-e71d-4bcc-b88f-ed6b7254e6f1', 'f05de040-7ca3-4763-867c-ce68ad4fcb90', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('ddc53e9e-1f30-43f7-b280-33c228bb7843', 'f05de040-7ca3-4763-867c-ce68ad4fcb90', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('d51fc571-15ad-4c99-84c4-d0c73e4f676d', 'f05de040-7ca3-4763-867c-ce68ad4fcb90', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('8ea71247-0821-479b-b458-63deac6d5e5d', 'f05de040-7ca3-4763-867c-ce68ad4fcb90', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('9b6ab2a7-604d-40a4-9139-705beb6c2f98', '10521db6-2018-4542-a69b-cc8184b76408', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('85ffbc3a-8e38-47b8-8f0a-902502658e96', '10521db6-2018-4542-a69b-cc8184b76408', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:15.272219+00'),
	('7d5aa0bb-2093-4dc5-b3c2-7f173e6ab739', '10521db6-2018-4542-a69b-cc8184b76408', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('45479840-4049-41ac-958b-0c97f199fce5', '10521db6-2018-4542-a69b-cc8184b76408', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('75fc87c7-c95b-463e-a336-91570b2a4383', '10521db6-2018-4542-a69b-cc8184b76408', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:15.272219+00'),
	('5ef52a09-164b-4c68-a16f-4e20293fda62', '10521db6-2018-4542-a69b-cc8184b76408', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('a38e726c-ee76-419e-ad97-6d7de7bd202b', '10521db6-2018-4542-a69b-cc8184b76408', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('657d5ee4-5000-4b4a-a87f-66eedba23c6d', '12b95415-12ef-4627-9884-ea5957de7810', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:15.272219+00'),
	('2906fa81-ea89-4b29-a075-95b2d71023c0', '12b95415-12ef-4627-9884-ea5957de7810', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:15.272219+00'),
	('a8dae29b-284a-4393-b1bf-8a3331f8596f', '12b95415-12ef-4627-9884-ea5957de7810', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:15.272219+00'),
	('08c9d1e9-2bdc-42b4-87f2-457fe5117f46', '12b95415-12ef-4627-9884-ea5957de7810', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:15.272219+00'),
	('97affcae-74dd-44f7-a3cb-b4d7a9d4a3b2', '12b95415-12ef-4627-9884-ea5957de7810', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:15.272219+00'),
	('9db6322e-4688-42aa-98c4-64b0f8a0f9dd', '12b95415-12ef-4627-9884-ea5957de7810', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('c1395e8f-1e4e-45b1-965a-3cb1a96a8dda', '01020001-e75a-4ecb-8f07-743669f4c40d', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('c5f6d80c-a527-4f56-8569-f70d712dd935', '14af16e7-c65b-4f48-8519-c8a66f994b3b', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:15.272219+00'),
	('810d0c0b-3009-467f-97f8-830fa0514655', '26eb4199-2600-4fe4-9345-07f33c552cc4', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:28.462789+00'),
	('82d78e0a-bceb-440a-adc8-8270e37eaae5', 'bf3c287e-4a66-45bd-b946-2944f5004e42', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:28.462789+00'),
	('aaaf5f19-6e89-4b30-bcfd-43a0aa4a332e', 'bf3c287e-4a66-45bd-b946-2944f5004e42', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:28.462789+00'),
	('491a7d30-4033-418a-990c-f37d68f4aa69', 'bf3c287e-4a66-45bd-b946-2944f5004e42', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:28.462789+00'),
	('ec037baa-fff2-42d4-a4b3-02d7d60cc069', 'bf3c287e-4a66-45bd-b946-2944f5004e42', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:28.462789+00'),
	('03560404-0ab2-4947-bd37-ba6182854d76', 'bf3c287e-4a66-45bd-b946-2944f5004e42', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:28.462789+00'),
	('c9a55292-b21f-46d8-bc2e-c6dacfca8396', 'bf3c287e-4a66-45bd-b946-2944f5004e42', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:28.462789+00'),
	('28b8d25f-3dee-4285-a9b5-37c09fd45b93', 'fe389499-231e-4ee7-8a70-1bfa410901ef', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:28.462789+00'),
	('914d40b9-323f-4af7-9f97-15b124947d61', 'fe389499-231e-4ee7-8a70-1bfa410901ef', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:28.462789+00'),
	('9d89132a-625a-4e6c-9df2-b77b37f97e17', 'fe389499-231e-4ee7-8a70-1bfa410901ef', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:28.462789+00'),
	('0ffc286d-0a86-4bfa-bd76-48f8d0f14cc8', 'fe389499-231e-4ee7-8a70-1bfa410901ef', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:28.462789+00'),
	('9b8a2408-a3b7-4b44-a521-d2f955b56d82', 'fe389499-231e-4ee7-8a70-1bfa410901ef', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:28.462789+00'),
	('8478a938-effc-47c2-914f-1314bd5d7021', 'fe389499-231e-4ee7-8a70-1bfa410901ef', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:28.462789+00'),
	('d6eab86a-5ddf-432d-92f2-9526586720ca', '7eae30c3-2fa0-4bd1-94e4-112b220d70f2', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:28.462789+00'),
	('9a75dfe2-d049-4fe0-852c-c716cc3c8e06', '7eae30c3-2fa0-4bd1-94e4-112b220d70f2', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:28.462789+00'),
	('a3d21b7e-5a8b-4944-897b-235f31c4a41a', '7eae30c3-2fa0-4bd1-94e4-112b220d70f2', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:28.462789+00'),
	('b6ce529b-3e17-4575-8bcb-22b7d4c44d5d', '7eae30c3-2fa0-4bd1-94e4-112b220d70f2', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:28.462789+00'),
	('91e68f46-bfe0-4761-8895-17e568dbad88', 'e5f37f81-57b0-434a-9bb7-e75e49799be3', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:28.462789+00'),
	('c810a4fd-bcd4-45b2-b92a-df9ec390eb4a', 'e5f37f81-57b0-434a-9bb7-e75e49799be3', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:28.462789+00'),
	('a052f689-f34f-4245-84d4-8cf98df2da67', 'e5f37f81-57b0-434a-9bb7-e75e49799be3', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:28.462789+00'),
	('a9e2c0b6-4370-43ac-b5ff-6bd75e6d15a2', '2432057e-558e-420d-9643-422e097abd71', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:28.462789+00'),
	('1941dcdd-76e5-45c9-a6ce-4f18ee9fb1c4', '2432057e-558e-420d-9643-422e097abd71', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:28.462789+00'),
	('8253adaa-1121-4a24-a503-31742bfeb665', '2432057e-558e-420d-9643-422e097abd71', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:28.462789+00'),
	('16ddc6bf-70d4-4e88-a9d0-f1aea79f2093', '2432057e-558e-420d-9643-422e097abd71', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:28.462789+00'),
	('002b3128-ffb4-4297-a900-5b3defb8bd69', '2432057e-558e-420d-9643-422e097abd71', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:28.462789+00'),
	('15633425-0a2e-4445-9823-87a45ffc6d84', '2432057e-558e-420d-9643-422e097abd71', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:28.462789+00'),
	('6cdb02a2-57bc-4c2e-8ead-1494e6174849', '3ec0fe21-89fb-40e6-a967-4ce054df0166', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:28.462789+00'),
	('6a7dc427-44c7-4b6f-a2c2-961e8e55012a', '3ec0fe21-89fb-40e6-a967-4ce054df0166', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:28.462789+00'),
	('b8f1c5e0-eec5-4e75-b312-91ee79ef0815', '3ec0fe21-89fb-40e6-a967-4ce054df0166', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:28.462789+00'),
	('70b9d0c7-240c-4be4-bf0d-80c1aa2e37a4', '3ec0fe21-89fb-40e6-a967-4ce054df0166', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:28.462789+00'),
	('f9d545c1-29ab-4d85-bfcf-97e6c4c97ae2', '3ec0fe21-89fb-40e6-a967-4ce054df0166', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:28.462789+00'),
	('11e9c676-62cb-4c26-98b0-bf6a5580c136', '3ec0fe21-89fb-40e6-a967-4ce054df0166', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:28.462789+00'),
	('9b0197ee-46e3-4231-80ac-a5a6b8cc52bb', 'cf755d12-c463-4b78-97c8-0ce4d51a75bd', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:28.462789+00'),
	('e49f3987-bb71-4e62-8fa6-210ba24803bc', 'cf755d12-c463-4b78-97c8-0ce4d51a75bd', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:28.462789+00'),
	('164246ce-e579-40de-933b-2640012b9a76', 'cf755d12-c463-4b78-97c8-0ce4d51a75bd', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:28.462789+00'),
	('316c4556-6e8b-490c-b4fd-7badba5a3a38', 'cf755d12-c463-4b78-97c8-0ce4d51a75bd', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:28.462789+00'),
	('2f3cf778-ffb2-478d-83b9-b3664275181e', 'cf755d12-c463-4b78-97c8-0ce4d51a75bd', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:28.462789+00'),
	('20d681ba-df69-49a1-ba66-983024ae3b19', '0f7bc805-0279-43ea-98ed-ef32ce09656b', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:28.462789+00'),
	('01e1dfb5-9e4b-4cbc-9134-8b2a1ff138e2', '0f7bc805-0279-43ea-98ed-ef32ce09656b', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:28.462789+00'),
	('f9303f6c-5fca-48d5-9eff-3008a61c874c', '0f7bc805-0279-43ea-98ed-ef32ce09656b', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:28.462789+00'),
	('9809d9db-7b4d-410e-8a75-870bb680c980', '0f7bc805-0279-43ea-98ed-ef32ce09656b', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:28.462789+00'),
	('0e486d9c-f6ff-4cfc-a432-708ec33efada', 'c1309b79-25b0-4be4-ac8d-d873ef6be102', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:28.462789+00'),
	('5aafe208-bebe-4d23-b6cd-ac47f2e0fd79', 'c1309b79-25b0-4be4-ac8d-d873ef6be102', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:28.462789+00'),
	('580286de-5646-4f53-8196-9dbb1d154e56', 'c1309b79-25b0-4be4-ac8d-d873ef6be102', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:28.462789+00'),
	('e9f982a3-2a54-4194-a6a4-3381cfb2bf7e', 'c1309b79-25b0-4be4-ac8d-d873ef6be102', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:28.462789+00'),
	('a2ff3fa7-0b84-40fd-afda-4869ab24fe94', 'c1309b79-25b0-4be4-ac8d-d873ef6be102', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:28.462789+00'),
	('692a5906-cb3c-4534-9f50-1abccd1e314d', 'c1309b79-25b0-4be4-ac8d-d873ef6be102', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:28.462789+00'),
	('fc9e1085-088f-48cc-be53-c958e6662acf', '4e1afad2-7b5f-4949-997b-2a0e2e771ce7', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:28.462789+00'),
	('dfcb55ad-fe85-4299-996c-d1d43e0f2133', '4e1afad2-7b5f-4949-997b-2a0e2e771ce7', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:28.462789+00'),
	('441439f8-b30c-4bdb-b73b-91cf8972e003', '4e1afad2-7b5f-4949-997b-2a0e2e771ce7', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:28.462789+00'),
	('f0ec4579-d3d0-4e6e-8a21-ec71c635c23b', '0243f02d-7abd-4e9e-bb20-67cfd4f716f1', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:28.462789+00'),
	('950bfb02-cc65-4ffd-9b53-04e818cf77cc', 'c00783f6-2457-40c1-995c-4b074c82b986', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:28.462789+00'),
	('49f46649-c8b8-4f6d-b5bf-d6c9db17e238', '14544436-ef17-459f-9d9a-592b1fc101a2', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:23:28.462789+00'),
	('abb59690-63ca-4112-b544-cd7c95a171ad', 'f6fdb489-5678-43c1-87ed-a4b7c14d0011', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:23:28.462789+00'),
	('b58cfea8-cb0d-4d2a-bd36-413ab162ef57', 'f6fdb489-5678-43c1-87ed-a4b7c14d0011', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:28.462789+00'),
	('c9a7e80a-3ec0-445c-8a9c-0a913eb161f9', 'f6fdb489-5678-43c1-87ed-a4b7c14d0011', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:23:28.462789+00'),
	('9e42ade9-289b-45c7-900e-26685535d986', '881f2b69-79e2-41e2-b117-8c5f092e6cdb', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:28.462789+00'),
	('c0ba5761-6557-4f68-af93-e2d2e282af92', '881f2b69-79e2-41e2-b117-8c5f092e6cdb', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:23:28.462789+00'),
	('ff2f11f1-807f-4cb5-829a-cde7abb6c26e', '881f2b69-79e2-41e2-b117-8c5f092e6cdb', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:28.462789+00'),
	('c7efa3c7-8d84-4452-85d7-f0048d7786a0', '6d67ea64-9861-4af4-a0ab-4e67ccd0d505', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:28.462789+00'),
	('1f67cee8-d5ce-4c16-8590-c5d10f6c6100', '6d67ea64-9861-4af4-a0ab-4e67ccd0d505', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:28.462789+00'),
	('d91e73c9-e181-4efc-bf35-305a7c85b5eb', 'a88204c6-6ff8-4325-84fe-6b834aff7618', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:23:28.462789+00'),
	('02ac7f17-3855-41f2-9c36-5ee61882c724', 'a88204c6-6ff8-4325-84fe-6b834aff7618', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:23:28.462789+00'),
	('d6d2162a-11bc-468d-b12a-9b2f95e3343d', 'a88204c6-6ff8-4325-84fe-6b834aff7618', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:23:28.462789+00'),
	('530be923-9177-4e2c-98d0-dcb79d545bed', 'a88204c6-6ff8-4325-84fe-6b834aff7618', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:23:28.462789+00'),
	('f80c75b8-618d-4cb9-9129-ff7972f1637e', '6c9a03fd-0719-44cf-a3e9-e0516402e932', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:14.178664+00'),
	('671e7c56-f9b9-44de-84a4-6a4ce6b95347', '6c9a03fd-0719-44cf-a3e9-e0516402e932', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:14.178664+00'),
	('e8c17b5c-4f44-4cf5-ad15-9dbbb93036b6', '514234d0-0ec5-44ba-84f4-f6c0e2826806', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:14.178664+00'),
	('765df612-3e26-4005-9ef8-9e9f0783ce9e', '514234d0-0ec5-44ba-84f4-f6c0e2826806', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:14.178664+00'),
	('e3325559-e649-417a-b70c-20fc8dbf7efb', '514234d0-0ec5-44ba-84f4-f6c0e2826806', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:14.178664+00'),
	('111d906b-3b1c-473a-8303-5b6bfba95b5d', '514234d0-0ec5-44ba-84f4-f6c0e2826806', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:14.178664+00'),
	('cb626e54-c858-4aeb-9a87-c748fb210845', '514234d0-0ec5-44ba-84f4-f6c0e2826806', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:14.178664+00'),
	('f19dd7ea-3473-4f7e-87d7-70f5892f0296', '8771334c-5019-44ce-9f01-5cb53de749ec', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:14.178664+00'),
	('128c0ea9-3643-4a99-ba1a-62192bc7bb1f', '8771334c-5019-44ce-9f01-5cb53de749ec', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:14.178664+00'),
	('ef9259d7-62af-4aba-aee8-7973d40f08d5', '8771334c-5019-44ce-9f01-5cb53de749ec', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:14.178664+00'),
	('66c1b912-5f49-455f-8f9b-86a8415e0206', '8771334c-5019-44ce-9f01-5cb53de749ec', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:14.178664+00'),
	('031d799b-17d3-49c7-9f73-adabb413ec0d', '8771334c-5019-44ce-9f01-5cb53de749ec', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:14.178664+00'),
	('7759ec86-7236-487f-a8ed-db0c437247e6', '8771334c-5019-44ce-9f01-5cb53de749ec', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:14.178664+00'),
	('12cb4510-3914-470a-9340-44c839a54268', '8771334c-5019-44ce-9f01-5cb53de749ec', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:14.178664+00'),
	('404dd8bd-6667-41cd-8dff-097468e09bb1', '8771334c-5019-44ce-9f01-5cb53de749ec', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:14.178664+00'),
	('7fbc7d98-ea0f-4da3-9608-bfed02156ae6', '1c1be2ab-5544-4193-ab87-2f4649796172', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:14.178664+00'),
	('387c0a2a-0ca1-424a-a931-ec63a2aa2d60', '1c1be2ab-5544-4193-ab87-2f4649796172', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:14.178664+00'),
	('c1a2fb50-f1a6-48cd-9ccc-0a9a8a539f6b', '1c1be2ab-5544-4193-ab87-2f4649796172', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:14.178664+00'),
	('c161223e-1935-418d-90a3-a258a49922b1', '1c1be2ab-5544-4193-ab87-2f4649796172', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:14.178664+00'),
	('20ea07ac-11b4-4bef-b675-a533cb9b785a', '1c1be2ab-5544-4193-ab87-2f4649796172', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:14.178664+00'),
	('ae6b99f2-b889-4af7-b626-7b15a8de6f31', '1c1be2ab-5544-4193-ab87-2f4649796172', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:14.178664+00'),
	('50c46851-3e7e-44b7-947f-320708f83997', '1c1be2ab-5544-4193-ab87-2f4649796172', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:14.178664+00'),
	('5631ba36-813d-491b-8a70-4079c11ba93d', '1c1be2ab-5544-4193-ab87-2f4649796172', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:14.178664+00'),
	('053b61e6-cf6a-4df8-abcb-afe3bc486039', '221c996e-bcf0-4b38-bcbe-6f2920750128', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:14.178664+00'),
	('fd332b96-1b67-4c2c-8281-53cf89634133', '221c996e-bcf0-4b38-bcbe-6f2920750128', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:14.178664+00'),
	('1c325ce8-063b-4450-b593-49353bc44d61', '221c996e-bcf0-4b38-bcbe-6f2920750128', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:14.178664+00'),
	('786fc9d5-a5e2-4f3f-8011-2f2fd0935e74', '221c996e-bcf0-4b38-bcbe-6f2920750128', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:14.178664+00'),
	('b088e659-9019-473e-8dd5-dc32a8606604', '221c996e-bcf0-4b38-bcbe-6f2920750128', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:14.178664+00'),
	('5b734516-f85b-4577-bab8-26035ad65e5d', '221c996e-bcf0-4b38-bcbe-6f2920750128', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:14.178664+00'),
	('5fcfc408-8bb3-4638-97fa-0a10cabe41a1', '221c996e-bcf0-4b38-bcbe-6f2920750128', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:14.178664+00'),
	('0246c942-0960-420a-8187-fea5d0ea8163', '221c996e-bcf0-4b38-bcbe-6f2920750128', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:14.178664+00'),
	('a7b5c645-a0b2-48b8-8a68-7d7aba247100', 'c82baa0f-525f-43d8-99e7-e75a83ae579e', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:14.178664+00'),
	('7e196652-b055-4eeb-8b73-db1c30083fb9', 'c82baa0f-525f-43d8-99e7-e75a83ae579e', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:14.178664+00'),
	('7e85f4f8-fe5f-4409-9349-635504226578', 'c82baa0f-525f-43d8-99e7-e75a83ae579e', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:14.178664+00'),
	('42bc967e-e3ab-4779-86d7-4c25a0a9588d', 'c82baa0f-525f-43d8-99e7-e75a83ae579e', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:14.178664+00'),
	('e936cb59-ff5e-4dea-b2e8-be458917e7f3', 'c82baa0f-525f-43d8-99e7-e75a83ae579e', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:14.178664+00'),
	('38aaf8f0-b17e-45bf-a85b-760133f76bba', '5aa10828-cac9-4788-a75e-ff1414283102', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:14.178664+00'),
	('e12620a2-1532-4e0f-a20c-49c50a19f77d', '5aa10828-cac9-4788-a75e-ff1414283102', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:14.178664+00'),
	('4cbc88f4-fd94-4be5-8488-f14c6cb3fc7a', '5aa10828-cac9-4788-a75e-ff1414283102', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:14.178664+00'),
	('d74cef8d-c43a-4033-8ad4-62adb7f3501c', '5aa10828-cac9-4788-a75e-ff1414283102', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:14.178664+00'),
	('0b111d3a-bfdd-4859-8e46-657f36683c82', '5aa10828-cac9-4788-a75e-ff1414283102', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:14.178664+00'),
	('40bd698b-1b5f-4bd9-8b6d-e6e9a5331452', '5aa10828-cac9-4788-a75e-ff1414283102', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:14.178664+00'),
	('c0c36a82-4b5f-42ed-971b-5b1fa937ddf6', '5aa10828-cac9-4788-a75e-ff1414283102', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:14.178664+00'),
	('1fd58b49-d5f3-4ce6-b1fb-dc47f626e488', '13a56082-0cfe-4a14-ba95-23712c2a0d83', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:14.178664+00'),
	('72063d7d-f1bd-479f-b060-bb9a650bb07c', '13a56082-0cfe-4a14-ba95-23712c2a0d83', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:14.178664+00'),
	('5c509ab1-c1d0-4428-a0f6-6b67c4331236', '13a56082-0cfe-4a14-ba95-23712c2a0d83', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:14.178664+00'),
	('0142a0e0-caca-4841-969b-c2174569191e', '13a56082-0cfe-4a14-ba95-23712c2a0d83', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:14.178664+00'),
	('3fed031c-636f-4c2b-a9f9-312fb661797d', '13a56082-0cfe-4a14-ba95-23712c2a0d83', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:14.178664+00'),
	('4abcb4b7-a113-4859-80a5-433fffeeec50', '13a56082-0cfe-4a14-ba95-23712c2a0d83', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:14.178664+00'),
	('a6fd48b8-b9ac-4036-ba6d-f7b42a386fe0', '13a56082-0cfe-4a14-ba95-23712c2a0d83', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:14.178664+00'),
	('b8432a04-d23a-43d3-9e15-3d37afee7a9a', '13a56082-0cfe-4a14-ba95-23712c2a0d83', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:14.178664+00'),
	('1a270d1c-7e12-466f-a3cb-91712410fbfd', '1285919b-d064-4c96-b8aa-354dfa3f3e89', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:14.178664+00'),
	('ada28d20-64ed-4557-90f8-14aaea9a4b49', '1285919b-d064-4c96-b8aa-354dfa3f3e89', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:14.178664+00'),
	('7dc454aa-88b0-460d-bf53-02fe4b0ec66a', '1285919b-d064-4c96-b8aa-354dfa3f3e89', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:14.178664+00'),
	('1519d3d0-60ea-4743-aa65-ad59435cba49', '1285919b-d064-4c96-b8aa-354dfa3f3e89', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:14.178664+00'),
	('6543b40f-e599-46e9-ba43-d743be7081ef', '1285919b-d064-4c96-b8aa-354dfa3f3e89', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:14.178664+00'),
	('bf27aa88-1841-42f6-a047-d7b94acc94f2', '1285919b-d064-4c96-b8aa-354dfa3f3e89', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:14.178664+00'),
	('17e06ea1-4e88-4d8c-870d-91cb83d187ce', '1285919b-d064-4c96-b8aa-354dfa3f3e89', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:14.178664+00'),
	('3d19897b-6797-4ce7-9ca8-b0e8fc4ac855', '1285919b-d064-4c96-b8aa-354dfa3f3e89', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:14.178664+00'),
	('cfc2e8e8-67a6-452f-8179-292b50ad4c7f', '56c9d72d-5b8f-4aab-9113-f60fa8b500b0', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:14.178664+00'),
	('2f370edc-4c2b-4aa2-9610-793c900f86bb', '56c9d72d-5b8f-4aab-9113-f60fa8b500b0', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:14.178664+00'),
	('f288c488-daed-4e6b-831f-64d67beeaacc', '56c9d72d-5b8f-4aab-9113-f60fa8b500b0', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:14.178664+00'),
	('b6645e07-54b9-4ff1-98d3-55372c08edd1', '56c9d72d-5b8f-4aab-9113-f60fa8b500b0', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:14.178664+00'),
	('92af6d71-70a0-4249-91c5-8f100831c722', '56c9d72d-5b8f-4aab-9113-f60fa8b500b0', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:14.178664+00'),
	('790bf280-2578-4cbd-bb1f-e9c3407af6da', '56c9d72d-5b8f-4aab-9113-f60fa8b500b0', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:14.178664+00'),
	('1bc45c03-ba58-4c92-b099-0eca6e248288', '56c9d72d-5b8f-4aab-9113-f60fa8b500b0', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:14.178664+00'),
	('5edc881a-c2e6-4593-bdcf-87e00d77a07c', '56c9d72d-5b8f-4aab-9113-f60fa8b500b0', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:14.178664+00'),
	('6772cae1-19cc-4acf-bfa7-a802c1bc6558', '3550f73f-992b-4291-b080-79030f2388b3', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:14.178664+00'),
	('e65d677b-b17b-441e-b055-5b7eb283268b', '3550f73f-992b-4291-b080-79030f2388b3', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:14.178664+00'),
	('e1aa06aa-a8c0-40ad-af9e-6f8c1face55e', '3550f73f-992b-4291-b080-79030f2388b3', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:14.178664+00'),
	('243028ff-ba25-41fc-a282-e7162d7114e6', '3550f73f-992b-4291-b080-79030f2388b3', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:14.178664+00'),
	('1675202b-c146-4e7a-a478-7de840e31294', '3550f73f-992b-4291-b080-79030f2388b3', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:14.178664+00'),
	('3ba6313b-eee8-4fed-9184-56ab06a483ab', '3550f73f-992b-4291-b080-79030f2388b3', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:14.178664+00'),
	('e35abbb7-5f5a-43dc-963a-928c5112cd67', '3550f73f-992b-4291-b080-79030f2388b3', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:14.178664+00'),
	('bba640ff-77f1-434e-9172-f7ca9df0535e', '3550f73f-992b-4291-b080-79030f2388b3', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:14.178664+00'),
	('df8a9489-59e9-4e42-8a98-0d92b94c1426', '57e406bb-e316-4223-945b-dd8ef6e12101', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:14.178664+00'),
	('520566e0-9a08-4bca-adb0-5c37d5be3be7', '57e406bb-e316-4223-945b-dd8ef6e12101', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:14.178664+00'),
	('1ce019b9-f2e0-45b7-add1-aee43f10ef2d', '57e406bb-e316-4223-945b-dd8ef6e12101', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:14.178664+00'),
	('9a2974c7-3df8-433d-9aa2-fd36708f8674', '57e406bb-e316-4223-945b-dd8ef6e12101', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:14.178664+00'),
	('d04cceef-4644-436f-a5bc-9cd02fc47f4d', '57e406bb-e316-4223-945b-dd8ef6e12101', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:14.178664+00'),
	('5217e074-414d-4426-9bc7-0581ed556570', '57e406bb-e316-4223-945b-dd8ef6e12101', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:14.178664+00'),
	('5ab2a414-ae7e-4439-bd62-bfd631d5a0ef', '57e406bb-e316-4223-945b-dd8ef6e12101', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:14.178664+00'),
	('ae990745-b31f-460e-9e3a-55668b33e1c0', '57e406bb-e316-4223-945b-dd8ef6e12101', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:14.178664+00'),
	('9e4bcd55-a94b-4274-90a9-45571eeec5f7', '5d04c2f3-f9ab-475a-9a4e-b5772ce7d6d2', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:14.178664+00'),
	('73d4c5db-511d-4bec-99cd-bea0fe5dec66', '5d04c2f3-f9ab-475a-9a4e-b5772ce7d6d2', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:14.178664+00'),
	('28ac54d5-e284-4573-b413-06968f1e127b', '5d04c2f3-f9ab-475a-9a4e-b5772ce7d6d2', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:14.178664+00'),
	('641d3695-4463-4d3e-9c86-d6b127b0fc40', '5d04c2f3-f9ab-475a-9a4e-b5772ce7d6d2', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:14.178664+00'),
	('d5501b6c-1b5b-4928-a888-61da74b90ea8', '5d04c2f3-f9ab-475a-9a4e-b5772ce7d6d2', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:14.178664+00'),
	('3fc08c24-a781-45ac-b1d5-8cf471a1cd68', '5d04c2f3-f9ab-475a-9a4e-b5772ce7d6d2', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:14.178664+00'),
	('40fbfff2-f943-484b-a626-d7dc95790cd1', '5d04c2f3-f9ab-475a-9a4e-b5772ce7d6d2', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:14.178664+00'),
	('3fa0eee8-5762-4738-90cf-f6684cf413bc', '5d04c2f3-f9ab-475a-9a4e-b5772ce7d6d2', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:14.178664+00'),
	('fa58e68c-3bda-4d0e-8d4c-23cd5d1973fe', 'b6dadbca-aa4c-4ac6-bbde-6584178b4736', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:37.061585+00'),
	('9f8699f5-e58a-40bd-8c99-edc2d300f52d', 'b6dadbca-aa4c-4ac6-bbde-6584178b4736', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:37.061585+00'),
	('d40dd5ec-17b3-48dd-9db1-da0fd25d0ff0', 'cbdc76d2-cf85-4cfa-8301-32565957df0f', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:37.061585+00'),
	('eec2710d-5c36-4b28-8ecb-c3504a2d3594', 'fba70339-6d27-470e-9543-657e3e5b0e4c', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:37.061585+00'),
	('c9565855-cdab-4292-b576-260380df85c2', 'fba70339-6d27-470e-9543-657e3e5b0e4c', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:37.061585+00'),
	('1068d12a-17e9-4d9e-87ed-43f47bf0f79a', 'fba70339-6d27-470e-9543-657e3e5b0e4c', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:37.061585+00'),
	('043e6445-03a1-4372-b2c8-9837388855f5', 'fba70339-6d27-470e-9543-657e3e5b0e4c', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:37.061585+00'),
	('a8a7c575-8161-4687-ab0e-9082c181c34a', 'fba70339-6d27-470e-9543-657e3e5b0e4c', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:37.061585+00'),
	('d97bf4bf-0a2f-4d21-8782-febbebee9077', 'fba70339-6d27-470e-9543-657e3e5b0e4c', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:37.061585+00'),
	('db8bfdae-f7ed-4a53-ad1d-4df6daddf66a', 'fba70339-6d27-470e-9543-657e3e5b0e4c', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:37.061585+00'),
	('033da6ca-e9d9-44f3-8856-f3cbecee8103', 'fba70339-6d27-470e-9543-657e3e5b0e4c', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:37.061585+00'),
	('4d0a0cca-0c94-4c27-a265-400a63a82b46', '89734220-bfff-4b18-846a-ba5e11428c98', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:37.061585+00'),
	('4ea63fdc-7659-411a-a072-de4263ff0706', '89734220-bfff-4b18-846a-ba5e11428c98', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:37.061585+00'),
	('d5dcd65b-a1d4-40e3-baf8-425560675edb', '89734220-bfff-4b18-846a-ba5e11428c98', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:37.061585+00'),
	('dd9a9e41-b37f-4435-8350-8c426b3facd5', '89734220-bfff-4b18-846a-ba5e11428c98', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:37.061585+00'),
	('c661c6ea-10ac-4414-8785-8d39fe748615', '89734220-bfff-4b18-846a-ba5e11428c98', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:37.061585+00'),
	('0a66a9fa-05e6-447e-9457-c677ca7f3f99', '89734220-bfff-4b18-846a-ba5e11428c98', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:37.061585+00'),
	('baa20580-4194-401c-881a-bc3e228a9eb6', '89734220-bfff-4b18-846a-ba5e11428c98', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:37.061585+00'),
	('206164d2-3ea6-4f06-8e9e-3653e9f88496', '89734220-bfff-4b18-846a-ba5e11428c98', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:37.061585+00'),
	('8d7ba152-e783-4451-84a0-0975b12f6ba4', 'd2065eeb-6e36-4066-b40a-960637142cf1', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:37.061585+00'),
	('8572b28d-8c9b-47c6-90f2-6cfe5bea117d', 'd2065eeb-6e36-4066-b40a-960637142cf1', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:37.061585+00'),
	('5bbff472-1405-4be4-9fd8-0d35f72ad981', 'd2065eeb-6e36-4066-b40a-960637142cf1', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:37.061585+00'),
	('1436d98f-18b0-4ca7-a0c1-0d97e9281900', 'd2065eeb-6e36-4066-b40a-960637142cf1', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:37.061585+00'),
	('9f74acf2-de52-4305-aef8-060332e3708e', 'd2065eeb-6e36-4066-b40a-960637142cf1', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:37.061585+00'),
	('08ff43b6-f428-443b-a8e0-34bb2635ff2d', 'd2065eeb-6e36-4066-b40a-960637142cf1', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:37.061585+00'),
	('28a0577b-0eb2-4d27-b373-9249b55aaeb8', 'd2065eeb-6e36-4066-b40a-960637142cf1', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:37.061585+00'),
	('460d5a37-dff4-45cd-bf94-610536cb2560', 'd2065eeb-6e36-4066-b40a-960637142cf1', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:37.061585+00'),
	('7f16446d-d479-4b80-b99e-0992c505d5b5', 'acfd2978-8b22-4db3-84ad-a7c715d4a0cb', 'c0a82436-914b-45e9-8d4f-f0fd499a2661', '2026-03-13 19:37:37.061585+00'),
	('fce922e9-5f7b-4824-818d-678baeab4375', 'acfd2978-8b22-4db3-84ad-a7c715d4a0cb', '119841f7-0427-4c71-ae6d-0c48b94ca383', '2026-03-13 19:37:37.061585+00'),
	('7f5fce03-e112-4d40-a056-51752e65cd70', 'acfd2978-8b22-4db3-84ad-a7c715d4a0cb', '71857524-bc6d-4a5d-8c5f-834546caf2c1', '2026-03-13 19:37:37.061585+00'),
	('a36baf88-8cf7-4b0d-b310-94ba98390984', 'acfd2978-8b22-4db3-84ad-a7c715d4a0cb', '03422484-5964-4cc6-8b1c-cc09aeead777', '2026-03-13 19:37:37.061585+00'),
	('491865a8-8b31-4db0-ad96-3631cc17995f', 'acfd2978-8b22-4db3-84ad-a7c715d4a0cb', '4202f30d-ff7a-42ff-bb38-76df19cdd90b', '2026-03-13 19:37:37.061585+00'),
	('8106e904-c767-4c9e-8117-289b6b1bafb2', 'acfd2978-8b22-4db3-84ad-a7c715d4a0cb', 'd6c1e04a-4360-403c-9f1c-144d8d9b37e1', '2026-03-13 19:37:37.061585+00'),
	('8fac06ad-a73a-4615-8c30-0636fb1c2452', 'acfd2978-8b22-4db3-84ad-a7c715d4a0cb', '78361e9e-be29-46e9-b04a-879040255ddf', '2026-03-13 19:37:37.061585+00'),
	('70d7f79e-f204-4dd6-98f1-909aed36b347', 'acfd2978-8b22-4db3-84ad-a7c715d4a0cb', 'ba45f259-c180-42a5-9cea-7ae3d5560a79', '2026-03-13 19:37:37.061585+00');


--
-- Data for Name: equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."equipment" ("id", "spectrum_code", "description", "equipment_type", "brand", "model", "serial_number", "year", "status", "current_location", "created_at", "plate", "capacity", "type_code", "inspection_type", "current_project_id", "notes", "weight_class", "acquisition_type", "last_inspection_date", "next_inspection_due", "meter_reading", "insurance_expiry", "updated_at", "parent_equipment_id") VALUES
	('a34fe1d3-809a-46b8-96b3-b810de278616', 'AND001', 'SIST ANDAMIO MULTIDIRECCIONAL', 'Equipos de Almacen', 'DOKA', 'AT-PAC RINGLOCK', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ca87a880-c5e4-4331-a2ae-b635466b40f3', 'BMA655', 'BOMBA/AGUA 8" HYD SUB 2500 GPM', 'Equipo Pesado', 'HOLLAND', 'H40D655', NULL, 1995, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ca0e2d2f-d91e-4992-b647-4ba6e13c345f', 'BUS008', 'BUS 7P', 'Vehiculos Livianos', 'SUZUKI', 'APV', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('a17b32c4-6fd0-4807-b9e0-f98b76114c1e', 'BUS009', 'BUS 7P', 'Vehiculos Livianos', 'SUZUKI', 'APV', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d7a770bd-b664-4d12-938c-853c2eee37b0', 'BUS010', 'BUS 7P', 'Vehiculos Livianos', 'SUZUKI', 'APV', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('632d9eb7-a997-4f1d-8886-3a01a0713232', 'CMP940', 'COMPACTACION 25 T', 'Equipo Pesado', 'VOLVO', 'SD100C', NULL, 2008, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d1029e23-3e0c-4649-8bb1-3acc5cfac2d0', 'CNT003', 'Contenedor de Oficina 20"', 'Equipos de Almacen', NULL, NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('9ce64cac-44cd-4009-8e83-24a70379187c', 'CNT005', 'Contenedor de Oficina 20"', 'Equipos de Almacen', NULL, NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('438db661-7ac2-4dce-9261-c3638833b907', 'CNT006', 'Contenedor de Oficina 20"', 'Equipos de Almacen', NULL, NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f3777fc2-7e61-4923-85a7-3582f9844357', 'CNT007', 'Contenedor de Oficina 20"', 'Equipos de Almacen', NULL, NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('1a96df6f-9145-417e-adc3-2a669ff25534', 'CNT008', 'Contenedor de Almacen 40"', 'Equipos de Almacen', NULL, NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2403225d-a7e8-437f-82d0-09d8966a9cbf', 'CNT009', 'Contenedor de Almacen 40"', 'Equipos de Almacen', NULL, NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ef8fd75a-045d-4b0d-8a16-be4e4d69f99a', 'CNT010', 'Contenedor de Almacen 40"', 'Equipos de Almacen', NULL, NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('9c19a918-2479-4e08-b43a-c2470a5d6d52', 'CNT011', 'Contenedor de Almacen 20"', 'Equipos de Almacen', NULL, NULL, NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('15cf28f2-d3f3-49cf-b2e9-5c7a86270e5e', 'CNT012', 'Contenedor de Almacen 20"', 'Equipos de Almacen', NULL, NULL, NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('212140bc-bb83-48ac-9aed-6b3072a8e1f4', 'CON085', 'BOMBA DE LECHADA', 'Fundaciones', 'OBERMANN GMBH', 'VS110-D', NULL, 2013, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('cb34b41f-00b2-4e62-9d17-bfbfe39a861b', 'CON130', 'BOMBA DE CONCRETO', 'Equipo Pesado', 'BETON MASTER', 'TURBOSOL', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('37221732-0cc5-433f-9856-f1f634cbd943', 'CON553', 'BOMBA DE LECHADA', 'Fundaciones', 'JET CONSTRUCTION EQU', 'CHEMGROUT-OG55-3C4-D', NULL, 2007, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('e226b352-8206-41c5-9426-62c9c71a9d42', 'CPR654', 'COMPRESOR DE AIRE', 'Equipo Liviano', 'ATLAS', 'XAS185', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQL', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('e5de970a-0707-460d-88d7-ff126a3a60e5', 'CRG036', 'CARGADOR 3.92 CY', 'Equipo Pesado', 'CHENGGONG', 'ZL50E-II', NULL, 2009, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('73a6e0ef-82da-43f8-883d-a7e3db5403f3', 'DEM025', 'MARTILLO HID DEMOLICION', 'Equipo Pesado', 'FRD', 'FURUKAWA F6', NULL, 2011, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('6b58aaac-4893-4d02-bc0f-ff565417db0b', 'DEM404', 'BOMBA/AGUA HI-PRESS 24000 PSI', 'Equipo Pesado', 'HAMMELMANN', 'HDP-154', NULL, 2014, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0d6f0d42-18b9-4d75-8c1f-a46f673f556e', 'DEM405', 'JET FRAME 201', 'Equipo Pesado', 'NALTA', NULL, NULL, 2018, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f9c04744-7a20-47f2-8416-d62db5a88f73', 'DEM724', 'MARTILLO HIDRAULICO', 'Equipo Pesado', 'AJCE', '810M', NULL, 2012, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('3bb323d2-9a22-4b9b-8dc9-9289563cf8b1', 'DML911', 'MARTILLO DEMOLEDOR', 'Equipos de Almacen', 'DEWALT', 'D25911K', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('fa3edb89-a1fa-4e14-894d-51c70e251a46', 'DOZ299', 'BULLDOZER 310HP', 'Equipo Pesado', 'CATERPILLAR', 'D8H', NULL, 1973, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2dbd54d6-01f5-42b0-87fa-d0e98f38323b', 'DOZ659', 'BULLDOZER 125HP', 'Equipo Pesado', 'JOHN DEERE', '700J', NULL, 2011, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0fb7946a-c352-4a5a-b2dc-8cce26198c6e', 'DOZ892', 'BULLDOZER 170HP', 'Equipo Pesado', 'CATERPILLAR', 'D6H', NULL, 1996, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('456fe872-c3fd-47ac-a2c0-6fe67d20fac9', 'DSK001', 'Desktop', 'Tecnologia', 'HP', 'PRODESK 400', NULL, 2014, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('5eb30980-f401-4547-a49f-74064275505b', 'DSK002', 'Desktop', 'Tecnologia', 'CLONE', 'CLONE', NULL, 2016, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2c8e9620-3736-41c3-aaf0-46e01cd0d84b', 'DSK003', 'Desktop', 'Tecnologia', 'CLONE', 'CLONE', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('18eac31f-d98c-4e76-81e3-0bc6d485e84c', 'DSK004', 'Mini Desktop', 'Tecnologia', 'DELL', 'D15U', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('7efb2349-22fd-41cd-8ea5-a9bd578bb49a', 'DSK005', 'Mini Desktop', 'Tecnologia', 'HP', 'PRP MINI 400 G9', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('1c3f94eb-6b3c-4e44-ac89-2ac201a2d60f', 'EXA210', 'BRAZO LARGO JOHN DEERE 16M', 'Equipo Pesado', 'JOHN DEERE', '210', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('24aed8e1-e318-4b1f-ba54-096909144427', 'EXC001', 'ACOPLE HIDRAULICO', 'Equipo Pesado', 'KINGER', 'YDH-QC08', NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('08f02846-bb59-4fe8-8921-1b620c0add9b', 'EXC002', 'ACOPLE HIDRAULICO', 'Equipo Pesado', 'KINGER', 'YDH-QC017', NULL, 2026, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('074e04b4-a03d-4552-a4bb-55edf41a4c59', 'EXC447', 'EXCAVADORA 20T', 'Equipo Pesado', 'DOOSAN', 'DX225LCA', NULL, 2013, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('c0841562-28c3-4a6b-a66b-477177dc2fd4', 'EXC556', 'EXCAVADORA 20T', 'Equipo Pesado', 'JOHN DEERE', '210G', NULL, 2013, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('44ea8355-e907-4386-9ec4-8e51e72befba', 'EXC559', 'EXCAVADORA 20T', 'Equipo Pesado', 'JOHN DEERE', '210G', NULL, 2013, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('e6628b32-2e15-44a2-af31-fd47cf1d621e', 'EXR001', 'RODAJE VOLVO 330 REHAB', 'Equipo Pesado', 'VOLVO', '330', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f007564c-989a-42fc-a973-22aef825ec02', 'CNT002', 'Contenedor de 40"', 'Equipos de Almacen', NULL, NULL, NULL, 2022, 'Activo', 'Paraiso', '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, '0b01a7a4-752d-43ac-b719-3fc61a13419a', NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-12 00:38:20.947724+00', NULL),
	('32cf79ee-2072-4802-ad28-7e7820144f0d', 'CNT004', 'Contenedor de Oficina 20"', 'Equipos de Almacen', NULL, NULL, NULL, 2022, 'Activo', 'Muelle 14', '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, '6743665e-4c7c-4604-8cd0-c54167dfe921', NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-12 14:03:58.893781+00', NULL),
	('0364c62e-ab1e-4aa3-8b7f-8cb3a7ae3326', 'GEN016', 'GENERADOR MD 40KVA', 'Equipo Liviano', 'OLYMPIAN', 'GEP44', NULL, 2010, 'Activo', 'Costa Norte', '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQL', 'HOROMETRO', 'c41f7384-a000-4753-8283-87223ced9d64', NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-12 16:11:55.017646+00', NULL),
	('60709c0b-1e65-46cc-bca4-6c2d93699b6d', 'EXC868', 'EXCAVADORA 30T', 'Equipo Pesado', 'VOLVO', 'EC-330BLC', NULL, 2007, 'Activo', 'Muelle 14', '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', 'HOROMETRO', '6743665e-4c7c-4604-8cd0-c54167dfe921', NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-12 17:21:02.04044+00', NULL),
	('f218c517-74f1-44fc-8707-77243c86ac9a', 'CNT001', 'Contenedor de 40"', 'Equipos de Almacen', NULL, NULL, NULL, 2022, 'Activo', 'Paraiso', '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, '0b01a7a4-752d-43ac-b719-3fc61a13419a', NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-15 22:14:53.615698+00', NULL),
	('70996fdd-74aa-415e-823f-fb24c777c2b2', 'GEN164', 'GENERADOR MD 80KVA', 'Equipo Liviano', 'OLYMPIAN', 'GEP88-1', NULL, 2007, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQL', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0b284a2e-df29-4549-a14a-c1cd2fcd8d00', 'GEN218', 'GENERADOR MD 34.4KVA', 'Equipo Liviano', 'HIMOINSA', 'HYW-35-M6', NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQL', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('20736a57-ed68-439b-913f-21d36cc0cb92', 'GNL001', 'Generador Electrico', 'Equipos de Almacen', 'GENERAC', 'GP8000E', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('19e2b295-94ca-471b-ac25-1afa0fac931f', 'GNL002', 'Generador Electrico', 'Equipos de Almacen', 'GENERAC', 'GP8000E', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('023ba73b-bf14-42d7-9510-c91f3aacbbbe', 'GRA001', 'INDICADOR DE MOMENTO', 'Gruas', 'RAYCO WYLIE', 'I4000', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('9f89e18a-966d-4c65-907d-f817ee95a6f4', 'GRA062', 'BOLA PARA GRUA 20 T', 'Gruas', NULL, 'PT-0062', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('1a1c17f3-b6a3-4fcb-8145-762b3d973dda', 'GRA064', 'BOLA PARA GRUA 15 T', 'Gruas', NULL, 'PT-0064', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('239893e1-21aa-4952-ab18-2476e66380cf', 'GRA093', 'PASTECA 65T', 'Gruas', 'MCKISSICK', 'M065T18L', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('8a1e08aa-05c9-4d14-a2a9-aeda1574e6ff', 'GRA133', 'BOLA PARA GRUA 8.5 T', 'Gruas', 'MILLER', 'HB13B-3N', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('dea87578-3abb-4ddf-ad6b-d5e735a1f285', 'GRA134', 'BOLA PARA GRUA 8.5 T', 'Gruas', 'MILLER', 'HB13B-3N', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('b1216fff-860f-491b-9131-7170bc11c049', 'GRA626', 'PASTECA 45T', 'Gruas', 'JOHNSON BLOCKS', '45T18RTB', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('a4ee6ca9-929a-4e8e-b9df-f610d8085a63', 'GRA687', 'PASTECA 115T', 'Gruas', 'MCKISSICK', 'M115QN24H', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('1f1a0ce1-5998-4c19-9bea-48b91ae7942f', 'GRU311', 'GRUA 45 T HYD', 'Gruas', 'GROVE', 'RT-745', NULL, 1994, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('c8fe7627-14db-4512-8361-035d0bf99be9', 'GRU481', 'GRUA 200 MT', 'Gruas', 'SANY', 'SCC8200', NULL, 2011, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('1035604b-47ae-4625-bdba-45d6498afc5d', 'GRU508', 'GRUA 150 T', 'Gruas', 'LINK BELT', 'LS518', NULL, 1977, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0955af8b-6136-4f68-9a94-b9b9e43542ba', 'GRU602', 'GRUA 20 T', 'Gruas', 'BUCYRUS-ERIE', '22BM', NULL, 1962, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('a8d23252-2ecd-4e15-b830-c69394a94a7a', 'GRU639', 'GRUA 45 T', 'Gruas', 'LINK BELT', 'LS108B', NULL, 1969, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('54d13b9d-5937-4bee-beba-a107d5458396', 'GRU818', 'GRUA 150 T', 'Gruas', 'LINK BELT', 'LS518', NULL, 1981, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('4713a74f-574d-4458-8537-f0085fa932bb', 'GRU939', 'GRUA 80 T', 'Gruas', 'LINK BELT', 'LS318', NULL, 1978, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('fca3ec56-60f9-42f6-81e2-e063492e717b', 'HRT001', 'Cortadora de concreto 14"', 'Equipos de Almacen', 'HUSQVARNA', 'PS400LV', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('e4d0972b-657d-4b0d-b212-121ca6830bea', 'HRT002', 'Perforadora de Concreto 10"', 'Equipos de Almacen', 'HUSQVARNA', 'DMS240', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('130eab53-befe-4a9d-9909-714c47863789', 'HRT003', 'Rotomartillo SDS MAX 2" 120V', 'Equipos de Almacen', 'MILWAUKEE', 'SDS MAX', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('b4f9c62b-261e-46a4-8da7-86af001aca35', 'HRT004', 'Rotomartillo SDS MAX 2" 120V', 'Equipos de Almacen', 'MILWAUKEE', 'SDS MAX', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('c7a87ca7-90e9-4752-a70c-6e7d79ac2aa8', 'HRT005', 'Rompe Pavimento 24.2', 'Equipos de Almacen', 'MILWAUKEE', NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('3f8de027-0f40-4da9-a152-a5ee528fabf7', 'HRT006', 'Rompe Pavimento 24.2', 'Equipos de Almacen', 'MILWAUKEE', NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2b01ada1-1558-41d0-998f-d50ba686cc66', 'HRT007', 'Remachadora de muelle', 'Equipos de Almacen', 'CROWDER SUPPLY', 'TP-TX133-11RB-OT', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('5ff5e0a8-a310-4c64-adca-80d8e087cf0d', 'HRT008', 'Rompe Pavimento 27 LBS', 'Equipos de Almacen', 'DEWALT', 'DEWD25911K', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('083eee42-f3bc-44a7-b7eb-c1bf0946367c', 'HRT009', 'Rompe Pavimento 27 LBS', 'Equipos de Almacen', 'MAKITA', 'MAKHM1214C', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('9fd68225-39a8-42d5-9c47-c0c822d2a061', 'HRT999', 'Equipos menores y herramientas', 'Equipos de Almacen', NULL, NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2ae3b677-5db5-4b9e-bea0-fb2f699358a1', 'IMP001', 'Impresora', 'Tecnologia', 'HP', 'LASERJET PRO 4103DW', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('1b941988-0d1e-408a-8b59-fe5753d48245', 'IMP002', 'Impresora', 'Tecnologia', 'CANON', 'MF1538C', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('58e1d13b-4d9d-460f-b6d7-e48bf9e865d1', 'IMP003', 'Impresora', 'Tecnologia', 'HP', 'LASERJET PRO 4103DW', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('209fe22e-f090-4317-9c9e-cfc45fe7033e', 'IMP004', 'Plotter', 'Tecnologia', 'HP', 'DESIGNJET T520', NULL, 2014, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('4778304a-a293-4f24-b65d-2f1f1ba3345e', 'IMP005', 'Plotter', 'Tecnologia', 'HP', 'DESINGET T520', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('84719a50-e920-4941-8601-85b0f8ca6a46', 'INA001', 'Batimetria - Ecosonda y PC', 'Equipos de Ingenieria', 'SOUTH', 'SD-28S', NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d32cf2ff-c2a1-48f0-86f3-b1a1aef79b58', 'INA002', 'Estacion Total TS06 de 3Ã¢â‚¬ï', 'Equipos de Ingenieria', 'LEICA', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('bea08922-f310-4261-a79c-7912c1237b83', 'INA003', 'Estacion Total TS-06 de 5Ã¢â‚¬', 'Equipos de Ingenieria', 'LEICA', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d0f49de3-dc74-4525-a2ff-81c4e96e5ec8', 'INA004', 'Estacion Total TS-07 de 3Ã¢â‚¬', 'Equipos de Ingenieria', 'LEICA', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('9fd53394-8f4b-48a4-a535-ddb859bdfaba', 'INA005', 'Gps Zenith 35 Pro Base', 'Equipos de Ingenieria', 'GEOMAX', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d2aae270-b5d6-4a40-afca-38e19f138eeb', 'INA006', 'Gps Zenith 35 Pro Rover', 'Equipos de Ingenieria', 'GEOMAX', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('892d1025-4070-4425-96d1-be1cf5315cc4', 'INA007', 'GPS S82 Base', 'Equipos de Ingenieria', 'SOUTH', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('1fd9c8a4-e398-4ee0-b510-de52d212f646', 'INA008', 'GPS S82 Rover', 'Equipos de Ingenieria', 'SOUTH', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('11143989-aa26-43cc-aa2b-a59ed75f83b1', 'INA009', 'GPS G2 Base', 'Equipos de Ingenieria', 'SOUTH', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('5f3d2dc5-1d68-4a6c-96db-fc0753554889', 'INA010', 'GPS G2 Rover', 'Equipos de Ingenieria', 'SOUTH', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d1cb4c14-68a6-404a-b861-dfd13264087c', 'INA011', 'Nivel Sprinter 150M', 'Equipos de Ingenieria', 'LEICA', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ac088153-30c1-4995-9860-54bff6c33664', 'INA012', 'Nivel Printer 250MÃ‚Â', 'Equipos de Ingenieria', 'LEICA', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0c5c2551-5c6a-43f3-9120-49ce6eaa9eec', 'INA013', 'Nivel Printer', 'Equipos de Ingenieria', 'GEOMAX', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('6f464e02-083d-4dfb-a096-976c200c76a4', 'INA014', 'Drone', 'Equipos de Ingenieria', 'DIJ', 'MINI PRO FLY MORE', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('50835c83-5ad6-43dc-92e5-099c94b01d92', 'INC001', 'Velocidad de Corrosion', 'Equipos de Ingenieria', 'GIATEC', 'ICOR', NULL, 2018, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('3e434b04-5684-46e9-a0d8-c35f70d8847e', 'INC002', 'Resistividad Superficial', 'Equipos de Ingenieria', 'GIATEC', 'SURF', NULL, 2018, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ba755acf-b892-415b-9b7e-8471911d2915', 'INC003', 'Detector de acero de refuerzo', 'Equipos de Ingenieria', 'SHANDONG SCIENTIFIC', 'ZBL-R600', NULL, 2018, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('6bfe0187-e14b-4d30-96f2-b063b602ceda', 'INC004', 'Ultrasonido para concreto', 'Equipos de Ingenieria', 'NDT JAMES', 'V-METER MK II', NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f431b9fb-7f21-4cee-834b-e674e8a5cf3c', 'INC005', 'Esclerometro', 'Equipos de Ingenieria', NULL, NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('289fcc11-4a5f-4805-b3d2-e2ead25f8dcf', 'INC006', 'Clorimetro', 'Equipos de Ingenieria', 'NDT JAMES', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f49958cb-1f97-4bcb-9451-1441cb2bfb97', 'INC007', 'Pull-off test', 'Equipos de Ingenieria', NULL, NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('05bc2c68-a073-4dcf-bde2-0ef08c67f810', 'ING001', 'Equipo de PDA-PAX8 Unit', 'Equipos de Ingenieria', 'PILE DYNAMICS C10463', NULL, NULL, 2012, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('93e80053-04fb-49d5-89eb-e088228c3759', 'ING002', 'Equipo de PDA-Accesorios', 'Equipos de Ingenieria', 'PILE DYNAMICS C10463', NULL, NULL, 2012, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('cb45a62d-b819-436a-8bf2-c62eadbab7da', 'ING003', 'Inclinometro', 'Equipos de Ingenieria', 'GEOKON - CUSTOMER ID', NULL, NULL, 2016, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('7b38685c-2164-4476-b09e-4012c1d1a821', 'ING004', 'Celda de Carga', 'Equipos de Ingenieria', NULL, NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('1aa0498a-bf5a-4c0c-bc47-6912524502c6', 'ING005', 'Sist. de Adquisicion de Datos', 'Equipos de Ingenieria', NULL, NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('5b9d5cf3-8535-4cf0-9ec9-ec901c5f5d4a', 'ING006', 'Gato de Hueco', 'Equipos de Ingenieria', NULL, NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('5dfbd82c-29b3-409e-a236-108ee39d984e', 'ING007', 'Bomba Hidraulica', 'Equipos de Ingenieria', 'SIMPLEX', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('c2972cc6-a1d7-4398-9419-f04904a47d52', 'ING008', 'Indicador Analogo', 'Equipos de Ingenieria', NULL, NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d2a54154-17c7-4c78-9ba1-f2c153223bd3', 'ING009', 'Indicador digital', 'Equipos de Ingenieria', NULL, NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('fd324b99-e979-4f47-9011-08bdad31fd11', 'INM001', 'Sonometro', 'Equipos de Ingenieria', NULL, NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('a992d5d4-45ee-40de-9a80-8c439e7d5f4d', 'INM002', 'Mareometro', 'Equipos de Ingenieria', 'OBS', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('e4bd44bf-d0de-40e0-b3a6-aaaf258a6c08', 'INM003', 'Positector', 'Equipos de Ingenieria', 'DEFELSKO', '6000', NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('16c82733-c966-4032-be57-2448ace7f985', 'INM004', 'Positector', 'Equipos de Ingenieria', 'DEFELSKO', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0fd024d7-d989-44e1-b6ac-09aa0d3f9edc', 'INM005', 'Medidor de espesor de placa UT', 'Equipos de Ingenieria', NULL, NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('80ba002f-85c3-49cc-9c18-ad37f9d0b283', 'INM006', 'Termometro laser', 'Equipos de Ingenieria', 'MILWAUKEE', NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('7c2ca236-6ad5-4365-9840-ccc427a071c2', 'INM007', 'Medidor Skidmore', 'Equipos de Ingenieria', NULL, NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('fb6dca52-15bc-4ae1-a6c2-7959f1c7cd31', 'INM008', 'Monitor de 4 gases', 'Equipos de Ingenieria', 'INDUSTRIAL SCIENTIFI', 'VENTIS MX4', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('22a9e935-a477-4bfc-9d62-f5f155fb6c99', 'INM009', 'Detector de 4 gases', 'Equipos de Ingenieria', 'HONEYWELL', 'XT-XWHM-Y-NA', NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'ING', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('3d3f61cb-6969-48e0-a774-96de13b189b1', 'LAP001', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 4420S', NULL, 2011, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('15d363fd-c6bf-48b5-b2bb-393defa5ffcd', 'LAP002', 'Laptop', 'Tecnologia', 'LENOVO', 'T530', NULL, 2014, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('560e54c2-be93-4ab2-a91f-8802db601c28', 'LAP003', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 640 G1', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('cc386baa-072b-4415-ad13-75f5ff8aac4f', 'LAP004', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440G3', NULL, 2016, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('8fb174af-9602-4c5d-a2cf-a3493cdf1f48', 'LAP005', 'Laptop', 'Tecnologia', 'HP', 'SPECTRE X360', NULL, 2016, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('41f14e21-4935-4880-9390-c9045c9997a8', 'LAP006', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 450G3', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('c12e0db0-b52e-4570-8b27-873102a2b9a6', 'LAP007', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 450G3', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('e922e36b-cf33-49d3-a33f-eebb50155c1e', 'LAP008', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 450G3', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0a1e55c8-613b-4c41-9f7c-c1ebff00c188', 'LAP009', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 450G3', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('58faee0e-66fe-4299-b49c-17b04750af0c', 'LAP010', 'Laptop', 'Tecnologia', 'HP', 'HP240G5', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('b79535ce-cc2b-4152-9148-0b2348dcb02f', 'LAP011', 'Laptop', 'Tecnologia', 'ASUS', 'ASUS 556U', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('aac04c44-442f-4845-b9cd-917f8c32e1e4', 'LAP012', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 450G4', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('65dc54ef-407e-452d-863b-f6145445c442', 'LAP013', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 450G4', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0c15f8f6-1a8b-4271-8e0a-f7e9899c3094', 'LAP014', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 450G4', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('a3df7b8c-5170-496e-b1c4-53d2b7c06e06', 'LAP015', 'Laptop', 'Tecnologia', 'LENOVO', 'LENOVOV110-15ISK', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0937ea80-5c2f-4866-bfcd-3713dd833bf8', 'LAP016', 'Laptop', 'Tecnologia', 'HP', 'HP450 G5', NULL, 2018, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('9e95f99d-336b-46c3-b5b8-377202941b88', 'LAP017', 'Laptop', 'Tecnologia', 'DELL', 'XPS13', NULL, 2018, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d8c0e6e3-0d38-4440-b21a-b0a2e178913e', 'LAP018', 'Laptop', 'Tecnologia', 'DELL', 'OPTIPLEX 7050', NULL, 2018, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('aa871cb7-c885-4356-a4f1-8958e8162d50', 'LAP019', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 450G5', NULL, 2018, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('322628d4-8bbc-4b62-a40b-b685ab566ee2', 'LAP020', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 450G5', NULL, 2018, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('8dcc61e5-8542-438f-9a8c-948642451e8b', 'LAP021', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440 G5', NULL, 2019, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('68e82ff9-6eae-42f1-8c85-8c19a87903ae', 'LAP022', 'Laptop', 'Tecnologia', 'DELL', 'DELL LATITUDE 5490', NULL, 2020, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('79e10c78-8edb-427f-bb01-45f4c48dea7d', 'LAP023', 'Laptop', 'Tecnologia', 'DELL', 'LATITUDE 3400', NULL, 2020, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f98c2f45-1647-4028-9a4c-95e9744186a8', 'LAP024', 'Laptop', 'Tecnologia', 'DELL', 'LATITUDE 5300', NULL, 2020, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f14ed97f-86e4-4566-91ce-d8b6367852b3', 'LAP025', 'Laptop', 'Tecnologia', 'HP', '15-DW2656CL', NULL, 2020, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('43e23e25-949a-4043-9d66-60abe181a574', 'LAP026', 'Laptop', 'Tecnologia', 'HP', 'HP PROBOOK 440G7', NULL, 2020, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('b07ee663-5799-4ecf-85e6-df3ee948cb11', 'LAP027', 'Laptop', 'Tecnologia', 'HP', 'HP PROBOOK 440G7', NULL, 2021, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('08d97897-5fce-4668-88ed-29cc04e2f77c', 'LAP028', 'Laptop', 'Tecnologia', 'HP', '15-DK0056WM', NULL, 2021, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0c177ac3-f6bf-47c5-a31d-7c21935bb8b7', 'LAP029', 'Laptop', 'Tecnologia', 'ASUS', 'VIVOBOOK', NULL, 2021, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f79052f8-0c37-479c-a040-0bbb5980784d', 'LAP030', 'Laptop', 'Tecnologia', 'DELL', 'INSPIRON 3493', NULL, 2021, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('bdd0daa0-4d44-4f5e-b3ab-22c0d80874af', 'LAP031', 'Laptop', 'Tecnologia', 'MSI', 'GE75 RAIDER 10SF', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('25db46f4-9202-4f41-98f6-7d43e3bb4b1c', 'LAP032', 'Laptop', 'Tecnologia', 'HP', 'HP LAPTOP 14-DQ2030L', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('3f7e27d1-0fd4-4900-ad42-da932b7cc7ba', 'LAP033', 'Laptop', 'Tecnologia', 'HP', '15-DY2040LA', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('1cd40d2f-b271-4e63-a18a-ca09b1b2af2a', 'LAP034', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440 G8', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('83d6b895-5e45-45e6-94c4-37571aeebbc0', 'LAP035', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440 G8', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('9e68876c-2925-466e-8509-90150e2246d7', 'LAP036', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440 G8', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f5044779-4e03-4ae6-9f03-ea9a6146b237', 'LAP037', 'Laptop', 'Tecnologia', 'HP', 'PAVILION 14-DV050LA', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('580d3b9e-1ff5-4032-9a36-b192373cc63e', 'LAP038', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440 G8', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('6e844e83-b165-40d8-bfa8-1e0c9404e548', 'LAP039', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 450 G8', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0ab8925e-f31e-4aa2-8af1-c78d56c0b73a', 'LAP040', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440 G8', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('74528028-2cb0-4cbc-8d7d-9dd050938951', 'LAP041', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440 G8', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('3523801f-b01c-43d1-9566-0d8e83eb2b5f', 'LAP042', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440 G8', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('70d7d351-f6a6-4eff-a248-fbf080376a4b', 'LAP043', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440 G9', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d1ee0227-cebd-476e-95f0-0a9979150c6d', 'LAP044', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440 G9', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('38eaca49-723d-4399-802b-5e0e1800d0e9', 'LAP045', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440G9', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('8409533d-fb34-4d65-9f6d-816d6add2129', 'LAP046', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440G9', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('906cce95-d5f9-416b-8015-161e5fdf5fba', 'LAP047', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440G9', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('5d5522d6-69d5-4b26-a130-7d5ad3876158', 'LAP048', 'Laptop', 'Tecnologia', 'HP', 'ENVY X360', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('81b22095-51ab-4fd4-b02b-ebd5efeaab43', 'LAP049', 'Laptop', 'Tecnologia', 'DELL', 'XPS13', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f7c185c5-7ea6-44fc-8797-4810486206b8', 'LAP050', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 450 G9', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2c5e1eac-b045-41d8-b254-34bb4834fa89', 'LAP051', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440 G9', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('803ff43c-1cfe-4352-bac9-4ce89f5bdcee', 'LAP052', 'Laptop', 'Tecnologia', 'MSI', 'GE76 RAIDER', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2c18ddbd-9ad0-44bd-93d9-62d0ac2d3123', 'LAP053', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 450 G9', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('65f34349-114c-4808-800e-c57a3004e8ff', 'LAP054', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 450 G10', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('72f3f3ae-76e3-4205-8c5b-2ed6da912f39', 'LAP055', 'Laptop', 'Tecnologia', 'HP', 'HP ELITE X360', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('3ccbe79e-4530-4841-8a6b-a47394eb69f1', 'LAP056', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 460G11', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f6a0feea-7b0b-4db8-bc1e-ca845db260e4', 'LAP057', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440G11', NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('62c9409a-1258-4713-b7b8-94dba74f995f', 'LAP058', 'Laptop', 'Tecnologia', 'HP', 'HP VICTUS 15-FA0022L', NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('b69f0e85-86a3-4998-b885-3bb5665b1454', 'LAP059', 'Laptop', 'Tecnologia', 'HP', 'PROBOOK 440G11', NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('41e33024-0c57-4a3a-8d86-2e4e4cab2829', 'MAI001', 'INSERTO PARA HINCAR TABLESTACA', 'Fundaciones', 'PILECO', NULL, NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('5dca1bca-83f3-404a-87c3-47c458ecfdef', 'MAI002', 'GUIA DE MARTILLO 21X90', 'Fundaciones', 'CONMACO', '21 X 90', NULL, 1994, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f8bbc64b-eb48-482e-8ee3-acc0d801e55f', 'MAI003', 'GUIA DE MARTILLO 26X76', 'Fundaciones', 'ICE', '26 X 76', NULL, 1994, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('220dab2d-6bdb-4188-b5ee-e22663060d6e', 'MAI005', 'GUIA DE MARTILLO 32X120FT', 'Fundaciones', 'PILECO', 'U-32 32 X 120 FT', NULL, 2003, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('a3de1757-d6ac-454d-8c32-5926190ea36b', 'MAI006', 'GUIA DE MARTILLO 32X100FT', 'Fundaciones', 'PILECO', 'U-32 32 X 100 FT', NULL, 1995, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('434db009-53aa-4103-9335-1b11a9f67d6e', 'MAI238', 'MARTILLO IMPACTO 224 KNM SM', 'Fundaciones', 'DELMAG', 'D62-22', NULL, 1995, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ad6bd2c6-be57-41e4-9732-73ffaec8aa01', 'MAI244', 'MARTILLO IMPACTO 46 KNM HD', 'Fundaciones', 'PILECO', 'D12-42', NULL, 2013, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('5491ef26-02e6-42a6-a466-1cb0c9157154', 'MAI383', 'MARTILLO IMPACTO 166 KNM MD', 'Fundaciones', 'DELMAG', 'D46-23', NULL, 1993, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('51634338-2994-49b1-b0ce-ccafcc5eb771', 'MAI524', 'MARTILLO IMPACTO 123 KNM MD', 'Fundaciones', 'PILECO', 'D30-32', NULL, 2011, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('29f184a9-03ea-4b9c-a480-3db03766a7db', 'MAR002', 'BARCAZA ICB-02 350T', 'Equipo Marino', 'HOUSTON SHIPYARD', 'ICB-02 118X44 FT', NULL, 1992, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f72cbd74-1c18-478c-9172-1972c05eb87d', 'MAR003', 'BARCAZA IBC-03 FLEXIFLOAT', 'Equipo Marino', 'FLEXIFLOAT', 'SERIE S-70 80X40 FT', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('16c098a7-fd64-401d-8bbe-c7a70e5090b9', 'MAR004', 'BARCAZA ICB-04 COMBIFLOAT', 'Equipo Marino', 'FLEXIFLOAT', 'SERIE C-7 70X40 FT', NULL, 2013, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2acb9609-282e-49d2-8681-a13f54644202', 'MAR006', 'LANCHA VINO TINTO ALUM 5P', 'Equipo Marino', 'SEA ARK', 'ALUM 20FT 40HP', NULL, 1992, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('99fdb0ea-8c86-41a8-b57a-e0e17f462be8', 'MAR100', 'Cabrestantes 10 T Winches', 'Equipo Marino', 'BRAYDEN YJ100-00', NULL, NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('9304f56a-52a4-4387-b35e-b28d06c4fbe0', 'MAR122', 'BOTE WHALY 4P', 'Equipo Marino', 'WHALY', '310', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('558fbcc8-a485-4815-a701-81fce51f3943', 'MAR213', 'REMOLCADOR RANDY LEE', 'Equipo Marino', 'M S SHIPBUILDING CO.', '38FT 460HP', NULL, 1966, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('69cfde29-9b74-4b90-9b25-86e8e1dc4595', 'MAR214', 'REMOLCADOR THELMA S', 'Equipo Marino', 'C L DREDGING CO', '42 FT 2X250HP', NULL, 1976, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('e9394bb0-caf8-41d3-b397-7882a1d0eb0d', 'MAR331', 'Power Pack 85 HP', 'Equipo Marino', 'FOSTER', NULL, NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('cdf349da-d743-4410-881c-0bf6f5fdc1a4', 'MAR332', 'LANCHA TORTUGA 2 FIBRA 10P', 'Equipo Marino', 'EFITESA', 'FIBRA 28FT 115HP', NULL, 2013, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('9e98c9a9-41b1-46ef-98ce-3dd9e2220185', 'MAR347', 'LANCHA TORTUGA 1 FIBRA 6P', 'Equipo Marino', 'MAR Y BOTES', 'FIBRA 20FT 40HP', NULL, 2011, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('106b8c6e-d31f-4ee7-a10d-68bf10d3f3a7', 'MAR629', 'MOTOR 15HP PATA CORTA', 'Equipo Marino', 'YAMAHA', 'E15DMH', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('29c68119-8f0d-4329-a984-b81ceefd5554', 'MAR900', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('3029ce75-44cb-4f2a-a922-05570aeee7f6', 'MAR901', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('4789e6a8-7158-48ac-8d42-8458b3a17af5', 'MAR902', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('8d7b10b4-6312-4ec7-ba1c-3b4da4a1c223', 'MAR903', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('57d12b66-1926-43b4-b01d-fcf61cbddcd2', 'MAR904', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('56c5137a-6850-40f8-942e-5bb7dab2d9a2', 'MAR905', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('da86fb26-9aad-4186-8453-623c9df31029', 'MAR906', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('876460c8-a96b-402e-98cf-d6cf8d7c2b83', 'MAR907', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('4370384f-a9ef-4c03-80fa-fed0819b743a', 'MAR908', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ecaa6013-5a7b-421e-9dd2-3678cb87721e', 'MAR909', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2b765442-9016-4209-a834-9271f4ca3ab0', 'MAR910', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('176722ab-0ae7-4a46-9c73-8145421720f3', 'MAR911', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('38a33185-d64e-49c7-b923-d45900f4fc60', 'MAR912', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f41b0dac-5a3b-47bd-aefb-2521587ca78a', 'MAR913', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('254ad580-1547-4595-a300-2832a2f87021', 'MAR914', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('6fce9b59-60e3-4b0a-b1f5-9f55d964d5bc', 'MAR915', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('939ad694-e536-42ba-a7ff-fce73cf0a100', 'MAR916', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('058db057-f50a-428b-b42d-7768951f50bc', 'MAR917', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('48886033-a788-41e1-8407-ffcce5a39064', 'MAR918', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('a96e02b3-2261-4bec-b6d3-5fb48ade3a9a', 'MAR919', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('5703c9fb-342f-4bfe-b7cb-974dfa6e492c', 'MAR920', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('57612d8b-a74a-4763-a278-ee18722ad9ce', 'MAR921', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('863c7ac3-7255-422a-b614-62d14bc23b9f', 'MAR922', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('030bdba6-5129-4a97-93cf-8e0d087286a7', 'MAR923', 'CRANE MATS', 'Equipo Marino', NULL, '12 X 48 X 20', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('cb0b5797-253a-4c0b-8139-a958d3d33897', 'MAR925', 'BOLSA DE AIRE', 'Equipo Marino', 'QINGDAO HENGER', NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('da2e64f4-e834-4dc1-9b72-5c30903db5e5', 'MAR926', 'BOLSA DE AIRE', 'Equipo Marino', 'QINGDAO HENGER', NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('caabb211-01f5-4732-bedc-37ba6c410f8c', 'MAR927', 'BOLSA DE AIRE', 'Equipo Marino', 'QINGDAO HENGER', NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ac4548fd-7103-4731-8fe8-b65f8ea83e07', 'MAR928', 'BOLSA DE AIRE', 'Equipo Marino', 'QINGDAO HENGER', NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('64e0a9c4-34ed-4185-84af-0b416c371434', 'MAR929', 'BOLSA DE AIRE', 'Equipo Marino', 'QINGDAO HENGER', NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0cca48fa-1672-4d69-aa4e-c0b9979b2f23', 'MAR930', 'BOLSA DE AIRE', 'Equipo Marino', 'QINGDAO HENGER', NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2b8d068c-a4ef-4203-bd37-ec531b4ccf18', 'MAR931', 'REMOLQUE PARA LANCHAS', 'Equipo Marino', 'CRUISE-ON', NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f6155b4d-7609-4611-a034-0b2cc1c90c5e', 'MAR932', 'CRANE MATS', 'Equipo Marino', NULL, NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('3f77a092-1197-4985-ad05-c40fd935ee88', 'MAR933', 'CRANE MATS', 'Equipo Marino', NULL, NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('de84f4e0-0e9d-4eba-a665-008df2f236e6', 'MAR934', 'CRANE MATS', 'Equipo Marino', NULL, NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('efe8281d-2d36-4465-af85-117e84887848', 'MAR935', 'CRANE MATS', 'Equipo Marino', NULL, NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('1003167f-f810-46d4-b359-32cc4f908718', 'MAR999', 'Defensas Equipos Marinos', 'Equipo Marino', 'QUINGDAO HENGER SHIP', '600MM X 1200', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'MAR', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('aef3ebcf-0709-469b-8e65-13e85ac46e53', 'MAV007', 'MARTILLO VIBRATORIO 450KN', 'Fundaciones', 'YANTAI', 'CS500', NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('db7de001-03d7-49d7-b312-ecb14021d9d5', 'MAV020', 'MARTILLO VIBRATORIO 1300 KN', 'Fundaciones', 'FOSTER', 'FNV-4150', NULL, 1992, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('b155618c-a454-4985-8731-d5c862d40fce', 'MAV021', 'MARTILLO VIBRATORIO 570HP', 'Fundaciones', 'FOSTER', '1605', NULL, 1992, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('87f66844-28c6-4c9f-84f8-cfc225c3d6b9', 'MAV103', 'CAISSON CLAMP 284 T', 'Fundaciones', 'ICE', '145BH', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('54990331-1c41-4d44-b932-4a21355c619a', 'MAV123', 'MARTILLO VIBRATORIO', 'Fundaciones', 'FOSTER', 'FNV-1000', NULL, 1987, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('76e8c82a-451b-4723-8a14-e2280a988beb', 'MAV241', 'MARTILLO VIBRATORIO 1800KN', 'Fundaciones', 'ICE', '44B', NULL, 2010, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('cb77a1e4-bfcc-4b90-895f-970db29b33d8', 'MAV631', 'MARTILLO VIBRATORIO 1800KN', 'Fundaciones', 'ICE', '44B', NULL, 2014, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ba6074a8-69f4-4887-8b7b-99294f16bc4c', 'MNV095', 'MOTONIVELADOR 140HP', 'Equipo Pesado', 'CATERPILLAR', '12G', NULL, 1995, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0d10d123-cd8f-45b2-b2f8-4f5699947ac6', 'MOB001', 'Maquina de hielo 110V', 'Equipos de Almacen', NULL, NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('fcf8e029-0ff3-4c7d-9dd1-80dc970cdeea', 'MON001', 'Monitor', 'Tecnologia', 'HP', 'L1908W', NULL, 2008, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('11a339cd-76f6-4416-b899-d8a465db474b', 'MON002', 'Monitor', 'Tecnologia', 'LG', '011TPLC3Q728', NULL, 2010, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('c5890d4b-3dfc-442c-9c34-89df2200fa32', 'MON003', 'Monitor', 'Tecnologia', 'LG', 'E1941S-BN', NULL, 2011, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('4e553e9e-44d0-4298-92ce-cea7705440b0', 'MON004', 'Monitor', 'Tecnologia', 'LG', 'E1940SI', NULL, 2011, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('e0a5eb90-2e11-4910-a421-5113e082fd10', 'MON005', 'Monitor', 'Tecnologia', 'LG', 'E1941SX', NULL, 2011, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('c7be9f19-b2b1-4ff4-8a54-e06635bc1952', 'MON006', 'Monitor', 'Tecnologia', 'LG', '22MP57HQ-P', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('e5592e4f-06e3-4d31-bd6e-b31769aac86e', 'MON007', 'Monitor', 'Tecnologia', 'LG', '24MT47A-PM', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f8298256-ee20-4767-b461-b6b9668005ce', 'MON008', 'Monitor', 'Tecnologia', 'ASUS', 'VP247', NULL, 2016, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('e47a6df5-3762-4fc6-9ec1-a239989ffaf5', 'MON009', 'Monitor', 'Tecnologia', NULL, 'S20D300NH', NULL, 2016, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('40cc9344-6c2a-49be-84a0-4cb9291bed11', 'MON010', 'Monitor', 'Tecnologia', 'SAMSUNG', 'S20D3300NH', NULL, 2016, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('98bd931e-3ab7-467d-8abc-94fa60a6a6ea', 'MON011', 'Monitor', 'Tecnologia', 'LG', '24MP58VQ-P', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('9acc5aed-3458-4c63-bc47-08f7934580a1', 'MON012', 'Monitor', 'Tecnologia', 'ASUS', 'VP278H-P', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('5f6ea32d-7740-45bf-aa4d-647afbbc7b17', 'MON013', 'Monitor', 'Tecnologia', 'LG', '24MP58VQ-P', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('3b924423-0e9d-47fb-9850-23ea1a42fd4a', 'MON014', 'Televisor', 'Tecnologia', 'LG', '60UJ6580', NULL, 2018, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('cc9c1d72-ad06-4c7f-bda1-5493bc99d90e', 'MON015', 'Monitor', 'Tecnologia', 'ASUS', 'VA27EHE', NULL, 2020, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('e1209de3-6d0b-454a-a8a4-0d056dc4a72d', 'MON016', 'Monitor', 'Tecnologia', 'ASUS', 'VA249HE', NULL, 2021, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('59754945-2d62-43e6-9576-cf789f192831', 'MON017', 'Monitor', 'Tecnologia', 'SAMSUNG', 'LS22F350FHLXZP', NULL, 2021, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('b4bdad9e-26c9-416a-93bb-b5b2f5d87e52', 'MON018', 'Monitor', 'Tecnologia', 'SAMSUNG', 'S19A330NHL', NULL, 2021, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ac14bf5a-9c67-4810-91fe-fb24d5c7a415', 'MON019', 'Monitor', 'Tecnologia', 'SAMSUNG', 'LS22F350FHLXZP', NULL, 2021, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('eb7315ac-e4aa-4d2f-b08c-b71f6016e7db', 'MON020', 'Monitor', 'Tecnologia', 'SAMSUNG', 'LS22F350FHLXZP', NULL, 2021, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('e6d0c323-f3d5-4511-965d-e6039321be90', 'MON021', 'Monitor', 'Tecnologia', 'BENQ', 'GW2280-T', NULL, 2021, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('b76de6c2-191c-45c3-a52c-9cae7cec566c', 'MON022', 'Monitor', 'Tecnologia', 'BENQ', 'GL2480-T', NULL, 2021, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d26bdf17-d5a3-49d3-ba27-ae13d770190f', 'MON023', 'Monitor', 'Tecnologia', 'LG', '20MK400H', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('88667b5c-a8cd-4e89-9a57-97143cf7b415', 'MON024', 'Monitor', 'Tecnologia', 'ASUS', 'VZ279', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2300c9ab-da28-420e-b40e-b476f2ad7ba3', 'MON025', 'Monitor', 'Tecnologia', 'SAMSUNG', 'F22T350FHN', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('9b548a48-0145-43dd-a2fd-c1ea432f8674', 'MON026', 'Monitor', 'Tecnologia', 'SAMSUNG', 'LS22F350FHLXZP', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d61418bc-61b3-4d19-8e19-f8920f2e025a', 'MON027', 'Monitor', 'Tecnologia', 'ASUS', 'VP228HE', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f5a6777b-6563-4979-abb3-b78c301742f1', 'MON028', 'Monitor', 'Tecnologia', 'ASUS', 'VP228', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('db3c434d-95f4-4271-838a-cdb889ed1199', 'MON029', 'Televisor', 'Tecnologia', 'TCL', '55P735', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d0bb0133-a4e4-4219-ac1e-09c534fa001c', 'MON030', 'Monitor', 'Tecnologia', 'SAMSUNG', 'LS22F350FHLXZP', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('1bf46228-97ef-4efe-9de6-0609c0b24e17', 'MON031', 'Monitor', 'Tecnologia', 'ASUS', 'VA27E', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('41c2c941-218c-4bb2-8130-b10ca65c4793', 'MON032', 'Monitor', 'Tecnologia', 'ASUS', 'VP228HE', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('24acdc62-4443-4bad-ac37-86b89f1ebd17', 'MON033', 'Monitor', 'Tecnologia', 'SAMSUNG', 'F22T350FHN', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2c440c00-3a1e-4b58-97c7-c539d6657333', 'MON034', 'Monitor', 'Tecnologia', 'ASUS', 'VP228HE', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('94287597-1ca4-4dca-91d0-5c484bbc35c8', 'MON035', 'Monitor', 'Tecnologia', 'HP', 'HP M27F FHD', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('fe0333b6-27df-4659-8c2b-a617bace968b', 'MON036', 'Monitor', 'Tecnologia', 'VIEWSONIC', 'VA2735-H', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('11c1edbd-e82c-499e-b640-a9f326a229c9', 'MON037', 'Monitor', 'Tecnologia', 'XIAOMI', 'ELA5377US', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('7f3329c1-9323-43f8-9861-de89f033a47d', 'MON038', 'Monitor', 'Tecnologia', 'SAMSUNG', 'F22T350FHN', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('e7802263-40a0-4b60-83ba-a7553f21d55a', 'MON039', 'Monitor', 'Tecnologia', 'LG', '24MP58VQ-P', NULL, 2016, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('19627cdc-8906-44ae-8755-5a491dc857a5', 'MON040', 'Monitor', 'Tecnologia', 'LG', '24M34D', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('c2238225-63fd-48c0-8710-ee5639304153', 'MON041', 'Monitor', 'Tecnologia', 'HP', '64W18AA', NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('39932377-66b7-400c-8135-5a4ec359a5a4', 'MON042', 'Monitor', 'Tecnologia', 'LG', '27MS500-B', NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('bc60e5f0-318c-46a6-941d-f19c9835480e', 'MSC001', 'Carpa 24x32x15H', 'Equipos de Almacen', NULL, NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ca6ad76a-5a96-42a5-babf-cc08617bfedf', 'MSC002', 'Carpa 24x32x15H', 'Equipos de Almacen', NULL, NULL, NULL, NULL, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('59bccccf-46e9-4d14-b626-43b7eb6844ee', 'MSC003', 'MAQ PERFILADORA DE ACERO', 'Equipo Liviano', 'WEQUIPS', NULL, NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQL', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('eb419271-e20d-4722-a4bd-db94230b9ed3', 'PRO001', 'Proyector', 'Tecnologia', 'INFOCUS', 'IN116A', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('edfdaee9-2693-4dec-a855-6de50f588f1a', 'PUP244', 'CAMIONETA 2P 1.5T', 'Vehiculos Livianos', 'KIA', 'K2700', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('150902c7-540c-4a67-964b-c4db5ceac902', 'PUP245', 'CAMIONETA 2P 1.5T', 'Vehiculos Livianos', 'KIA', 'K2700', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('467a4e16-c719-47d5-a5b5-c9c8cb40a8f9', 'PUP419', 'CAMIONETA 5P 1.5T', 'Vehiculos Livianos', 'KIA', 'K2700', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, 'CAP:1300 KG', 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('4309c323-3048-408b-a35e-4b84d9cdd99f', 'PUP467', 'CAMIONETA 5P 1.5T', 'Vehiculos Livianos', 'KIA', 'K2700', NULL, 2021, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('48f1fe3a-9a52-4d27-bcf5-005bb280bf7d', 'PUP525', 'CAMIONETA 5P 1.5T', 'Vehiculos Livianos', 'KIA', 'K2700', NULL, 2014, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, 'CAP: 1300 KG', 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('30b3f23d-189e-47d3-8364-57e79dd441f8', 'PUP765', 'CAMIONETA 2P 1T', 'Vehiculos Livianos', 'FORD', 'LARIAT', NULL, 2021, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('906f5baf-c60f-4339-844a-d9fb6c880fe8', 'PUP847', 'CAMIONETA 4P 1T', 'Vehiculos Livianos', 'NISSAN', 'FRONTIER', NULL, 2026, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('aaa22148-075b-463e-92f1-bc27a55d8b9f', 'PUP848', 'CAMIONETA 4P 1T', 'Vehiculos Livianos', 'NISSAN', 'FRONTIER', NULL, 2026, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('371bcce9-06ec-4c70-99e5-d53c21a04683', 'RED001', 'Servidor', 'Tecnologia', 'HP', 'PROLIANT ML150 G6', NULL, 2010, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d8386bcc-b084-4ba2-87a6-4e20781ad4d4', 'RED002', 'Sistema de seguridad', 'Tecnologia', 'ZYXEL', 'USG110', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ff256c3e-c326-464a-a4aa-11d4bdc7b5c9', 'RED003', 'Servidor', 'Tecnologia', 'HP', 'PROLIANT DL180 G9', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('a62ecbf8-5086-490e-8fd4-6bb32287536d', 'RED004', 'Switch', 'Tecnologia', 'ARUBA', '2530-48G', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('057205cd-2ec4-4ef4-a53e-34c6608f4cf8', 'RED005', 'Internet', 'Tecnologia', 'STARLINK', 'KIT STANDARD', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('66a1dcb5-4378-4763-9646-60ea6e02236f', 'RED006', 'Internet', 'Tecnologia', 'STARLINK', 'KIT STANDARD', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('8c990ca8-df39-4dc9-a1b7-f7174dbd2cb5', 'RED007', 'Internet', 'Tecnologia', 'STARLINK', 'KIT STANDARD', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('5f6d365e-a52e-4aeb-8699-b77f0110ceb8', 'RED008', 'Internet', 'Tecnologia', 'STARLINK', 'KIT STANDARD', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('8ca5b8bd-660d-4055-a6ca-b04ffb595609', 'RED009', 'Internet', 'Tecnologia', 'STARLINK', 'KIT STANDARD', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'TEC', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d11622a5-3742-47ed-876b-fc115fcf216a', 'REM217', 'REMOLQUE CHASIS SOLO', 'Vehiculos Pesados', 'FREUHAUF', '20FT', NULL, 1997, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, 'CAP: 10 T', 'VHP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('797d63fe-a935-4ad3-b786-01598b8c7dcd', 'REM931', 'REMOLQUE DOLLY', 'Vehiculos Pesados', 'LOAD KING', 'HD-705', NULL, 1993, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, 'CAP: 38.5 TON', 'VHP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('203da5aa-0b14-4973-abb1-08b6dbbf3165', 'RET327', 'RETROEXCAVADORA 1 CY', 'Equipo Pesado', 'NEW HOLLAND', 'B95-699200781', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('122604ac-8009-4950-a548-6d4804c25176', 'RET403', 'RETROEXCAVADORA 1 CY', 'Equipo Pesado', 'NEW HOLLAND', 'B-95', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('31438e92-5aa0-4e39-8a46-53aa6fd0bc55', 'RET713', 'RETROEXCAVADORA 1 CY', 'Equipo Pesado', 'JOHN DEERE', '310K', NULL, 2013, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('aed9e5b9-ba15-4d23-8253-2aef3f2f816e', 'RET717', 'RETROEXCAVADORA 1 CY', 'Equipo Pesado', 'NEW HOLLAND', 'B95-699200781', NULL, 2014, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('53909502-4fa4-4e8b-b035-b8df19bb2e23', 'RET905', 'RETROEXCAVADORA 1 CY', 'Equipo Pesado', 'NEW HOLLAND', 'B95-699200781', NULL, 2014, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('1865730a-84f3-4f5d-a8bd-105f8af6f9ab', 'SED834', 'SEDAN 5P COMPACT', 'Vehiculos Livianos', 'HYUNDAI', 'ACCENT', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('b4878600-e329-47f8-86f9-cc60f5aa8a33', 'SLD700', 'MAQUINA DE SOLDAR 400AMP', 'Equipo Liviano', 'MILLER', 'BIG BLUE 400X', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQL', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2b8f8cb7-98d7-4c52-8438-3f462c3c389a', 'SLD703', 'MAQUINA DE SOLDAR 400AMP', 'Equipo Liviano', 'MILLER', 'BIG BLUE 400X', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQL', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('3b6b4593-bfbc-4573-a3b2-62c6c5719cc6', 'SUV005', 'SUV 5P SM', 'Vehiculos Livianos', 'KIA', 'SPORTAGE', NULL, 2016, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('27f5cb13-4002-4ddf-8a3c-134b9470814e', 'SUV074', 'SUV 7P LG', 'Vehiculos Livianos', 'MITSUBISHI', 'MONTERO', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('1a49661c-2daf-49d9-a3cb-5612f833d579', 'SUV397', 'SUV 5P MD', 'Vehiculos Livianos', 'KIA', 'SORENTO', NULL, 2020, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('7ac5218f-1bc3-4994-ae48-1665018a145a', 'SUV398', 'SUV 5P SM', 'Vehiculos Livianos', 'KIA', 'SPORTAGE', NULL, 2020, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('cfd1d020-7945-4766-8248-9c485e8967ec', 'SUV452', 'SUV 5P MD', 'Vehiculos Livianos', 'MITSUBISHI', 'NATIVA', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('771b425f-c7d4-4ae3-92bf-48e3c6be359a', 'SUV468', 'SUV 5P SM', 'Vehiculos Livianos', 'HONDA', 'CRV', NULL, 2016, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ea7111b3-ff85-457a-97cc-5cc40079085f', 'SUV499', 'SUV 5P MD', 'Vehiculos Livianos', 'MITSUBISHI', 'NATIVA', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, 'CAP: 8 PASS', 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0d31b667-46e0-4e5c-85bd-2a8df3f7e3a3', 'SUV521', 'SUV 7P LG', 'Vehiculos Livianos', 'HONDA', 'PILOT', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('16c3b858-f64c-486a-93e4-93c2620237d2', 'SUV539', 'SUV 5P SM', 'Vehiculos Livianos', 'GEELY', 'GX3PRO', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('3c71d64b-d37f-4b91-96d3-5ad4ae85a8ef', 'SUV575', 'SUV 7P LG', 'Vehiculos Livianos', 'NISSAN', 'PATHFINDER', NULL, 2012, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('a1827fc4-09e3-4da6-8860-de5dcbbd6878', 'SUV589', 'SUV 5P MD', 'Vehiculos Livianos', 'AUDI', 'Q5', NULL, 2014, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('7ed102bc-3677-41b1-a60e-f95f3c633ec8', 'SUV781', 'SUV 5P MD', 'Vehiculos Livianos', 'FORD', 'EVEREST', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ee64d04e-03ef-453d-baa4-24f61eb53e8e', 'SUV880', 'SUV 5P MD', 'Vehiculos Livianos', 'ACURA', 'RDX', NULL, 2023, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('0d8f48c9-ff09-416a-a698-82fd91ccbc7f', 'SUV905', 'SUV 5P SM', 'Vehiculos Livianos', 'NISSAN', 'XTRAIL', NULL, 2011, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, 'CAP:5PASS', 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('ac81f7df-cc94-456e-89bc-32f745a4d8f3', 'SUV907', 'SUV 5P MD', 'Vehiculos Livianos', 'HYUNDAI', 'TUCSON', NULL, 2011, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('760b78ec-f9be-409a-81d4-048bbc8d3647', 'TAL001', 'PERFORADOR DE PILOTES 33"', 'Fundaciones', 'WEQUIPS', 'DOUBLE-CUT SINGLE FL', NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('2455eb42-7ea7-4692-aac7-f395b49dcf4c', 'TAL002', 'CLEANING BUCKET 33"', 'Fundaciones', 'WEQUIPS', NULL, NULL, 2024, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('8539c3fb-2caa-4533-abe1-bf072dcfab94', 'TAL003', 'TALADRO PARA ROCA 580MM', 'Fundaciones', 'WEQUIPS', NULL, NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('9d2c510a-51cc-4a1c-ba3f-5701e4943b73', 'TAL004', 'ROCK DRILLING BUCKET 580MM', 'Fundaciones', 'WEQUIPS', NULL, NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('28a344cd-2902-4abb-a1f6-71d7de0ddf8a', 'TAL005', 'BROCA CONICA 1143MM', 'Fundaciones', 'WEQUIPS', NULL, NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('3c670261-1387-4a44-a77f-73ab11b622e7', 'TAL006', 'CLEANING BUCKET 1143MM', 'Fundaciones', 'WEQUIPS', NULL, NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('25dba6a4-2351-4345-ac66-a5b03fd9a9fb', 'TAL007', 'ROCKET BUCKET 1143MM', 'Fundaciones', 'WEQUIPS', NULL, NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('493f398e-81e5-4d52-b211-5deb5af82057', 'TAL008', 'CORE BARRELL W BULLET TEETH', 'Fundaciones', 'WEQUIPS', NULL, NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('cd81deb8-7463-4149-ba9e-9d61ff1751ea', 'TAL151', 'TALADRO PARA GRUA', 'Fundaciones', 'WATSON', '5000CA', NULL, 2012, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('f7e2fe1c-8823-46de-8021-053527a70939', 'TAL248', 'TALADRO PARA GRUA LG', 'Fundaciones', 'STEWARD STEVENSON', 'SS-150', NULL, 1987, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('87d08216-8b1c-4e2d-9db9-d5e026640d87', 'TAL250', 'TALADRO PARA GRUA', 'Fundaciones', 'KINGER', 'YDH30000', NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('edf83057-a8d6-42c4-8362-19a6d6450920', 'TAL328', 'TALADRO MICRO PARA EXC', 'Fundaciones', 'TEI ROCK DRILLS', 'HEM550', NULL, 2013, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('4932f715-4517-4cf7-9e39-7eda427cd2b7', 'TAL485', 'TALADRO PARA GRUA MD', 'Fundaciones', 'ICE', '5050', NULL, 1993, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('545c42a3-cdda-4d3b-a47b-9a7661b1cec7', 'TAL501', 'TALADRO PARA GRUA', 'Fundaciones', 'KINGER', 'YDH50000', NULL, 2025, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('001b353a-1e8a-4c5d-ad14-49d9aee4c094', 'TAL525', 'TALADRO MICRO PORTATIL', 'Fundaciones', 'TEI ROCK DRILLS', 'MP260HT', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('a262d607-d5c2-4663-9961-aa4d25118931', 'TAL526', 'TALADRO MICRO PARA RETRO', 'Fundaciones', 'TEI ROCK DRILLS', 'MME260HT', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'FND', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('85649d50-24cd-40f4-8f34-12efc224e5dc', 'TEL480', 'EQUIPO TELESCOPICO 4 T', 'Equipo Pesado', 'JCB', '540-170', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQP', 'HOROMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('d69b6567-1e1f-46c5-a2d2-d2684be068c2', 'TLZ801', 'TORRE DE LUZ 6KW', 'Equipo Liviano', 'WACKER NEUSON', 'KDW1003GE', NULL, 2010, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQL', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('9b1643a6-0856-4d8b-909e-f34087ec8633', 'VNT001', 'Ventilador/Blower coaxial 20"', 'Equipos de Almacen', 'ALLEGRO', '9515', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('fece3a32-739a-4482-abcd-3731ddfe84d5', 'VNT002', 'Ventilador/Blower de 16"', 'Equipos de Almacen', 'ALLEGRO', NULL, NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQA', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('cf5a0037-5efd-4d9f-8d01-08608ccee57c', 'VOL995', 'VOLQUETE 14 CY', 'Vehiculos Pesados', 'FREIGHTLINER', 'FL80', NULL, 1994, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', NULL, NULL, 'VHP', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-03 18:36:00.574237+00', NULL),
	('eb43c0d7-74d6-451c-b978-41058d2fb97b', 'BUS830', 'BUS 7P', 'Vehiculos Livianos', 'SUZUKI', 'EECO', NULL, 2026, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', 'ES3830', NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('edcca152-01c7-48af-a3ae-5be2c43f5946', 'CAB930', 'CABEZAL 350 HP', 'Vehiculos Pesados', 'MACK', 'RB688S', NULL, 1996, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', '271930', '350 HP', 'VHP', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('895026eb-3993-4a2b-97a7-5aabc11ae2d8', 'CAB444', 'CABEZAL 450 HP', 'Vehiculos Pesados', 'MACK', 'CL-713', NULL, 1995, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', '260444', '450 HP', 'VHP', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('2892b11f-b3e9-469e-8a4f-f6ae5857c138', 'CAM823', 'CAMION GRUA', 'Vehiculos Pesados', 'INTERNACIONAL', '4400', NULL, 2008, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', '419269', NULL, 'VHP', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('6e7f69f2-f847-446a-990e-2df67a8c8ef6', 'CAM430', 'CAMION PLATAFORMA 4 TON', 'Vehiculos Livianos', 'HINO', 'WU422L-HKMRB3', NULL, 2010, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', '449430', 'CAP: 4.6 TON', 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('79f87461-46fa-4cbb-8dfd-2da9101aa63f', 'CAM837', 'CAMION PLATAFORMA 4 TON', 'Vehiculos Livianos', 'HINO', '300 DUTRO', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', 'CG2837', NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('80db0c66-09fa-4239-b704-808939ff9d99', 'CAM839', 'CAMION PLATAFORMA 4 TON', 'Vehiculos Livianos', 'HINO', '300 DUTRO', NULL, 2017, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', 'CG2839', NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('c7cc91c3-fec6-4450-b77d-eac3df56cd38', 'PUP321', 'CAMIONETA 2P 1.5T', 'Vehiculos Livianos', 'KIA', 'K2700', NULL, 2026, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', 'EQ8321', NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('fee068ec-4e33-4fcb-b9e3-b5f84565934d', 'PUP322', 'CAMIONETA 2P 1.5T', 'Vehiculos Livianos', 'KIA', 'K2700', NULL, 2026, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', 'EQ8322', NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('1210319c-0a6d-4554-85d8-5216e1e17537', 'PUP323', 'CAMIONETA 2P 1.5T', 'Vehiculos Livianos', 'KIA', 'K2700', NULL, 2026, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', 'EQ8323', NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('bbfdfad4-a82d-4f0f-b1c0-a99e24e64122', 'PUP324', 'CAMIONETA 2P 1.5T', 'Vehiculos Livianos', 'KIA', 'K2700', NULL, 2026, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', 'EQ8324', NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('ffbfdf43-48e9-4179-bebd-3af94bdef052', 'PUP201', 'CAMIONETA 2P 1T', 'Vehiculos Livianos', 'TOYOTA', 'HILUX', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', 'AS3201', 'CAP: 4 COLOR BLANCO', 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('4eb1e7ae-5abc-4002-a167-378c37c0be24', 'PUP202', 'CAMIONETA 2P 1T', 'Vehiculos Livianos', 'TOYOTA', 'HILUX', NULL, 2015, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', 'AS3202', 'CAP: 1/2 TON', 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('bd957abc-d443-403b-9428-6213bfe38c2e', 'PUP468', 'CAMIONETA 5P 1.5T', 'Vehiculos Livianos', 'KIA', 'K2700', NULL, 2022, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', 'EA3468', NULL, 'VHL', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('4fa7e7a0-2c87-4f9e-a163-74d2599201e7', 'REM562', 'REMOLQUE CAMA ALTA', 'Vehiculos Pesados', 'DORSEY', '45', NULL, 1979, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', '257613', 'CAP: 25 T', 'VHP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('fb6566de-2ecc-47bf-a562-e03c7e5b14e8', 'REM300', 'REMOLQUE CAMA ALTA EXT', 'Vehiculos Pesados', 'GREAT DANE', 'EXTENDABLE', NULL, 1989, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', '373300', 'CAP: 10 T', 'VHP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('08fcd449-90dc-4b7a-8fa4-9a120f71f28e', 'REM317', 'REMOLQUE CAMA BAJA 50 T', 'Vehiculos Pesados', 'HERCULES', '50DLBHF', NULL, 1983, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', '828317', 'CAP: 50 T', 'VHP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('efbd9a1f-89e9-4d9b-81b9-843b0243f7e0', 'REM158', 'REMOLQUE CAMA BAJA 75 T', 'Vehiculos Pesados', 'LOAD KING', '753-4DFP', NULL, 1993, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', '258158', 'CAP: 75 T', 'VHP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('222d8d82-d05c-4fc3-9239-de7b51b8df24', 'REM891', 'REMOLQUE TILT TOP', 'Vehiculos Pesados', 'WISCONSIN', '2500-22', NULL, 1993, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', '262891', 'CAP: 22 T', 'VHP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('6097edbc-fea7-4106-913d-4ae8e0085939', 'REM973', 'REMOLQUE TILT TOP', 'Vehiculos Pesados', 'LOAD KING', 'SFT 3026', NULL, 1996, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', '271973', 'CAP: 20 T', 'VHP', NULL, NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('154d8ed5-572a-47e4-9bf5-9bdb834e8470', 'VOL057', 'VOLQUETE 14 CY', 'Vehiculos Pesados', 'FREIGHTLINER', 'FL80', NULL, 1994, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', '409057', NULL, 'VHP', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('3af5624f-0545-4ffb-a889-550ed422bb8c', 'VOL617', 'VOLQUETE 14 CY', 'Vehiculos Pesados', 'MACK', 'RB690S', NULL, 1992, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', '257617', 'CAP: 14 CY', 'VHP', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('63df5421-0618-42f3-8f15-19cd77506852', 'VOL812', 'VOLQUETE 14 CY', 'Vehiculos Pesados', 'MACK', 'RD600', NULL, 1999, 'Activo', NULL, '2026-03-03 18:36:00.574237+00', '443812', NULL, 'VHP', 'ODOMETRO', NULL, NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-06 13:40:39.126913+00', NULL),
	('9782fb3c-9e4b-4075-a030-320faab7a91c', 'GEN141', 'GENERADOR MD 22KVA', 'Equipo Liviano', 'GH POWER', 'GH22YML', NULL, 2021, 'Activo', 'Costa Norte', '2026-03-03 18:36:00.574237+00', NULL, NULL, 'EQL', 'HOROMETRO', 'c41f7384-a000-4753-8283-87223ced9d64', NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-12 00:38:20.947724+00', NULL),
	('e18a203b-45c6-4540-9382-19f5c46f6b2f', 'GRU260', 'GRUA 45 T', 'Gruas', 'LINK BELT', 'LS108B', NULL, 1977, 'Activo', 'Costa Norte', '2026-03-03 18:36:00.574237+00', NULL, NULL, 'GRU', 'HOROMETRO', 'c41f7384-a000-4753-8283-87223ced9d64', NULL, NULL, 'Propio', NULL, NULL, NULL, NULL, '2026-03-12 14:03:58.893781+00', NULL);


--
-- Data for Name: feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."locations" ("id", "name", "location_type", "project_id", "created_at", "contact_name", "contact_phone", "notes", "updated_at", "is_active", "address") VALUES
	('7988aa0b-7788-467a-bbd5-1a3bdf2126c4', 'Paraiso', 'proyecto', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '2026-03-03 14:13:37.193382+00', NULL, NULL, NULL, '2026-03-03 17:43:02.472984+00', true, NULL),
	('ee75c806-c6f9-410a-8dff-3622e9f3c6d9', 'Muelle 14', 'proyecto', '6743665e-4c7c-4604-8cd0-c54167dfe921', '2026-03-03 14:13:37.193382+00', NULL, NULL, NULL, '2026-03-03 17:43:02.472984+00', true, NULL),
	('f0044bec-67dc-4866-afcd-4edab867ab19', 'Costa Norte', 'proyecto', 'c41f7384-a000-4753-8283-87223ced9d64', '2026-03-03 14:13:37.193382+00', NULL, NULL, NULL, '2026-03-03 17:43:02.472984+00', true, NULL),
	('af157543-b7f9-40a5-93ae-fcdf52b4c85d', 'Oficina Central', 'otro', NULL, '2026-03-03 15:16:49.304614+00', NULL, NULL, NULL, '2026-03-03 17:43:02.472984+00', true, NULL),
	('1779a788-829a-4287-854c-62ad731bd35e', 'Metro de Panama', 'proyecto', 'c35ab299-e141-4ddf-8a33-d06dc6d961c6', '2026-03-06 20:30:13.671314+00', NULL, NULL, NULL, '2026-03-06 20:30:13.671314+00', true, NULL),
	('1a3c19fe-2c92-46c6-a75b-ab32e6d2f3c5', 'Multiplaza', 'proyecto', 'c78bf836-4303-402a-8408-6713b1113d6f', '2026-03-06 20:30:13.671314+00', NULL, NULL, NULL, '2026-03-06 20:30:13.671314+00', true, NULL),
	('e3323aad-2cbc-4fc9-9030-10a93c56732f', 'Astillero de Balboa (ASTIBAL)', 'proyecto', 'e5a51b23-4ff0-436b-b28f-dff15983713f', '2026-03-03 14:13:37.193382+00', NULL, NULL, NULL, '2026-03-06 20:37:04.398378+00', false, NULL),
	('07be447d-69b9-4cad-bcdf-203e6792ed6c', 'Taller Chilibre', 'taller', NULL, '2026-03-03 14:13:37.193382+00', NULL, NULL, NULL, '2026-03-09 04:26:54.078163+00', true, NULL);


--
-- Data for Name: mobilization_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."mobilization_rates" ("id", "code", "description", "rate", "created_at", "is_active", "updated_at") VALUES
	('5d16ad79-5e8e-47c7-8c26-e14160262ccd', 'MVG108', 'Movilizacion Grua 108', 2000.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00'),
	('da129789-41ac-40ea-8b59-85aa8d175139', 'MVG318', 'Movilizacion Grua 318', 3000.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00'),
	('af474d3d-7213-44fa-b9a4-29fac49dc9cd', 'MVG518', 'Movilizacion Grua 518', 6400.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00'),
	('9a1a971f-1e33-4909-9b0f-69237cf5d07b', 'MVGSNY', 'Movilizacion Grua Sany', 11000.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00'),
	('5c387bbf-b7b6-4f70-b71a-ad91c35cc85a', 'MVPLAT', 'Movilizacion Canter Plataforma', 200.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00'),
	('d90ec8ba-4dcc-455e-8313-4c04b941a0b3', 'MVTTOP', 'Movilizacion Tilt-Top', 350.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00'),
	('d4c754c0-5818-4c75-b2f3-6d54b55380de', 'MVCALT', 'Movilizacion Cama Alta', 425.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00'),
	('a4bda1c0-8fa8-4066-973f-c0aec9ce556a', 'MVCB50', 'Movilizacion Cama Baja 50', 500.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00'),
	('1067b520-23a4-4c10-b771-79f508a56d7e', 'MVCB75', 'Movilizacion Cama Baja 75', 600.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00'),
	('a8a381df-6b81-45c8-bf27-b48c01c88bdd', 'MVCEXT', 'Movilizacion Mesa Extendible', 550.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00'),
	('cf008b4a-05cd-44c3-aeb8-47e91f50320b', 'MVVQ11', 'Movilizacion Camion Volquete', 260.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00'),
	('4f32f85b-c3bf-4ee0-b7f6-04cd23eaf8f7', 'MVLPUP', 'Movilizacion Pick-up', 75.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00'),
	('d46a90f6-8b01-49f0-9992-2551b615bca0', 'MVAPX1', 'Movilizacion Remolcador MAR213', 5000.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00'),
	('eb82f2dc-8767-4aae-90a1-19c1cec9258e', 'MVCGRU', 'Movilizacion Camion Grua', 300.00, '2026-03-03 14:13:37.193382+00', true, '2026-03-03 17:43:02.472984+00');


--
-- Data for Name: notification_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: person_projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."person_projects" ("id", "person_id", "project_id", "updated_at", "role", "is_active", "created_at") VALUES
	('c6c66dd5-744a-4116-847b-5c44798d390c', '08ee8bb6-aa37-416e-99d2-85569581d21e', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '2026-03-04 22:44:34.527973+00', 'pm', true, '2026-03-04 22:44:34.527973+00'),
	('6b948559-72d0-4092-9bc6-032724fdbea1', '08ee8bb6-aa37-416e-99d2-85569581d21e', 'c41f7384-a000-4753-8283-87223ced9d64', '2026-03-04 22:44:34.527973+00', 'pm', true, '2026-03-04 22:44:34.527973+00'),
	('ec41ee76-320f-406d-b1ba-5e6eb218ebd4', 'f463253e-d10f-4860-a022-44df8a6d0af8', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '2026-03-04 22:44:34.527973+00', 'admin', true, '2026-03-04 22:44:34.527973+00'),
	('2d0b1ad3-1ee0-45dc-bbc1-71fefe595fb5', 'f463253e-d10f-4860-a022-44df8a6d0af8', '6743665e-4c7c-4604-8cd0-c54167dfe921', '2026-03-04 22:44:34.527973+00', 'admin', true, '2026-03-04 22:44:34.527973+00'),
	('cfc38adf-3d01-4b4f-a5c4-d2c2fa7a8713', 'f463253e-d10f-4860-a022-44df8a6d0af8', 'c41f7384-a000-4753-8283-87223ced9d64', '2026-03-04 22:44:34.527973+00', 'admin', true, '2026-03-04 22:44:34.527973+00'),
	('eb7943b9-088d-4003-b0f5-914a2af4f68c', 'f825abd3-72db-4fa5-b7c4-0fb8bba975f5', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '2026-03-04 23:06:52.323749+00', 'logistica', true, '2026-03-04 22:44:34.527973+00'),
	('5b102f38-056c-4992-8cc1-5e4433f1c717', 'f825abd3-72db-4fa5-b7c4-0fb8bba975f5', '6743665e-4c7c-4604-8cd0-c54167dfe921', '2026-03-04 23:06:52.323749+00', 'logistica', true, '2026-03-04 22:44:34.527973+00'),
	('94c185bc-9d07-4309-855e-d48c06d690dd', 'f825abd3-72db-4fa5-b7c4-0fb8bba975f5', 'c41f7384-a000-4753-8283-87223ced9d64', '2026-03-04 23:06:52.323749+00', 'logistica', true, '2026-03-04 22:44:34.527973+00'),
	('7fcdaf9f-152d-47f1-a888-33fa16f8edc8', 'f463253e-d10f-4860-a022-44df8a6d0af8', 'c35ab299-e141-4ddf-8a33-d06dc6d961c6', '2026-03-06 20:30:13.671314+00', 'admin', true, '2026-03-06 20:30:13.671314+00'),
	('e00de13d-2da5-43cb-9b18-8e2554cf5d82', 'f463253e-d10f-4860-a022-44df8a6d0af8', 'c78bf836-4303-402a-8408-6713b1113d6f', '2026-03-06 20:30:13.671314+00', 'admin', true, '2026-03-06 20:30:13.671314+00'),
	('8181d284-feb5-408c-a41d-200dfc362c71', 'f825abd3-72db-4fa5-b7c4-0fb8bba975f5', 'c35ab299-e141-4ddf-8a33-d06dc6d961c6', '2026-03-06 20:30:13.671314+00', 'logistica', true, '2026-03-06 20:30:13.671314+00'),
	('0cc4ff20-9c5f-4930-8209-c01e6104b151', 'f825abd3-72db-4fa5-b7c4-0fb8bba975f5', 'c78bf836-4303-402a-8408-6713b1113d6f', '2026-03-06 20:30:13.671314+00', 'logistica', true, '2026-03-06 20:30:13.671314+00'),
	('5baf6945-3536-4632-aa0e-5e6586a34ef7', 'bf06c037-943f-4b7b-8c47-46e6aaee514d', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '2026-03-10 19:00:49.40665+00', 'Gerente de Proyecto', true, '2026-03-10 19:00:49.40665+00'),
	('6c1a2ddf-ebee-443b-9cdb-83ca394e338c', '07193324-03ff-41a3-8d9c-09a1b6b80105', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '2026-03-10 19:00:49.40665+00', 'Superintendente', true, '2026-03-10 19:00:49.40665+00'),
	('15c3d44c-d4e0-49e3-8066-c6a1a9b8702b', 'a5908979-f50d-4e52-9cdf-c743b7d5385d', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '2026-03-10 19:00:49.40665+00', 'Ingeniero de Proyecto', true, '2026-03-10 19:00:49.40665+00'),
	('2675159f-c3d4-44ce-93c6-eb13469d40f1', '5a47cfc7-c4a5-4674-a2dc-4307d9c67f1a', '0b01a7a4-752d-43ac-b719-3fc61a13419a', '2026-03-10 19:00:49.40665+00', 'Ingeniero de Proyecto', true, '2026-03-10 19:00:49.40665+00'),
	('d59cefc7-f58f-477e-9908-2d7a37c9edec', 'c1b9dc79-1a2d-4cdf-a0f3-649b0a721da5', '6743665e-4c7c-4604-8cd0-c54167dfe921', '2026-03-10 19:00:49.40665+00', 'Gerente de Proyecto', true, '2026-03-10 19:00:49.40665+00'),
	('1b940c06-7e9e-4f60-9b61-18c827ae9c54', '3f4124c7-dcea-4bcb-a8ba-ba20c7e09200', '6743665e-4c7c-4604-8cd0-c54167dfe921', '2026-03-10 19:00:49.40665+00', 'Asistente de Proyecto', true, '2026-03-10 19:00:49.40665+00'),
	('f1355517-0c09-4d07-b8a4-1fd96bc947ba', 'bf06c037-943f-4b7b-8c47-46e6aaee514d', 'c41f7384-a000-4753-8283-87223ced9d64', '2026-03-10 19:00:49.40665+00', 'Gerente de Proyecto', true, '2026-03-10 19:00:49.40665+00'),
	('cc4f20d0-a885-43b3-b021-6738bee6bc27', '07193324-03ff-41a3-8d9c-09a1b6b80105', 'c41f7384-a000-4753-8283-87223ced9d64', '2026-03-10 19:00:49.40665+00', 'Superintendente', true, '2026-03-10 19:00:49.40665+00'),
	('64622bff-c4bb-4e58-be13-1277cf5bf6f1', 'a5908979-f50d-4e52-9cdf-c743b7d5385d', 'c41f7384-a000-4753-8283-87223ced9d64', '2026-03-10 19:00:49.40665+00', 'Ingeniero de Proyecto', true, '2026-03-10 19:00:49.40665+00'),
	('404895c5-b6c1-400e-8e86-c95634a04605', '3f4124c7-dcea-4bcb-a8ba-ba20c7e09200', 'c41f7384-a000-4753-8283-87223ced9d64', '2026-03-10 19:00:49.40665+00', 'Asistente de Proyecto', true, '2026-03-10 19:00:49.40665+00'),
	('34de4e1a-0fff-420c-a674-a8efa78739cb', '5a47cfc7-c4a5-4674-a2dc-4307d9c67f1a', 'c41f7384-a000-4753-8283-87223ced9d64', '2026-03-10 19:00:49.40665+00', 'Ingeniero de Proyecto', true, '2026-03-10 19:00:49.40665+00'),
	('c3208597-56f9-4a19-95e1-1fdca443ab42', 'f75666eb-a3d6-42b8-a802-0f541d7110d5', 'c41f7384-a000-4753-8283-87223ced9d64', '2026-03-10 19:00:49.40665+00', 'Personal de Proyecto', true, '2026-03-10 19:00:49.40665+00'),
	('0e4befc0-8b64-4472-beb1-2e0f75cc19e0', 'cfe8827e-6609-4044-9b17-0934c333f276', 'c35ab299-e141-4ddf-8a33-d06dc6d961c6', '2026-03-10 19:00:49.40665+00', 'Gerente de Proyecto', true, '2026-03-10 19:00:49.40665+00'),
	('cfb02e60-7793-4e22-8b3e-84712c10babb', 'b753f5b7-6ae8-447b-a716-bb847c78e23f', 'c35ab299-e141-4ddf-8a33-d06dc6d961c6', '2026-03-10 19:00:49.40665+00', 'Superintendente', true, '2026-03-10 19:00:49.40665+00'),
	('1d7d92d7-d5cf-4ada-87f9-3ea1d84bc9a8', '4889bda8-cbf7-4161-ae75-595eae9008cb', 'c78bf836-4303-402a-8408-6713b1113d6f', '2026-03-10 19:00:49.40665+00', 'Ingeniero de Proyecto', true, '2026-03-10 19:00:49.40665+00'),
	('10352bd8-86d5-4604-a30d-830ecae815ff', '08ee8bb6-aa37-416e-99d2-85569581d21e', '6743665e-4c7c-4604-8cd0-c54167dfe921', '2026-03-10 19:00:49.40665+00', 'Gerente de Proyecto', true, '2026-03-10 19:00:49.40665+00');


--
-- Data for Name: sequences; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."sequences" ("id", "seq_type", "project_id", "next_number") VALUES
	('3b424fa4-2e55-48e2-983b-6bb0b0f3ff9b', 'sm', '0b01a7a4-752d-43ac-b719-3fc61a13419a', 1),
	('939b7a1c-ae2d-486d-9402-c3b205d952fd', 'sm', 'c41f7384-a000-4753-8283-87223ced9d64', 1),
	('bc360059-46e1-4490-8753-55f716054e6b', 'sm', 'c35ab299-e141-4ddf-8a33-d06dc6d961c6', 1),
	('03859556-c846-416d-981a-3c9dd682c5e2', 'sm', '6743665e-4c7c-4604-8cd0-c54167dfe921', 1),
	('7d82e97f-0ebc-4e19-a0e9-956ee38e687b', 'trip', NULL, 1),
	('92a99e61-211d-44fd-8e77-7e23c3487b65', 'sm', 'c78bf836-4303-402a-8408-6713b1113d6f', 1);


--
-- Data for Name: sm_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."units" ("id", "code", "description", "updated_at", "created_at") VALUES
	('f110c10e-c0ab-420f-a211-23654973caf8', 'und', 'Unidad', '2026-03-03 17:43:02.472984+00', '2026-03-03 19:26:20.644288+00'),
	('81b0dcd1-78b9-4413-bda3-d601b9a5830d', 'ml', 'Metro lineal', '2026-03-03 17:43:02.472984+00', '2026-03-03 19:26:20.644288+00'),
	('3db8cf3c-19fa-4e6e-b78c-ef47e29a5ff3', 'm2', 'Metro cuadrado', '2026-03-03 17:43:02.472984+00', '2026-03-03 19:26:20.644288+00'),
	('b8bfadb3-6bab-4651-8ee8-7506587c53e8', 'm3', 'Metro cubico', '2026-03-03 17:43:02.472984+00', '2026-03-03 19:26:20.644288+00'),
	('80d5631d-78b0-42ef-8945-d71ce821affb', 'kg', 'Kilogramo', '2026-03-03 17:43:02.472984+00', '2026-03-03 19:26:20.644288+00'),
	('c9ca5854-f5e6-4e99-baec-6b7e2e112c51', 'ton', 'Tonelada', '2026-03-03 17:43:02.472984+00', '2026-03-03 19:26:20.644288+00'),
	('94919260-3f55-456d-a494-bb1084907e86', 'gal', 'Galon', '2026-03-03 17:43:02.472984+00', '2026-03-03 19:26:20.644288+00'),
	('566717aa-50d0-4991-a989-56204265bd0a', 'juegos', 'Juegos', '2026-03-03 17:43:02.472984+00', '2026-03-03 19:26:20.644288+00'),
	('c954e9c0-81d6-447e-a25c-c6d55445372f', 'pzas', 'Piezas', '2026-03-03 17:43:02.472984+00', '2026-03-03 19:26:20.644288+00'),
	('1ba47f96-2b89-4bed-9733-1b437b85c38d', 'ft', 'Pie', '2026-03-03 17:43:02.472984+00', '2026-03-03 19:26:20.644288+00'),
	('363d569e-fd64-428c-acc4-7c46591bb571', 'qq', 'Quintal', '2026-03-03 17:43:02.472984+00', '2026-03-03 19:26:20.644288+00');


--
-- Data for Name: sm_request_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: suggestions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: trips; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: trip_events; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: trip_line_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_app_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_app_roles" ("id", "person_id", "app_code", "role_code", "is_active", "granted_by", "granted_at", "notes", "created_at", "updated_at") VALUES
	('8970f816-f0fd-4a13-b54f-97c147cb5a82', '08ee8bb6-aa37-416e-99d2-85569581d21e', 'movilizaciones', 'solicitante', true, NULL, '2026-03-06 14:48:19.233734+00', 'Migrado desde people.app_role=pm el 2026-03-06', '2026-03-06 14:48:19.233734+00', '2026-03-06 14:48:19.233734+00'),
	('00f7388c-6216-42e9-8974-dbeac31ff716', '52f0e8e2-4bcc-455c-a678-d28dae9a4a9d', 'movilizaciones', 'receptor', true, NULL, '2026-03-06 14:48:19.233734+00', 'Migrado desde people.app_role=almacen el 2026-03-06', '2026-03-06 14:48:19.233734+00', '2026-03-06 14:48:19.233734+00'),
	('83cfde6e-40a9-4df1-823a-470b3793d412', 'd726fcc6-57b1-4691-900e-cba5ea361ff3', 'movilizaciones', 'operador', true, NULL, '2026-03-06 14:48:19.233734+00', 'Migrado desde people.app_role=campo el 2026-03-06', '2026-03-06 14:48:19.233734+00', '2026-03-06 14:48:19.233734+00'),
	('367a632b-66d6-4362-a602-74b883c330f2', 'f463253e-d10f-4860-a022-44df8a6d0af8', 'movilizaciones', 'admin', true, NULL, '2026-03-06 14:48:19.233734+00', 'Migrado desde people.app_role=admin el 2026-03-06', '2026-03-06 14:48:19.233734+00', '2026-03-06 14:48:19.233734+00'),
	('71b64bb8-1221-40d2-8ecb-b494bbcc78ad', 'aa46945f-3d98-408a-88e4-92930e427604', 'movilizaciones', 'operador', true, NULL, '2026-03-06 14:48:19.233734+00', 'Migrado desde people.app_role=campo el 2026-03-06', '2026-03-06 14:48:19.233734+00', '2026-03-06 14:48:19.233734+00'),
	('65b5ab37-d8b0-4367-9cb3-ca9d122e3487', 'f825abd3-72db-4fa5-b7c4-0fb8bba975f5', 'movilizaciones', 'coordinador', true, NULL, '2026-03-06 14:48:19.233734+00', 'Migrado desde people.app_role=logistica el 2026-03-06', '2026-03-06 14:48:19.233734+00', '2026-03-06 14:48:19.233734+00'),
	('53b6a92a-3fc6-45c3-a772-3bfa8e4eecae', '6a007480-10df-446e-aad9-dceca1485b18', 'movilizaciones', 'operador', true, NULL, '2026-03-06 14:48:19.233734+00', 'Migrado desde people.app_role=campo el 2026-03-06', '2026-03-06 14:48:19.233734+00', '2026-03-06 14:48:19.233734+00'),
	('17a994b9-d41f-43e0-b644-85695360df41', '92779bfc-ed3d-47ae-8bf0-ccc93d5ebcd3', 'movilizaciones', 'operador', true, NULL, '2026-03-06 14:48:19.233734+00', 'Migrado desde people.app_role=campo el 2026-03-06', '2026-03-06 14:48:19.233734+00', '2026-03-06 14:48:19.233734+00'),
	('323e9e55-6099-49d4-a53f-717ac7c95d2a', 'eba3a408-2b21-41f2-a9ee-86d551c8d43b', 'movilizaciones', 'operador', true, NULL, '2026-03-06 14:48:19.233734+00', 'Migrado desde people.app_role=campo el 2026-03-06', '2026-03-06 14:48:19.233734+00', '2026-03-06 14:48:19.233734+00'),
	('3b0c96de-022d-475f-b6e8-4d8df210c0fe', '3f4124c7-dcea-4bcb-a8ba-ba20c7e09200', 'movilizaciones', 'solicitante', true, NULL, '2026-03-06 14:48:19.233734+00', 'Migrado desde people.app_role=pm el 2026-03-06', '2026-03-06 14:48:19.233734+00', '2026-03-06 14:48:19.233734+00'),
	('be490862-1541-4c34-bb53-8b463ada11f5', '4889bda8-cbf7-4161-ae75-595eae9008cb', 'movilizaciones', 'solicitante', true, NULL, '2026-03-06 19:13:42.866087+00', 'Asignado 2026-03-06 — personal de proyecto', '2026-03-06 19:13:42.866087+00', '2026-03-06 19:13:42.866087+00'),
	('557b2e24-b4ba-42ce-be69-87fc464e0cdf', 'b753f5b7-6ae8-447b-a716-bb847c78e23f', 'movilizaciones', 'solicitante', true, NULL, '2026-03-06 19:13:42.866087+00', 'Asignado 2026-03-06 — personal de proyecto', '2026-03-06 19:13:42.866087+00', '2026-03-06 19:13:42.866087+00'),
	('cc71f7c9-1fcb-4b18-8991-64886f35e870', 'd3d0a1da-961a-4890-a73c-ac1a33c7508e', 'movilizaciones', 'solicitante', true, NULL, '2026-03-06 19:13:42.866087+00', 'Asignado 2026-03-06 — personal de proyecto', '2026-03-06 19:13:42.866087+00', '2026-03-06 19:13:42.866087+00'),
	('aae8e36a-cf76-4c16-ba12-0ffa5787c41d', '33e239d2-a2a6-4e56-a742-0dc7f580596c', 'movilizaciones', 'solicitante', true, NULL, '2026-03-06 19:13:42.866087+00', 'Asignado 2026-03-06 — personal de proyecto', '2026-03-06 19:13:42.866087+00', '2026-03-06 19:13:42.866087+00'),
	('0414a4f9-51b5-4ebc-8d0e-24e4da8d0809', '5a47cfc7-c4a5-4674-a2dc-4307d9c67f1a', 'movilizaciones', 'solicitante', true, NULL, '2026-03-06 19:13:42.866087+00', 'Asignado 2026-03-06 — personal de proyecto', '2026-03-06 19:13:42.866087+00', '2026-03-06 19:13:42.866087+00'),
	('cc09fa7f-2c64-4be5-902f-791be7a6501e', 'a5908979-f50d-4e52-9cdf-c743b7d5385d', 'movilizaciones', 'solicitante', true, NULL, '2026-03-06 19:13:42.866087+00', 'Asignado 2026-03-06 — personal de proyecto', '2026-03-06 19:13:42.866087+00', '2026-03-06 19:13:42.866087+00'),
	('d08c8231-ca95-4fdd-955f-9a957ebc29ff', '07193324-03ff-41a3-8d9c-09a1b6b80105', 'movilizaciones', 'solicitante', true, NULL, '2026-03-06 19:13:42.866087+00', 'Asignado 2026-03-06 — personal de proyecto', '2026-03-06 19:13:42.866087+00', '2026-03-06 19:13:42.866087+00'),
	('2d6ce6b1-37d1-41b7-a0c0-4b81bf924940', 'bf06c037-943f-4b7b-8c47-46e6aaee514d', 'movilizaciones', 'solicitante', true, NULL, '2026-03-06 19:13:42.866087+00', 'Asignado 2026-03-06 — personal de proyecto', '2026-03-06 19:13:42.866087+00', '2026-03-06 19:13:42.866087+00'),
	('cfab11a7-9bed-497e-8149-3e491452d1f9', 'cfe8827e-6609-4044-9b17-0934c333f276', 'movilizaciones', 'solicitante', true, NULL, '2026-03-06 19:13:42.866087+00', 'Asignado 2026-03-06 — personal de proyecto', '2026-03-06 19:13:42.866087+00', '2026-03-06 19:13:42.866087+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('attachments', 'attachments', NULL, '2026-03-15 20:34:40.46077+00', '2026-03-15 20:34:40.46077+00', false, false, 10485760, '{application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif}', NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") VALUES
	('3b5fe842-998e-4176-afae-3f9c2041bb76', 'attachments', 'events/a5c4df0e-1616-4a84-8ead-e7d9afd21672/1773612661924-Tarifas_de_Movilizaciones.png', '380a4028-abef-47c0-8479-080c7970d00d', '2026-03-15 22:11:02.501176+00', '2026-03-15 22:11:02.501176+00', '2026-03-15 22:11:02.501176+00', '{"eTag": "\"f6ffb0fa87b2c40423866b2198d6d722\"", "size": 114111, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-03-15T22:11:03.000Z", "contentLength": 114111, "httpStatusCode": 200}', '8d5f1465-e41b-4ac4-9110-c8859baf1377', '380a4028-abef-47c0-8479-080c7970d00d', '{}'),
	('c5502782-a33f-41e3-b9ac-46e9ab4a28db', 'attachments', 'events/2e5bd14e-547a-4e0a-8545-c5d22d2f6c8a/1773612770362-24-410-RD-241231.doc.pdf', '7b707095-8390-4332-8ac3-0c43bb6cedc7', '2026-03-15 22:12:54.287515+00', '2026-03-15 22:12:54.287515+00', '2026-03-15 22:12:54.287515+00', '{"eTag": "\"1d37e3d914b8db3c89741bc4dcce5695\"", "size": 1186350, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-03-15T22:12:55.000Z", "contentLength": 1186350, "httpStatusCode": 200}', '86b476e5-fff8-4827-b676-418bfb0d2d64', '7b707095-8390-4332-8ac3-0c43bb6cedc7', '{}'),
	('3fc25b80-88ea-4676-a882-d0e69b579b7d', 'attachments', 'events/caf4c3d9-8865-4734-81c8-74044a4d7fd7/1773612890253-26670_ILUMITEC_-_22-208_.pdf', '7b707095-8390-4332-8ac3-0c43bb6cedc7', '2026-03-15 22:14:51.592621+00', '2026-03-15 22:14:51.592621+00', '2026-03-15 22:14:51.592621+00', '{"eTag": "\"34a5839c3b409c4e877b9fb3a3c8106c\"", "size": 103799, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-03-15T22:14:52.000Z", "contentLength": 103799, "httpStatusCode": 200}', 'f47088fa-bc25-4bcb-be08-120ac4ef2c63', '7b707095-8390-4332-8ac3-0c43bb6cedc7', '{}'),
	('e08e4b13-57f2-4b14-94ac-2f01f5ecc685', 'attachments', 'requests/b779aa60-2165-4d7c-bc9f-9ff493c7aa7b/1773614050277-26670_ILUMITEC_-_22-208_.pdf', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '2026-03-15 22:34:11.093351+00', '2026-03-15 22:34:11.093351+00', '2026-03-15 22:34:11.093351+00', '{"eTag": "\"34a5839c3b409c4e877b9fb3a3c8106c\"", "size": 103799, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-03-15T22:34:12.000Z", "contentLength": 103799, "httpStatusCode": 200}', '59f9ec3d-63ab-4cda-bcab-5b3857bbfc65', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '{}'),
	('ae33dc26-15e1-4c54-9e14-6e4c73321c94', 'attachments', 'requests/f172d578-5762-442e-a8d2-48024c1d9bac/1773615295927-22-208_-_OCI_24950_-_HB_Estructuras_metalicas_2023-03-22.pdf', '7b707095-8390-4332-8ac3-0c43bb6cedc7', '2026-03-15 22:54:58.358242+00', '2026-03-15 22:54:58.358242+00', '2026-03-15 22:54:58.358242+00', '{"eTag": "\"1c52a6cdcad7acd8c183e8c676ce8f77\"", "size": 1478376, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-03-15T22:54:59.000Z", "contentLength": 1478376, "httpStatusCode": 200}', '2f1224c8-e393-4060-affc-3dad89677899', '7b707095-8390-4332-8ac3-0c43bb6cedc7', '{}'),
	('d2eb0141-b305-458a-9a89-0b05cbcdbf93', 'attachments', 'requests/f4001a29-af1d-4307-b18f-3417ea4f79df/1773619984688-26670_ILUMITEC_-_22-208_.pdf', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '2026-03-16 00:13:07.785083+00', '2026-03-16 00:13:07.785083+00', '2026-03-16 00:13:07.785083+00', '{"eTag": "\"34a5839c3b409c4e877b9fb3a3c8106c\"", "size": 103799, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-03-16T00:13:08.000Z", "contentLength": 103799, "httpStatusCode": 200}', '095fb338-df41-47a1-a2ac-67bebc8d0af3', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '{}'),
	('39d65822-45c0-4b96-8a58-25e029166973', 'attachments', 'requests/5e50b404-8382-455c-9a41-fe4b9b3c4e36/1773621839155-22-208_-_OCI_24950_-_HB_Estructuras_metalicas_2023-03-22.pdf', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '2026-03-16 00:44:10.145229+00', '2026-03-16 00:44:10.145229+00', '2026-03-16 00:44:10.145229+00', '{"eTag": "\"1c52a6cdcad7acd8c183e8c676ce8f77\"", "size": 1478376, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-03-16T00:44:11.000Z", "contentLength": 1478376, "httpStatusCode": 200}', '29ff0a64-add7-43a1-aa71-810c7dfe3ac8', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '{}'),
	('45560aa0-d614-4ea3-977d-950f569a6d87', 'attachments', 'requests/6b8ccc3f-c0b7-4987-bbb9-906f6116361a/1773623296038-26670_ILUMITEC_-_22-208_.pdf', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '2026-03-16 01:08:16.672699+00', '2026-03-16 01:08:16.672699+00', '2026-03-16 01:08:16.672699+00', '{"eTag": "\"34a5839c3b409c4e877b9fb3a3c8106c\"", "size": 103799, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-03-16T01:08:17.000Z", "contentLength": 103799, "httpStatusCode": 200}', 'b75937f1-687c-4e98-b0a1-e8c57c4bdd13', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '{}'),
	('a343af7e-3f9c-4189-96ee-e906587a31f4', 'attachments', 'events/8cf3db7b-484e-4f40-b6c7-94c123861f74/1773625385957-YDH_Kinger.png', 'a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', '2026-03-16 01:43:06.525169+00', '2026-03-16 01:43:06.525169+00', '2026-03-16 01:43:06.525169+00', '{"eTag": "\"d68896140ec309b0b847cc82da32a116\"", "size": 189063, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-03-16T01:43:07.000Z", "contentLength": 189063, "httpStatusCode": 200}', 'f2730a11-dccf-4cd0-80ac-e48ebc4bcd90', 'a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', '{}'),
	('f2f61ada-9e87-4ee9-9522-24dc56460202', 'attachments', 'events/7c0069b2-0a11-4d82-b72c-19ecf888e6f7/1773625467195-YDH_Kinger.png', 'a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', '2026-03-16 01:44:28.354466+00', '2026-03-16 01:44:28.354466+00', '2026-03-16 01:44:28.354466+00', '{"eTag": "\"d68896140ec309b0b847cc82da32a116\"", "size": 189063, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-03-16T01:44:29.000Z", "contentLength": 189063, "httpStatusCode": 200}', '14f4b591-55df-4ae0-94f2-3c6ab9d8a128', 'a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', '{}'),
	('98e241d7-598c-4ad9-9030-6bf4badc239e', 'attachments', 'events/7872f511-6690-4847-b466-d861047394b1/1773625507048-YDH_Kinger.png', 'a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', '2026-03-16 01:45:10.388165+00', '2026-03-16 01:45:10.388165+00', '2026-03-16 01:45:10.388165+00', '{"eTag": "\"d68896140ec309b0b847cc82da32a116\"", "size": 189063, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-03-16T01:45:11.000Z", "contentLength": 189063, "httpStatusCode": 200}', '2abe4051-060c-4d22-ac5b-ab97c50b3154', 'a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', '{}'),
	('84e97e80-8e4f-4687-a3c6-1b9b9f03214f', 'attachments', 'events/7872f511-6690-4847-b466-d861047394b1/1773625515109-YDH_Kinger.png', 'a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', '2026-03-16 01:45:17.556861+00', '2026-03-16 01:45:17.556861+00', '2026-03-16 01:45:17.556861+00', '{"eTag": "\"d68896140ec309b0b847cc82da32a116\"", "size": 189063, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-03-16T01:45:18.000Z", "contentLength": 189063, "httpStatusCode": 200}', 'a0075fd8-f047-4b11-b82a-2b68be17200e', 'a5b1f64c-e71e-4858-8f54-9082ebd6cbaa', '{}'),
	('3f6f4609-b829-45b4-b782-61bd04646093', 'attachments', 'events/9de10d9a-38a7-47c4-a4b2-08acebc5ed1d/1773627348967-17736273416551409801897274464231.jpg', '7b707095-8390-4332-8ac3-0c43bb6cedc7', '2026-03-16 02:15:51.12155+00', '2026-03-16 02:15:51.12155+00', '2026-03-16 02:15:51.12155+00', '{"eTag": "\"ced10fafa151fc3537d2717dc4a68838\"", "size": 911691, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-03-16T02:15:52.000Z", "contentLength": 911691, "httpStatusCode": 200}', 'd269f371-2c36-4e08-bc7f-eb195d94742c', '7b707095-8390-4332-8ac3-0c43bb6cedc7', '{}'),
	('021bae7c-9e3e-47ec-b45d-e2461c68d6ce', 'attachments', 'requests/22b2da93-6038-430f-b15a-f47a4aabdecd/1773666926965-26670_ILUMITEC_-_22-208_.pdf', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '2026-03-16 13:15:29.672072+00', '2026-03-16 13:15:29.672072+00', '2026-03-16 13:15:29.672072+00', '{"eTag": "\"34a5839c3b409c4e877b9fb3a3c8106c\"", "size": 103799, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-03-16T13:15:30.000Z", "contentLength": 103799, "httpStatusCode": 200}', '9332da00-0634-470f-b9f6-d0ed31f52dac', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '{}'),
	('36020797-ccce-4526-8686-17785f5eccdb', 'attachments', 'requests/aad53cd1-5da0-431d-b51f-123e0933d09e/1773706803434-26670_ILUMITEC_-_22-208_.pdf', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '2026-03-17 00:20:08.043686+00', '2026-03-17 00:20:08.043686+00', '2026-03-17 00:20:08.043686+00', '{"eTag": "\"34a5839c3b409c4e877b9fb3a3c8106c\"", "size": 103799, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-03-17T00:20:08.000Z", "contentLength": 103799, "httpStatusCode": 200}', '3fa52809-739a-450c-9ff2-51856fd9665f', '1dc2cfa3-c1a5-40bf-8e01-0dc996c63c03', '{}');


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 161, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict q4cqUjF1g5OKZiUx0a9auj5c4dZpQbQ3eHfZgl4PQ9KjmpC7w0sFUm7aNnRcJZX

RESET ALL;
