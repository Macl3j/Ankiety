-- 20260709010000_harden_rls_policies.sql
-- Zaostrzenie RLS: polityki "authenticated USING (true)" dawały pełny dostęp
-- każdemu zalogowanemu userowi, nie tylko adminom. Teraz sprawdzają profiles.role = 'admin'.
-- Dodatkowo zamykamy publiczny INSERT do responses z poziomu anon key — zapis danych
-- ma iść wyłącznie przez /api/survey/submit (supabaseAdmin, service_role, pomija RLS).

-- 1. Trigger tworzący profil admina automatycznie dla nowych kont Supabase Auth
--    (wcześniej tabela profiles nie była w ogóle zasilana — nowe konto zostałoby
--    niejawnie zablokowane przez poniższe polityki)
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'admin')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_user();

-- 2. ANKIETY — tylko role='admin' może zarządzać, nie każdy zalogowany
DROP POLICY IF EXISTS "Admini mogą robić wszystko z ankietami" ON public.surveys;
CREATE POLICY "Admini mogą robić wszystko z ankietami" ON public.surveys
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. PYTANIA — jw.
DROP POLICY IF EXISTS "Admini mogą robić wszystko z pytaniami" ON public.questions;
CREATE POLICY "Admini mogą robić wszystko z pytaniami" ON public.questions
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. KODY UCZNIÓW — jw.
DROP POLICY IF EXISTS "Admini widzą kody uczniów" ON public.codes;
CREATE POLICY "Admini widzą kody uczniów" ON public.codes
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. ODPOWIEDZI — podgląd tylko dla adminów (INSERT zostaje osobną, węższą polityką niżej)
DROP POLICY IF EXISTS "Admini widzą wszystkie odpowiedzi" ON public.responses;
CREATE POLICY "Admini widzą wszystkie odpowiedzi" ON public.responses
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admini mogą zarządzać odpowiedziami" ON public.responses;
CREATE POLICY "Admini mogą zarządzać odpowiedziami" ON public.responses
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admini mogą usuwać odpowiedzi" ON public.responses;
CREATE POLICY "Admini mogą usuwać odpowiedzi" ON public.responses
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Zamykamy publiczny (anon) INSERT do responses — zapis danych ucznia idzie wyłącznie
--    przez /api/survey/submit, który używa supabaseAdmin (service_role, z pominięciem RLS).
--    Bez tego każdy mógł wstawić dowolny rekord (cudzy student_code, sfałszowany wynik)
--    bezpośrednio przez REST API Supabase z publicznym anon key.
DROP POLICY IF EXISTS "Każdy może wysłać odpowiedź" ON public.responses;
