-- 20260528000000_init_schema.sql
-- Inicjalizacja schematu bazy danych dla Systemu Ankiet Szkolnych

-- 1. Tabela profilu administratora (powiązana z Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'admin' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela kodów dostępowych uczniów
CREATE TABLE IF NOT EXISTS public.codes (
    code TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    school TEXT NOT NULL,
    class TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela ankiet
CREATE TABLE IF NOT EXISTS public.surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    "group" TEXT NOT NULL,
    version TEXT CHECK (version IN ('P', 'E')) NOT NULL,
    status TEXT CHECK (status IN ('DRAFT', 'PUBLISHED')) DEFAULT 'DRAFT' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela pytań do ankiet
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('SINGLE', 'MULTI', 'TEXT', 'LIKERT')) NOT NULL,
    text TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb NOT NULL,
    order_index INTEGER NOT NULL,
    weight INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela odpowiedzi uczniów
CREATE TABLE IF NOT EXISTS public.responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID REFERENCES public.surveys(id) ON DELETE SET NULL,
    task_id INTEGER NOT NULL,
    version TEXT CHECK (version IN ('P', 'E')) NOT NULL,
    student_code TEXT REFERENCES public.codes(code) ON DELETE SET NULL,
    answers JSONB NOT NULL,
    score INTEGER DEFAULT 0 NOT NULL,
    max_score INTEGER DEFAULT 0 NOT NULL,
    consent BOOLEAN DEFAULT FALSE NOT NULL,
    cert_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Włączenie RLS (Row Level Security) dla wszystkich tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- 7. Polisy RLS (Row Level Security)

-- PROFILE ADMINÓW: Tylko zalogowany admin widzi i edytuje swój profil
CREATE POLICY "Admini widzą swoje profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admini mogą edytować swoje profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ANKIETY: Publicznie widoczne są tylko opublikowane. Zapis/edycja tylko dla Admina.
CREATE POLICY "Każdy widzi opublikowane ankiety" ON public.surveys
    FOR SELECT USING (status = 'PUBLISHED');

CREATE POLICY "Admini mogą robić wszystko z ankietami" ON public.surveys
    FOR ALL TO authenticated USING (true);

-- PYTANIA: Widoczne publicznie, jeśli ankieta jest opublikowana. Zapis/edycja tylko dla Admina.
CREATE POLICY "Każdy widzi pytania do opublikowanych ankiet" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.surveys 
            WHERE surveys.id = questions.survey_id AND surveys.status = 'PUBLISHED'
        )
    );

CREATE POLICY "Admini mogą robić wszystko z pytaniami" ON public.questions
    FOR ALL TO authenticated USING (true);

-- KODY: Odczyt i zapis tylko przez backend (Service Role) lub przez zalogowanego Admina.
-- Blokujemy publiczny odczyt tabeli codes na kliencie z powodów RODO.
CREATE POLICY "Admini widzą kody uczniów" ON public.codes
    FOR ALL TO authenticated USING (true);

-- ODPOWIEDZI: Zapis publiczny (przez uczniów). Odczyt tylko dla Admina.
CREATE POLICY "Każdy może wysłać odpowiedź" ON public.responses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admini widzą wszystkie odpowiedzi" ON public.responses
    FOR ALL TO authenticated USING (true);
