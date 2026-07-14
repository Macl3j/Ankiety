// sheetImport.ts
// Import nowych kodow/odpowiedzi z rownoleglego arkusza Google ("System Ankiet 2025")
// do naszej bazy. Arkusz jest udostepniony publicznie do odczytu, wiec czytamy go przez
// jego wbudowany eksport CSV (gviz/tq) - bez potrzeby konta serwisowego Google API.
import { supabaseAdmin } from '@/lib/supabaseClient';
import { parseCsvToObjects } from '@/lib/csvParse';
import { scoreQuestion } from '@/lib/scoreQuestion';

const SHEET_ID = '1-zSnN_nxZG_GBwfelYcLQYbUxzXUj4q6Zb6OSWqcKr8';

async function fetchSheetRows(sheetName: string): Promise<Record<string, string>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Nie udalo sie pobrac arkusza "${sheetName}" (HTTP ${res.status})`);
  const text = await res.text();
  return parseCsvToObjects(text);
}

// Kody zlozone z jednej powtorzonej cyfry (np. "111111", "0000") to niemal zawsze
// dane testowe wpisane podczas budowy arkusza - domyslnie odznaczone w podglodzie,
// ale nadal widoczne, zeby admin mogl swiadomie zdecydowac.
function isSuspiciousCode(code: string, firstName: string, lastName: string): boolean {
  if (/^(\d)\1{2,}$/.test(code)) return true;
  if (firstName.trim() === '0' && lastName.trim() === '0') return true;
  return false;
}

export interface PlannedCode {
  code: string;
  firstName: string;
  lastName: string;
  school: string;
  class: string;
  createdAt: string;
  suspicious: boolean;
}

export interface PlannedResponse {
  key: string; // `${code}|${taskId}|${version}`
  studentCode: string;
  taskId: number;
  version: 'P' | 'E';
  timestamp: string;
  surveyTitle: string;
  score: number;
  maxScore: number;
  suspicious: boolean;
  // Dane potrzebne wylacznie do faktycznego zapisu (nie serializujemy calosci do UI)
  _surveyId: string | null;
  _answers: Record<string, { question: string; answer: string; points: number | null }>;
  _consent: boolean;
}

export interface ImportPlan {
  newCodes: PlannedCode[];
  newResponses: PlannedResponse[];
  skippedBlankCodeResponses: number;
  skippedExtraDuplicateSubmissions: number;
  sheetTotals: { codes: number; responses: number };
}

function parseSurveyIdParts(surveyId: string): { taskId: number; grade: string; version: 'P' | 'E' } | null {
  const m = surveyId.trim().match(/^t(\d+)_k(\d+)_(p|e)$/i);
  if (!m) return null;
  return { taskId: Number(m[1]), grade: m[2], version: m[3].toUpperCase() as 'P' | 'E' };
}

export async function buildImportPlan(): Promise<ImportPlan> {
  const [sheetCodes, sheetResponses, sheetQuestions] = await Promise.all([
    fetchSheetRows('Codes'),
    fetchSheetRows('Responses'),
    fetchSheetRows('Questions'),
  ]);

  const validSheetCodes = sheetCodes.filter((r) => (r.Code || '').trim() !== '');
  const sheetCodeValues = Array.from(new Set(validSheetCodes.map((r) => r.Code.trim())));

  // ---------- Kody: co juz istnieje w bazie ----------
  const CHUNK = 200;
  const existingCodes = new Set<string>();
  for (let i = 0; i < sheetCodeValues.length; i += CHUNK) {
    const chunk = sheetCodeValues.slice(i, i + CHUNK);
    const { data, error } = await supabaseAdmin.from('codes').select('code').in('code', chunk);
    if (error) throw error;
    (data || []).forEach((r: any) => existingCodes.add(r.code));
  }

  const newCodes: PlannedCode[] = validSheetCodes
    .filter((r) => !existingCodes.has(r.Code.trim()))
    .map((r) => ({
      code: r.Code.trim(),
      firstName: r.FirstName || '',
      lastName: r.LastName || '',
      school: r.School || '',
      class: r.Class || '',
      createdAt: r.CreatedDate || '',
      suspicious: isSuspiciousCode(r.Code.trim(), r.FirstName || '', r.LastName || ''),
    }));

  // ---------- Grupowanie wierszy arkusza po (kod, task, wersja) ----------
  let skippedBlankCodeResponses = 0;
  const byCombo = new Map<string, Record<string, string>[]>();
  for (const r of sheetResponses) {
    const code = (r.RespondentID || '').trim();
    if (!code) {
      skippedBlankCodeResponses += 1;
      continue;
    }
    const taskId = Number(r.TaskID || 0);
    const version = (r.Version || '').trim();
    const key = `${code}|${taskId}|${version}`;
    if (!byCombo.has(key)) byCombo.set(key, []);
    byCombo.get(key)!.push(r);
  }

  // ---------- Odpowiedzi: co juz istnieje w bazie (student_code, task_id, version) ----------
  // Sprawdzamy kody z obu zrodel (arkusz Codes + faktyczni respondenci w arkuszu Responses),
  // bo nie kazdy RespondentID musi miec odpowiadajacy wiersz w zakladce Codes.
  const codesToCheck = Array.from(new Set([
    ...sheetCodeValues,
    ...Array.from(byCombo.keys()).map((k) => k.split('|')[0]),
  ]));
  const existingCombo = new Set<string>();
  for (let i = 0; i < codesToCheck.length; i += CHUNK) {
    const chunk = codesToCheck.slice(i, i + CHUNK);
    const { data, error } = await supabaseAdmin
      .from('responses')
      .select('student_code, task_id, version')
      .in('student_code', chunk);
    if (error) throw error;
    (data || []).forEach((r: any) => existingCombo.add(`${r.student_code}|${r.task_id}|${r.version}`));
  }

  const newComboKeys = Array.from(byCombo.keys()).filter((k) => !existingCombo.has(k));

  // ---------- Pytania z arkusza: potrzebne do liczenia punktow i tresci pytan ----------
  interface SheetQ { id: string; surveyId: string; type: string; text: string; options: any[]; order: number; weight: number }
  const questionsBySurvey = new Map<string, SheetQ[]>();
  for (const q of sheetQuestions) {
    const id = q.QuestionID;
    if (!id) continue;
    let options: any[] = [];
    try {
      options = q.OptionsJSON ? JSON.parse(q.OptionsJSON) : [];
    } catch {
      options = [];
    }
    const parsed: SheetQ = {
      id,
      surveyId: q.SurveyID,
      type: q.Type,
      text: q.Text,
      options,
      order: Number(q.Order || 0),
      weight: Number(q.Weight || 1),
    };
    if (!questionsBySurvey.has(q.SurveyID)) questionsBySurvey.set(q.SurveyID, []);
    questionsBySurvey.get(q.SurveyID)!.push(parsed);
  }
  for (const list of questionsBySurvey.values()) list.sort((a, b) => a.order - b.order);

  // ---------- Mapowanie SurveyID arkusza -> nasz surveys.id (live) po task_id + tytule ----------
  const surveyIdCache = new Map<string, string | null>();
  async function resolveSurveyId(taskId: number, grade: string, version: 'P' | 'E'): Promise<string | null> {
    const cacheKey = `${taskId}|${grade}|${version}`;
    if (surveyIdCache.has(cacheKey)) return surveyIdCache.get(cacheKey)!;
    const title = `Ankieta ${version === 'P' ? 'Początkowa' : 'Ewaluacyjna'} - Klasa ${grade}`;
    const { data, error } = await supabaseAdmin
      .from('surveys')
      .select('id')
      .eq('task_id', taskId)
      .eq('title', title)
      .maybeSingle();
    if (error) throw error;
    const id = data?.id || null;
    surveyIdCache.set(cacheKey, id);
    return id;
  }

  let skippedExtraDuplicateSubmissions = 0;
  const newResponses: PlannedResponse[] = [];

  for (const key of newComboKeys) {
    const rows = byCombo.get(key)!;
    const [code, taskIdStr, version] = key.split('|');
    const taskId = Number(taskIdStr);

    // Gdy uczen ma wiecej niz jedno zgloszenie tej samej wersji w arkuszu (np. wypelnil
    // dwa razy), bierzemy najwczesniejsze dla P (pierwsza probka) i najpozniejsze dla E
    // (finalny wynik) - spojnie z poprzednim rownoleglym importem z tego samego arkusza.
    const sorted = [...rows].sort((a, b) => (a.Timestamp || '').localeCompare(b.Timestamp || ''));
    const chosen = version === 'E' ? sorted[sorted.length - 1] : sorted[0];
    skippedExtraDuplicateSubmissions += rows.length - 1;

    const surveyIdParts = parseSurveyIdParts(chosen.SurveyID || '');
    const grade = surveyIdParts?.grade || '';
    const surveyId = await resolveSurveyId(taskId, grade, version as 'P' | 'E');

    let answersRaw: Record<string, any> = {};
    try {
      answersRaw = chosen.AnswersJSON ? JSON.parse(chosen.AnswersJSON) : {};
    } catch {
      answersRaw = {};
    }

    const questions = questionsBySurvey.get(chosen.SurveyID || '') || [];
    const answers: Record<string, { question: string; answer: string; points: number | null }> = {};
    let score = 0;
    let maxScore = 0;
    questions.forEach((q, idx) => {
      const raw = answersRaw[q.id];
      const answerText = Array.isArray(raw) ? raw.join(', ') : raw === null || raw === undefined ? '' : String(raw);
      const points = scoreQuestion({ type: q.type, options: q.options, weight: q.weight }, raw);
      if (points !== null) {
        score += points;
        maxScore += typeof q.weight === 'number' && q.weight > 0 ? q.weight : 1;
      }
      answers[`q_${idx + 1}`] = { question: q.text, answer: answerText, points };
    });

    const codeInfo = validSheetCodes.find((c) => c.Code.trim() === code);
    newResponses.push({
      key,
      studentCode: code,
      taskId,
      version: version as 'P' | 'E',
      timestamp: chosen.Timestamp || '',
      surveyTitle: `Ankieta ${version === 'P' ? 'Początkowa' : 'Ewaluacyjna'} - Klasa ${grade}`,
      score,
      maxScore,
      suspicious: codeInfo ? isSuspiciousCode(code, codeInfo.FirstName || '', codeInfo.LastName || '') : /^(\d)\1{2,}$/.test(code),
      _surveyId: surveyId,
      _answers: answers,
      _consent: (chosen.ConsentRODO || '').trim().toUpperCase() === 'TRUE',
    });
  }

  return {
    newCodes,
    newResponses,
    skippedBlankCodeResponses,
    skippedExtraDuplicateSubmissions,
    sheetTotals: { codes: validSheetCodes.length, responses: sheetResponses.length },
  };
}
