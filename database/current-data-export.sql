--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (Homebrew)
-- Dumped by pg_dump version 17.5 (Homebrew)

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
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.categories (id, name, description, color, icon, parent_id, level, sort_order, is_active, created_at, updated_at) VALUES ('cat_1757229877019_ffnn76mzc', '内科学', NULL, '#6b7280', '📂', NULL, 1, 0, true, '2025-09-07 15:24:37.019535+08', '2025-09-07 15:24:37.019535+08');
INSERT INTO public.categories (id, name, description, color, icon, parent_id, level, sort_order, is_active, created_at, updated_at) VALUES ('cat_1757229889098_5dj6wuy8c', '消化内科', NULL, '#6b7280', '📂', 'cat_1757229877019_ffnn76mzc', 2, 0, true, '2025-09-07 15:24:49.099096+08', '2025-09-07 15:24:49.099096+08');
INSERT INTO public.categories (id, name, description, color, icon, parent_id, level, sort_order, is_active, created_at, updated_at) VALUES ('cat_1757229899002_3g47ov26f', '外科学', NULL, '#6b7280', '📂', NULL, 1, 0, true, '2025-09-07 15:24:59.003385+08', '2025-09-07 15:24:59.003385+08');
INSERT INTO public.categories (id, name, description, color, icon, parent_id, level, sort_order, is_active, created_at, updated_at) VALUES ('cat_1757229904567_0l5kd8zp7', '护理学', NULL, '#6b7280', '📂', NULL, 1, 0, true, '2025-09-07 15:25:04.568193+08', '2025-09-07 15:25:04.568193+08');


--
-- Data for Name: audios; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.audios (id, title, description, filename, url, cover_image, upload_date, subject, tags, size, duration, speaker, recording_date, status, category_id, subcategory_id) VALUES ('audio_1757230876374_fjc26ug7i', '评论降糖药对糖尿病视网膜病变的影响', '', '评论降糖药对糖尿病视网膜病变的影响_1757230876355_e2a8396e810ea726.wav', '/uploads/audios/评论降糖药对糖尿病视网膜病变的影响_1757230876355_e2a8396e810ea726.wav', '/uploads/covers/cover_icons8_grok_240_1757231826833_2q8zse.png', '2025-09-07 15:41:16.374+08', NULL, '["[]"]', 25753530, NULL, '', NULL, 'published', 'cat_1757229877019_ffnn76mzc', 'cat_1757229889098_5dj6wuy8c');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, username, email, password, role, status, created_at, last_login, preferences) VALUES ('user-1753408717107-5x6uioj68', 'admin', 'chkd@qq.com', '\\\', 'admin', 'active', '2025-09-07 16:32:17.856495+08', NULL, NULL);
INSERT INTO public.users (id, username, email, password, role, status, created_at, last_login, preferences) VALUES ('1757234111016', 'Hugo', 'dajiawa@gmail.com', '$2b$12$RNC7c3hG1xhp7HUSQWddc.WeWx1xv6.AmW97n.Hd5XkLo.M03u1ne', 'user', 'active', '2025-09-07 16:35:11.016+08', '2025-09-07 16:35:11.016+08', NULL);


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: answers; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: audio_resume_states; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: markers; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ratings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: related_resources; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: slides; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: transcriptions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--

