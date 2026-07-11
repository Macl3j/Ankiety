-- 20260711010000_add_dashboard_avg_score_rpc.sql
-- Dashboard liczyl srednia zdawalnosc z klienckiego fetcha responses(score,max_score),
-- ktory (jak i cala lista odpowiedzi w tabeli) byl bez .range() i cichutko obcinany
-- przez domyslny limit PostgREST (1000 wierszy) - przy 12k+ odpowiedziach dawalo to
-- blednie policzona srednia z losowego wycinka danych. Agregacja SQL nie ma tego problemu.
CREATE OR REPLACE FUNCTION public.get_average_score_percent()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT CASE WHEN COALESCE(SUM(max_score), 0) > 0
    THEN ROUND(SUM(score)::numeric / SUM(max_score) * 100)
    ELSE 0
  END::integer
  FROM public.responses
  WHERE max_score > 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_average_score_percent() TO authenticated;
