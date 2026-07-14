// schoolClassNormalize.ts
// `codes.school` i `codes.class` to wolny tekst wpisywany ręcznie (lub z importu MS Forms),
// więc ta sama szkoła/klasa występuje pod wieloma wariantami zapisu (spacje, myślniki,
// wielkość liter, literówki). Te funkcje są czysto prezentacyjne/filtrujące — nie modyfikują
// danych w bazie — i grupują tylko te warianty, co do których jesteśmy pewni (wzorzec "SP N"
// dla szkół, "<cyfra><opcjonalna litera>" dla klas). Niejednoznaczne wpisy (np. "VII",
// "Łopiennie" vs "Łopienne") celowo NIE są ze sobą sklejane — bezpieczniej zostawić je jako
// odrębne pozycje niż zgadywać.

export function normalizeSchool(raw: string | null | undefined): string {
  if (!raw) return 'Nieznana szkoła';

  let s = raw.trim();
  s = s.replace(/^(w|we)\s+/i, '');
  s = s.replace(/[-–—]+/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  if (!s) return 'Nieznana szkoła';

  const spMatch = s.match(/^(.*?)\s*SP\s*0*(\d+)$/i);
  if (spMatch && spMatch[1].trim()) {
    const city = spMatch[1].trim();
    return `${capitalize(city)} SP ${spMatch[2]}`;
  }

  return capitalize(s);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface NormalizedClass {
  grade: string; // np. "2", "5", "7", albo "inne"
  letter: string; // np. "a", "b" - moze byc puste
  label: string; // etykieta do wyswietlenia, np. "7b", "7", albo surowa wartosc dla "inne"
}

export function normalizeClass(raw: string | null | undefined): NormalizedClass {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return { grade: 'inne', letter: '', label: 'Brak klasy' };
  }

  const s = trimmed.toLowerCase();
  const m = s.match(/^(\d+)\s*([a-ząćęłńóśźż]?)/);
  if (m) {
    const grade = m[1];
    const letter = m[2] || '';
    return { grade, letter, label: letter ? `${grade}${letter}` : grade };
  }

  return { grade: 'inne', letter: '', label: trimmed };
}

export function formatClassLabel(nc: NormalizedClass): string {
  if (nc.grade === 'inne') return nc.label;
  return nc.letter ? `Klasa ${nc.grade}${nc.letter}` : `Klasa ${nc.grade}`;
}
