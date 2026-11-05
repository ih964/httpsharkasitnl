import { fontMatchScore, fontNameMatches, MAX_FONT_BYTES, type PdfFontInfo } from './font-session';

type LocalFace = Pick<PdfFontInfo, 'family' | 'fullName' | 'postscriptName' | 'style'> & { blob(): Promise<Blob> };
type Platform = { supported(): boolean; permission(): Promise<PermissionState>; query(): Promise<LocalFace[]> };

/** Only metadata is enumerated. Font bytes are read lazily for one matching face. */
export function createLocalFontAccess(platform: Platform) {
  let faces: LocalFace[] | undefined;
  const allowed = async () => {
    if (await platform.permission() === 'granted') return true;
    faces = undefined; return false;
  };
  return {
    supported: platform.supported,
    async activate(prompt: boolean) {
      if (!platform.supported()) return false;
      if (!prompt && !await allowed()) return false;
      // Prompting calls query immediately from the button click to retain user activation.
      faces = undefined;
      faces = await platform.query();
      return true;
    },
    async resolve(original: string, inspect: (bytes: Uint8Array) => Promise<PdfFontInfo>) {
      if (!faces || !await allowed() || !faces) return null;
      const ranked = faces.map(face => ({ face, score: fontMatchScore(face, original) })).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
      if (!ranked.length) return null;
      if (ranked.length > 1 && ranked[0].score === ranked[1].score) throw new Error(`Er zijn meerdere varianten van ${original} gevonden. Laad het juiste TTF/OTF-bestand om de variant te kiezen.`);
      const blob = await ranked[0].face.blob();
      if (!blob.size || blob.size > MAX_FONT_BYTES) throw new Error('Het geïnstalleerde lettertype is leeg of groter dan 20 MB. Laad een passend TTF/OTF-bestand.');
      const bytes = new Uint8Array(await blob.arrayBuffer()), info = await inspect(bytes);
      if (!await allowed()) throw new Error('Toegang tot de lettertypen is ingetrokken. Geef opnieuw toestemming of laad een TTF/OTF-bestand.');
      if (!fontNameMatches(info, original)) throw new Error('Het gevonden fontbestand komt niet overeen met het oorspronkelijke lettertype. Kies het juiste TTF/OTF-bestand.');
      return { bytes, info, filename: `${info.postscriptName}.${info.format.toLowerCase()}` };
    },
  };
}

type FontWindow = Window & { queryLocalFonts?: () => Promise<LocalFace[]> };
export const localFonts = createLocalFontAccess({
  supported: () => typeof window !== 'undefined' && window.isSecureContext && typeof (window as FontWindow).queryLocalFonts === 'function',
  permission: async () => {
    try { return (await navigator.permissions.query({ name: 'local-fonts' as PermissionName })).state; }
    catch { return 'prompt'; }
  },
  query: () => (window as FontWindow).queryLocalFonts!(),
});

export function localFontError(error: unknown) {
  if (error instanceof Error && error.name === 'NotAllowedError') return 'Geen toegang tot de lettertypen gekregen. Sta lettertypetoegang toe via de browserinstellingen voor deze website, of laad een TTF/OTF-bestand.';
  if (error instanceof Error && error.name === 'SecurityError') return 'Je browser staat automatisch ophalen nu niet toe. Klik opnieuw op de knop of laad een TTF/OTF-bestand.';
  return error instanceof Error ? error.message : 'Het lettertype kon niet van de computer worden opgehaald.';
}
