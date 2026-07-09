// pdfSanitize.ts
// Wspolny helper usuwajacy emoji i inne znaki, ktore potrafia wywolac crash
// kodowania stringow w pdf-lib/@react-pdf/renderer (patrz historia: commit o sanityzacji archiwum PDF).
export function sanitizeText(text: unknown): string {
  if (!text) return '';
  // dopuszczamy typowe znaki lacinskie, cyfry i interpunkcje
  return String(text).replace(new RegExp('[^\\x20-\\x7E\\xA0-\\xFF\\u0100-\\u017F\\u0180-\\u024F\\u1E00-\\u1EFF\\u2000-\\u206F]', 'g'), '');
}
