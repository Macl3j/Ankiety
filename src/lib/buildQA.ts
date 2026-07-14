// buildQA.ts
// Buduje liste {question, answer, points} z odpowiedzi ucznia - wspolne dla PDF-u
// "Analiza Indywidualna" i dla agregacji klasowej w /api/analytics/classes. Wydzielone
// z src/app/api/pdf/analysis/route.ts, zeby nie kopiowac tej logiki po raz trzeci.
import { supabaseAdmin } from '@/lib/supabaseClient';
import { sanitizeText } from '@/lib/pdfSanitize';
import { scoreQuestion } from '@/lib/scoreQuestion';

export interface QAItem {
  question: string;
  answer: string;
  points: number | null;
}

// Odpowiedzi zaimportowane spoza live-flow (MS Forms lub arkusz rownoleglego systemu -
// source != 'live') maja answers juz zdenormalizowane jako {"q_1": {question, answer, points}, ...}.
export function buildQAFromImported(answers: Record<string, any>): QAItem[] {
  return Object.keys(answers)
    .sort((a, b) => {
      const na = parseInt(a.replace('q_', ''), 10);
      const nb = parseInt(b.replace('q_', ''), 10);
      return na - nb;
    })
    .map((key) => ({
      question: sanitizeText(answers[key].question),
      answer: sanitizeText(
        Array.isArray(answers[key].answer) ? answers[key].answer.join(', ') : answers[key].answer
      ),
      points: typeof answers[key].points === 'number' ? answers[key].points : null,
    }));
}

// Odpowiedzi live - answers jest kluczowane po UUID pytania, wiec trzeba je zlaczyc
// z biezaca tabela `questions`. Punkty liczone przez scoreQuestion() (ten sam algorytm
// co /api/survey/submit). `preloadedQuestions` pozwala wywolujacemu podac juz pobrana
// liste pytan (np. przy agregacji wielu odpowiedzi tej samej ankiety), zeby nie odpytywac
// bazy osobno dla kazdej odpowiedzi.
export async function buildQAFromLive(
  surveyId: string,
  answers: Record<string, any>,
  preloadedQuestions?: any[]
): Promise<QAItem[]> {
  let questions = preloadedQuestions;
  if (!questions) {
    const { data } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('order_index', { ascending: true });
    questions = data || [];
  }

  if (!questions) return [];

  return questions.map((q: any) => {
    const userAnswer = answers[q.id];
    const answerText = Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer ?? '');

    return {
      question: sanitizeText(q.text),
      answer: sanitizeText(answerText.toString()),
      points: scoreQuestion(q, userAnswer),
    };
  });
}
