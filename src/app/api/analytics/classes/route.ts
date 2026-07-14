// route.ts (api/analytics/classes)
// Analityka na poziomie pojedynczej klasy/szkoly: porownanie sredniego wyniku
// Ankieta Poczatkowa (P) vs Ewaluacyjna (E) oraz trudnosc poszczegolnych pytan.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { normalizeSchool, normalizeClass } from '@/lib/schoolClassNormalize';
import { buildQAFromImported, buildQAFromLive, QAItem } from '@/lib/buildQA';
import { findBestMatch } from '@/lib/textSimilarity';

export const dynamic = 'force-dynamic';

// Supabase/PostgREST domyslnie ucina zapytanie bez .range() do 1000 wierszy - `codes` ma
// juz ponad 10 000 rekordow, wiec trzeba pobrac wszystko partiami (ten sam wzorzec co
// w /api/analytics).
async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function normalizedTextKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

interface QuestionAgg {
  question: string;
  sumPoints: number;
  maxObserved: number;
  n: number;
}

function aggregateByQuestion(items: QAItem[]): QuestionAgg[] {
  const map = new Map<string, QuestionAgg>();
  for (const item of items) {
    if (item.points === null) continue; // pytania nieoceniane (otwarte/opiniotworcze) pomijamy
    const key = normalizedTextKey(item.question);
    let agg = map.get(key);
    if (!agg) {
      agg = { question: item.question, sumPoints: 0, maxObserved: 0, n: 0 };
      map.set(key, agg);
    }
    agg.sumPoints += item.points;
    agg.n += 1;
    if (item.points > agg.maxObserved) agg.maxObserved = item.points;
  }
  return Array.from(map.values());
}

function avgPercent(agg: QuestionAgg): number | null {
  if (agg.n === 0 || agg.maxObserved === 0) return null;
  return Math.round((agg.sumPoints / agg.n / agg.maxObserved) * 100);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolParam = searchParams.get('school');
    const gradeParam = searchParams.get('grade');
    const letterParam = searchParams.get('letter'); // 'all' albo konkretna litera
    const taskIdParam = searchParams.get('taskId'); // konkretna runda albo brak (wszystkie)

    // ---------- 1. Lista dostepnych rund (task_id) ----------
    const { data: surveys, error: surveysErr } = await supabaseAdmin
      .from('surveys')
      .select('task_id');
    if (surveysErr) throw surveysErr;

    const taskIds: number[] = (surveys || []).map((s: any) => Number(s.task_id));
    const uniqueTaskIds = Array.from(new Set(taskIds)).sort((a: number, b: number) => a - b);

    // ---------- 2. Kody uczniow: budowa filtrow szkola/klasa (znormalizowane) ----------
    const codes = await fetchAllRows<any>((from, to) =>
      supabaseAdmin.from('codes').select('code, school, class').range(from, to)
    );

    const schoolSet = new Map<string, number>(); // normalized school -> liczba kodow
    const classesBySchool = new Map<string, Map<string, { grade: string; letter: string; label: string; count: number }>>();

    for (const c of codes) {
      const school = normalizeSchool(c.school);
      const nc = normalizeClass(c.class);
      schoolSet.set(school, (schoolSet.get(school) || 0) + 1);

      if (!classesBySchool.has(school)) classesBySchool.set(school, new Map());
      const classMap = classesBySchool.get(school)!;
      const classKey = `${nc.grade}|${nc.letter}`;
      const existing = classMap.get(classKey);
      if (existing) existing.count += 1;
      else classMap.set(classKey, { grade: nc.grade, letter: nc.letter, label: nc.label, count: 1 });
    }

    const filters = {
      schools: Array.from(schoolSet.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pl')),
      classesBySchool: Object.fromEntries(
        Array.from(classesBySchool.entries()).map(([school, m]) => [
          school,
          Array.from(m.values()).sort((a, b) => a.grade.localeCompare(b.grade) || a.letter.localeCompare(b.letter)),
        ])
      ),
      tasks: uniqueTaskIds.map((t) => ({ taskId: t, label: `Runda ${t}` })),
    };

    if (!schoolParam || !gradeParam) {
      // Sam wybor filtrow jeszcze niekompletny - zwracamy tylko liste dostepnych opcji.
      return NextResponse.json({ filters, summary: null, questionDifficulty: [] });
    }

    // ---------- 3. Kody uczniow pasujace do wybranej szkoly/klasy ----------
    const matchingCodes = codes
      .filter((c: any) => {
        if (normalizeSchool(c.school) !== schoolParam) return false;
        const nc = normalizeClass(c.class);
        if (nc.grade !== gradeParam) return false;
        if (letterParam && letterParam !== 'all') {
          const wantedLetter = letterParam === 'none' ? '' : letterParam;
          if (nc.letter !== wantedLetter) return false;
        }
        return true;
      })
      .map((c: any) => c.code);

    if (matchingCodes.length === 0) {
      return NextResponse.json({ filters, summary: null, questionDifficulty: [] });
    }

    // ---------- 4. Odpowiedzi tych uczniow (partiami po kodach, zeby nie przekroczyc dlugosci URL) ----------
    const CHUNK = 200;
    let responses: any[] = [];
    for (let i = 0; i < matchingCodes.length; i += CHUNK) {
      const chunk = matchingCodes.slice(i, i + CHUNK);
      let q = supabaseAdmin
        .from('responses')
        .select('id, survey_id, task_id, version, student_code, score, max_score, answers, source, created_at')
        .in('student_code', chunk);
      if (taskIdParam) q = q.eq('task_id', Number(taskIdParam));
      const { data, error } = await q;
      if (error) throw error;
      responses.push(...(data || []));
    }

    // ---------- 5. Podsumowanie P vs E ----------
    const pResponses = responses.filter((r) => r.version === 'P');
    const eResponses = responses.filter((r) => r.version === 'E');
    const codesWithP = new Set(pResponses.map((r) => r.student_code));
    const codesWithE = new Set(eResponses.map((r) => r.student_code));
    const bothPandE = matchingCodes.filter((c: string) => codesWithP.has(c) && codesWithE.has(c)).length;

    const sumPercent = (rows: any[]): number | null => {
      const valid = rows.filter((r) => r.max_score > 0);
      if (valid.length === 0) return null;
      const totalScore = valid.reduce((s, r) => s + r.score, 0);
      const totalMax = valid.reduce((s, r) => s + r.max_score, 0);
      return totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;
    };

    const avgP = sumPercent(pResponses);
    const avgE = sumPercent(eResponses);

    const summary = {
      studentsTotal: matchingCodes.length,
      studentsP: codesWithP.size,
      studentsE: codesWithE.size,
      bothPandE,
      avgP,
      avgE,
      delta: avgP !== null && avgE !== null ? avgE - avgP : null,
      participationRate: matchingCodes.length > 0 ? Math.round((bothPandE / matchingCodes.length) * 100) : 0,
    };

    // ---------- 6. Trudnosc pytan - tylko gdy wybrana konkretna runda (taskId) ----------
    let questionDifficulty: any[] = [];
    // Cz. historycznych zaimportowanych odpowiedzi nigdy nie dostala backfillu punktow
    // per pytanie (answers ma tylko {question, answer}, bez `points`) - dla takich
    // wierszy questionDifficulty ich pomija, wiec pokazujemy to wprost w UI zamiast
    // cichej pustki, ktora wyglada jak blad.
    let questionCoverage: { pWithData: number; pTotal: number; eWithData: number; eTotal: number } | null = null;

    if (taskIdParam) {
      const questionsCache = new Map<string, any[]>();
      const getQuestionsForSurvey = async (surveyId: string) => {
        if (questionsCache.has(surveyId)) return questionsCache.get(surveyId)!;
        const { data } = await supabaseAdmin
          .from('questions')
          .select('*')
          .eq('survey_id', surveyId)
          .order('order_index', { ascending: true });
        questionsCache.set(surveyId, data || []);
        return data || [];
      };

      const buildAllQA = async (rows: any[]): Promise<{ items: QAItem[]; withDataCount: number }> => {
        const items: QAItem[] = [];
        let withDataCount = 0;
        for (const r of rows) {
          let qa: QAItem[];
          if (r.source !== 'live') {
            qa = buildQAFromImported(r.answers);
          } else {
            const preloaded = await getQuestionsForSurvey(r.survey_id);
            qa = await buildQAFromLive(r.survey_id, r.answers, preloaded);
          }
          if (qa.some((q) => q.points !== null)) withDataCount += 1;
          items.push(...qa);
        }
        return { items, withDataCount };
      };

      const { items: qaAllP, withDataCount: pWithData } = await buildAllQA(pResponses);
      const { items: qaAllE, withDataCount: eWithData } = await buildAllQA(eResponses);

      questionCoverage = { pWithData, pTotal: pResponses.length, eWithData, eTotal: eResponses.length };

      const aggP = aggregateByQuestion(qaAllP);
      const aggE = aggregateByQuestion(qaAllE);

      questionDifficulty = aggE
        .map((eAgg) => {
          const match = findBestMatch(eAgg.question, aggP, 0.4);
          const percentE = avgPercent(eAgg);
          const percentP = match ? avgPercent(match) : null;
          return {
            question: eAgg.question,
            avgPercentP: percentP,
            avgPercentE: percentE,
            delta: percentP !== null && percentE !== null ? percentE - percentP : null,
            nP: match ? match.n : 0,
            nE: eAgg.n,
          };
        })
        .sort((a, b) => (a.avgPercentE ?? 100) - (b.avgPercentE ?? 100));
    }

    return NextResponse.json({ filters, summary, questionDifficulty, questionCoverage });
  } catch (error: any) {
    console.error('Analytics classes error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
