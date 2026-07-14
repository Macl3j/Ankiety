// csvParse.ts
// Minimalny parser CSV zgodny z RFC4180 (cudzyslowy, "" jako escapowany cudzyslow,
// przecinki/nowe linie wewnatrz pol w cudzyslowach). Celowo bez zewnetrznej biblioteki -
// srodowisko deweloperskie nie ma tu dostepu do npm, wiec nie da sie bezpiecznie dodac
// nowej zaleznosci i zweryfikowac builda lokalnie przed wdrozeniem.

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  // Usuwamy BOM, jesli jest (Arkusze Google czasem go dodaja)
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\r') {
      i += 1;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  // Ostatnie pole/wiersz (plik moze nie konczyc sie znakiem nowej linii)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// Parsuje CSV z pierwszym wierszem jako naglowkiem i zwraca tablice obiektow.
export function parseCsvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text).filter((r) => !(r.length === 1 && r[0] === ''));
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = r[idx] ?? '';
    });
    return obj;
  });
}
