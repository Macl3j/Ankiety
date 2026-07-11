// pdfSanitize.ts
// Wspolny helper usuwajacy emoji i inne znaki, ktore potrafia wywolac crash
// kodowania stringow w pdf-lib/@react-pdf/renderer (patrz historia: commit o sanityzacji archiwum PDF).
export function sanitizeText(text: unknown): string {
  if (!text) return '';
  // dopuszczamy typowe znaki lacinskie, cyfry i interpunkcje
  return String(text).replace(new RegExp('[^\\x20-\\x7E\\xA0-\\xFF\\u0100-\\u017F\\u0180-\\u024F\\u1E00-\\u1EFF\\u2000-\\u206F]', 'g'), '');
}

// Nagłówki HTTP (np. Content-Disposition) muszą być ByteString (Latin-1) — polskie znaki
// jak "ł" (U+0142) leżą poza tym zakresem i wywalają "Cannot convert argument to a
// ByteString" przy próbie ustawienia nagłówka. Ta funkcja usuwa diakrytyki i redukuje
// nazwę pliku do bezpiecznego ASCII, niezależnie od sanitizeText (która celowo zachowuje
// polskie znaki w treści PDF).
export function asciiFilename(text: unknown): string {
  if (!text) return 'plik';
  const stripped = String(text)
    .normalize('NFKD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L');
  const safe = stripped.replace(new RegExp('[^A-Za-z0-9._-]', 'g'), '_');
  return safe || 'plik';
}
