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
export function fontNameMatches(info: PdfFontInfo, original: string) {
  const normalize = (name: string) => name.replace(/^[A-Z]{6}\+/, '').replace(/-\d{4,}$/, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const names = [info.postscriptName, info.fullName];
  if (/^(regular|normal|roman|book)$/i.test(info.style)) names.push(info.family);
  return names.some(name => normalize(name) === normalize(original));
}
