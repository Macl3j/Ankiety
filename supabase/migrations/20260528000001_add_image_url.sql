-- 20260528000001_add_image_url.sql
-- Dodanie kolumny image_url do tabeli pytań w celu umożliwienia dodawania ilustracji

ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS image_url TEXT;
