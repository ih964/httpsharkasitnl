export const MAX_FONT_BYTES = 20 * 1024 * 1024;
const MAX_SESSION_BYTES = 40 * 1024 * 1024;
export type PdfFontInfo = { family: string; style: string; fullName: string; postscriptName: string; format: 'TTF' | 'OTF'; glyphCount: number };
export type SessionFont = { id: string; filename: string; bytes: Uint8Array; info: PdfFontInfo };
const sessionFonts = new Map<string, SessionFont>();

export function getSessionFonts() { return [...sessionFonts.values()]; }
export function rememberFont(font: SessionFont) {
  if (font.bytes.length > MAX_FONT_BYTES) throw new Error('Kies een lettertypebestand van maximaal 20 MB.');
  sessionFonts.delete(font.id);
  while (sessionFonts.size >= 8 || [...sessionFonts.values()].reduce((total, item) => total + item.bytes.length, font.bytes.length) > MAX_SESSION_BYTES) {
    sessionFonts.delete(sessionFonts.keys().next().value!);
  }
  sessionFonts.set(font.id, font);
  return getSessionFonts();
}
type FontNames = Pick<PdfFontInfo, 'postscriptName' | 'fullName' | 'family' | 'style'>;
export function fontMatchScore(info: FontNames, original: string) {
  const normalize = (name: string) => name.replace(/^[A-Z]{6}\+/, '').replace(/-\d{4,}$/, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  const target = normalize(original);
  if (!target) return 0;
  if (normalize(info.postscriptName) === target) return 3;
  if (normalize(info.fullName) === target) return 2;
  return /^(regular|normal|roman|book)$/i.test(info.style) && normalize(info.family) === target ? 1 : 0;
}
export const fontNameMatches = (info: FontNames, original: string) => fontMatchScore(info, original) > 0;
