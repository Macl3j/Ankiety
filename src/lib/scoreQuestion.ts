// scoreQuestion.ts
// Logika punktacji pytania live (SINGLE/MULTI z opcjami `correct: true` i `weight`).
// Ten sam algorytm co /api/survey/submit — wydzielony tutaj, bo byl dotad kopiowany
// osobno w src/app/api/pdf/analysis/route.ts. TEXT/LIKERT (bez `options`) nigdy nie sa
// punktowane - zwracaja null.
export function scoreQuestion(q: { type: string; options: any; weight?: number }, userAnswer: any): number | null {
  if (!Array.isArray(q.options)) return null;

  const weight = typeof q.weight === 'number' && q.weight > 0 ? q.weight : 1;
  const correctOptions = q.options.filter((o: any) => o.correct === true);
  if (correctOptions.length === 0) return null;

  if (q.type === 'SINGLE') {
    return userAnswer === correctOptions[0].text ? weight : 0;
  }

  if (q.type === 'MULTI') {
    const userTexts = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
    const correctTexts = correctOptions.map((o: any) => o.text).sort();
    const isExactMatch =
      correctTexts.length === userTexts.length &&
      correctTexts.every((t: string, i: number) => t === userTexts[i]);
    return isExactMatch ? weight : 0;
  }

  return null;
}
