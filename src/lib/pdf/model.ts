export type Point = { x: number; y: number };
export type Mark = {
  id: string;
  kind: 'text' | 'highlight' | 'rectangle' | 'draw' | 'image';
  x: number; y: number; width: number; height: number;
  color: string; size: number;
  text?: string; points?: Point[]; image?: string;
};
export type EditorPage = {
  id: string; sourceId: string; index: number;
  width: number; height: number; baseRotation: number; rotation: number;
  // PDF.js maps original PDF coordinates to the displayed, unscaled page.
  transform: number[];
  marks: Mark[];
};
export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_PAGES = 250;
export const uid = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
export const normalizeRotation = (n: number) => ((n % 360) + 360) % 360;
export const pdfFilename = (name: string) => (name.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\.pdf$/i, '').slice(0, 220) || 'Document') + '.pdf';

/** Maps visible bottom-left coordinates back into the original PDF coordinate system. */
export function overlayTransform(transform: number[], height: number): [number, number, number, number, number, number] {
  const [a, b, c, d, e, f] = transform;
  const det = a * d - b * c;
  if (!Number.isFinite(det) || det === 0) throw new Error('Ongeldige paginageometrie.');
  return [d / det, -b / det, c / det, -a / det,
    (c * f - d * e - c * height) / det, (b * e - a * f + a * height) / det];
}

export function movePage(pages: EditorPage[], id: string, direction: -1 | 1) {
  const index = pages.findIndex(p => p.id === id), target = index + direction;
  if (index < 0 || target < 0 || target >= pages.length) return pages;
  const next = [...pages];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
