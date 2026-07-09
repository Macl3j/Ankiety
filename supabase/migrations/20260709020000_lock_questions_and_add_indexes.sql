-- 20260709020000_lock_questions_and_add_indexes.sql
-- 1. Egzekwowanie blokady edycji pytań opublikowanej ankiety na poziomie RLS
--    (wcześniej blokada była tylko kosmetyczna w UI — admin mógł ominąć ją z devtools).
--    Przepływ w builderze wymaga i tak cofnięcia statusu do DRAFT przed edycją,
--    więc to tylko domyka to, co UI już sugeruje.

DROP POLICY IF EXISTS "Admini mogą robić wszystko z pytaniami" ON public.questions;

CREATE POLICY "Admini widzą wszystkie pytania" ON public.questions
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admini mogą dodawać pytania do ankiet w wersji roboczej" ON public.questions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        AND EXISTS (SELECT 1 FROM public.surveys WHERE surveys.id = questions.survey_id AND surveys.status = 'DRAFT')
    );

CREATE POLICY "Admini mogą edytować pytania ankiet w wersji roboczej" ON public.questions
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        AND EXISTS (SELECT 1 FROM public.surveys WHERE surveys.id = questions.survey_id AND surveys.status = 'DRAFT')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        AND EXISTS (SELECT 1 FROM public.surveys WHERE surveys.id = questions.survey_id AND surveys.status = 'DRAFT')
    );

CREATE POLICY "Admini mogą usuwać pytania ankiet w wersji roboczej" ON public.questions
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        AND EXISTS (SELECT 1 FROM public.surveys WHERE surveys.id = questions.survey_id AND surveys.status = 'DRAFT')
    );

-- 2. Indeksy na kolumnach używanych w WHERE/JOIN przy każdym submit/verify/analytics
CREATE INDEX IF NOT EXISTS idx_responses_student_code ON public.responses(student_code);
CREATE INDEX IF NOT EXISTS idx_responses_task_version ON public.responses(task_id, version);
CREATE INDEX IF NOT EXISTS idx_questions_survey_id ON public.questions(survey_id);
