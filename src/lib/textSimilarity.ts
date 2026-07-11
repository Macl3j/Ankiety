// textSimilarity.ts
// Lekki odpowiednik Pythonowego difflib.SequenceMatcher.ratio() (uzywany w starym
// generatorze "Analiza Indywidualna" do parowania pytan P<->E po tekscie, gdy
// zestawy pytan roznia sie miedzy edycjami ankiety). Dice coefficient na bigramach
// znakowych — prosty, bez zaleznosci, wystarczajaco dobry do progowania >0.4.
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function bigramCounts(s: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const bg = s.slice(i, i + 2);
    counts.set(bg, (counts.get(bg) || 0) + 1);
  }
  return counts;
}

export function similarityRatio(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0;

  const bgA = bigramCounts(na);
  const bgB = bigramCounts(nb);

  let intersection = 0;
  for (const [bg, countA] of bgA) {
    const countB = bgB.get(bg);
    if (countB) intersection += Math.min(countA, countB);
  }

  const totalBigrams = (na.length - 1) + (nb.length - 1);
  if (totalBigrams === 0) return 0;
  return (2 * intersection) / totalBigrams;
}

// Znajduje w `candidates` element najbardziej podobny do `target` (po polu question),
// zwraca null jesli nic nie przekroczy progu.
export function findBestMatch<T extends { question: string }>(
  targetQuestion: string,
  candidates: T[],
  threshold = 0.4
): T | null {
  let best: T | null = null;
  let bestRatio = 0;
  for (const c of candidates) {
    const ratio = similarityRatio(targetQuestion, c.question);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = c;
    }
  }
  return bestRatio > threshold ? best : null;
}
