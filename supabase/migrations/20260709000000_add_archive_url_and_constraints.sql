-- 20260709000000_add_archive_url_and_constraints.sql
-- Naprawa brakującej kolumny archive_pdf_url oraz zabezpieczenie przed duplikatami odpowiedzi

-- 1. Kolumna na link do PDF-archiwum odpowiedzi (zapisywana przez /api/survey/submit, brakowało jej w schemacie)
ALTER TABLE public.responses
ADD COLUMN IF NOT EXISTS archive_pdf_url TEXT;

-- 2. Unikalność odpowiedzi per uczeń/zadanie/wersja — zapobiega duplikatom przy równoczesnym/podwójnym submicie
-- (PostgreSQL nie zna "ADD CONSTRAINT IF NOT EXISTS", więc sprawdzamy istnienie ręcznie)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'responses_student_task_version_unique'
    ) THEN
        ALTER TABLE public.responses
        ADD CONSTRAINT responses_student_task_version_unique UNIQUE (student_code, task_id, version);
    END IF;
END $$;
