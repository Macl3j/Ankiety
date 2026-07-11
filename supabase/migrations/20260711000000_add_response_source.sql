-- 20260711000000_add_response_source.sql
-- Znacznik pochodzenia rekordu, żeby odróżnić dane z live-flow (/api/survey/submit)
-- od danych zaimportowanych masowo z historycznych eksportów MS Forms.
-- Potrzebne, bo importowane odpowiedzi mają consent=true bez rzeczywistego
-- zdarzenia zgody w systemie (zgoda zebrana offline w momencie wypełniania w MS Forms)
-- oraz answers w innym formacie (zdenormalizowanym, patrz archive/route.ts).

ALTER TABLE public.responses
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'live';

ALTER TABLE public.codes
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'admin';
