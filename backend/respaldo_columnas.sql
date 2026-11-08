--
-- PostgreSQL database dump
--



-- Dumped from database version 15.19 (Debian 15.19-1.pgdg13+2)
-- Dumped by pg_dump version 15.19 (Debian 15.19-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."User" (id, email, "passwordHash", nombre, rol, "createdAt", "updatedAt", "tokenVersion", "fotoArchivo", "fotoTipo", "codigosRespaldo", "totpActivo", "totpSecretoCifrado") VALUES (1, 'alejandino@uls.edu.sv', '$2b$10$3umrI9LzjCl3osdQB20MuermsmK1IwBlpC/ugTLKLkhArAI60AHLK', 'andy', 'ESTUDIANTE', '2026-10-30 04:21:36.187', '2026-10-30 04:21:36.187', 0, NULL, NULL, '{}', false, NULL);
INSERT INTO public."User" (id, email, "passwordHash", nombre, rol, "createdAt", "updatedAt", "tokenVersion", "fotoArchivo", "fotoTipo", "codigosRespaldo", "totpActivo", "totpSecretoCifrado") VALUES (2, 'admin@uls.edu.sv', '$2b$10$yUgkUD81xBP3G5ImAlg1duq8/1suuX7FL00XDfiS7jc1C.3R3SwbK', 'admin', 'COORDINACION', '2026-10-31 03:59:35.531', '2026-10-31 03:59:35.531', 0, NULL, NULL, '{}', false, NULL);
INSERT INTO public."User" (id, email, "passwordHash", nombre, rol, "createdAt", "updatedAt", "tokenVersion", "fotoArchivo", "fotoTipo", "codigosRespaldo", "totpActivo", "totpSecretoCifrado") VALUES (3, 'ar24244@uls.edu.sv', '$2b$10$pJlqBHFs8b7jXUzoBGbZ/O72YjaMcYtnWwQgAqiwWgUEsDxKbOh7m', 'andy', 'ESTUDIANTE', '2026-10-31 16:25:14.848', '2026-10-31 16:25:14.848', 0, NULL, NULL, '{}', false, NULL);


--
-- Data for Name: PerfilEstudiante; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."PerfilEstudiante" (id, "userId", "porcentajeAvance", "historialAcademico", disponibilidad, habilidades, carnet, "fotoPublicId", "fotoUrl") VALUES (2, 2, 0, NULL, NULL, '{}', 'WEWDD', NULL, NULL);
INSERT INTO public."PerfilEstudiante" (id, "userId", "porcentajeAvance", "historialAcademico", disponibilidad, habilidades, carnet, "fotoPublicId", "fotoUrl") VALUES (3, 3, 0, NULL, NULL, '{}', 'AR12345', NULL, NULL);
INSERT INTO public."PerfilEstudiante" (id, "userId", "porcentajeAvance", "historialAcademico", disponibilidad, habilidades, carnet, "fotoPublicId", "fotoUrl") VALUES (1, 1, 22, 'sdd', 'TIEMPO_PARCIAL', '{}', 'AR24244', 'workspace-uls/perfiles/usuario-1-1793765401698', 'https://res.cloudinary.com/di1jq64tu/image/upload/v1793765384/workspace-uls/perfiles/usuario-1-1793765401698.jpg');


--
-- Data for Name: Proyecto; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Proyecto" (id, "perfilId", titulo, descripcion, "urlRepositorio", "urlDemo", "urlDocumentacion", "estadoValidacion", "createdAt", "updatedAt", tecnologias, publicado) VALUES (2, 3, 'we3w323', 'deweewdwdewdwddr', 'https://wewe', NULL, NULL, 'VALIDADO', '2026-10-31 16:27:25.32', '2026-11-02 02:45:36.486', '{}', true);
INSERT INTO public."Proyecto" (id, "perfilId", titulo, descripcion, "urlRepositorio", "urlDemo", "urlDocumentacion", "estadoValidacion", "createdAt", "updatedAt", tecnologias, publicado) VALUES (1, 1, 'proyecto de catedra', 'estee proyecto de bahjsa enhwidbjegbkjsaegkjbdr', 'https://github.com/alejandino123-cmd/-parcial1Astro_6', 'https://app.netlify.com/projects/sprightly-mooncake-617963/overview', NULL, 'VALIDADO', '2026-10-31 03:18:32.189', '2026-11-03 04:04:38.827', '{}', true);


--
-- Data for Name: ValidacionProyecto; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."ValidacionProyecto" (id, "proyectoId", comentario, "createdAt", "coordinadorId") VALUES (1, 1, NULL, '2026-10-31 04:01:19.545', 2);
INSERT INTO public."ValidacionProyecto" (id, "proyectoId", comentario, "createdAt", "coordinadorId") VALUES (2, 2, NULL, '2026-10-31 16:27:59.556', 2);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- Name: PerfilEstudiante_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PerfilEstudiante_id_seq"', 4, true);


--
-- Name: Proyecto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Proyecto_id_seq"', 2, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 3, true);


--
-- Name: ValidacionProyecto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ValidacionProyecto_id_seq"', 2, true);


--
-- PostgreSQL database dump complete
--

