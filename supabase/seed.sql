-- seed.sql
-- Dane testowe dla Systemu Ankiet Szkolnych

-- 1. Zasiewanie przykładowych kodów uczniowskich
INSERT INTO public.codes (code, first_name, last_name, school, class) VALUES
('ALAN5A', 'Alan', 'Sternalski', 'SP5 Gniezno', '5a'),
('ANNA5B', 'Anna', 'Nowak', 'SP2 Gniezno', '5b'),
('KAS5C', 'Katarzyna', 'Kowalska', 'SP6 Gniezno', '5c')
ON CONFLICT (code) DO NOTHING;

-- 2. Zasiewanie przykładowej Ankiety Początkowej (Zadanie 1, Klasa 5)
INSERT INTO public.surveys (id, task_id, title, "group", version, status) VALUES
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 1, 'Ankieta Początkowa - Klasa 5', 'Klasa 5', 'P', 'PUBLISHED')
ON CONFLICT (id) DO NOTHING;

-- 3. Zasiewanie pytań do Ankiety Początkowej (Klasa 5)
INSERT INTO public.questions (id, survey_id, type, text, options, order_index, weight) VALUES
-- Pytanie 1: Single choice (Jednokrotny wybór)
('f1111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'SINGLE', 
'Ile klatek potrzebujesz, by stworzyć 1 sekundę filmu poklatkowego?', 
'[
  {"text": "Standardowo film poklatkowy powinien mieć minimum 60 klatek na sekundę.", "correct": false},
  {"text": "Standardowo film poklatkowy powinien mieć minimum 25 klatek na sekundę.", "correct": true},
  {"text": "Nie wiem, ale chętnie się dowiem.", "correct": false}
]'::jsonb, 1, 1),

-- Pytanie 2: Multi choice (Wielokrotny wybór)
('f2222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'MULTI', 
'Które z poniższych bloków kodów w Scratchu są Ci znane?', 
'[
  {"text": "Bloki ruchu (np. przesuń o 10 kroków)", "correct": true},
  {"text": "Bloki wyglądu (np. zmień kostium)", "correct": true},
  {"text": "Nie znam, ale chętnie poznam", "correct": false}
]'::jsonb, 2, 1),

-- Pytanie 3: Likert scale (Skala Likerta)
('f3333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'LIKERT', 
'Jak oceniasz swoje dotychczasowe zainteresowanie programowaniem?', 
'[]'::jsonb, 3, 1),

-- Pytanie 4: Open text (Pytanie otwarte)
('f4444444-4444-4444-4444-444444444444', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'TEXT', 
'W jakiej aplikacji można stworzyć film poklatkowy? Wpisz nazwę:', 
'[]'::jsonb, 4, 1)
ON CONFLICT (id) DO NOTHING;

-- 4. Zasiewanie przykładowej Ankiety Ewaluacyjnej (Zadanie 1, Klasa 5)
INSERT INTO public.surveys (id, task_id, title, "group", version, status) VALUES
('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 1, 'Ankieta Ewaluacyjna - Klasa 5', 'Klasa 5', 'E', 'PUBLISHED')
ON CONFLICT (id) DO NOTHING;

-- 5. Zasiewanie pytań do Ankiety Ewaluacyjnej (Klasa 5)
INSERT INTO public.questions (id, survey_id, type, text, options, order_index, weight) VALUES
('f5555555-5555-5555-5555-555555555555', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'LIKERT', 
'Czy zajęcia spełniły Twoje oczekiwania?', 
'[]'::jsonb, 1, 1),

('f6666666-6666-6666-6666-666666666666', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'LIKERT', 
'Czy ilość materiału była odpowiednia?', 
'[]'::jsonb, 2, 1),

('f7777777-7777-7777-7777-777777777777', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'TEXT', 
'Które ćwiczenie podobało Ci się najbardziej?', 
'[]'::jsonb, 3, 1)
ON CONFLICT (id) DO NOTHING;
