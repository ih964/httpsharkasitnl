export const STORAGE_KEY = 'harkas-verhuisregie-v1';
export const DEFAULT_RATES = Object.freeze({ company: 'Rivier Verhuizingen', hourly: 52.5, truck: 27.5, km: 1.1, packing: 7.5, assembly: 95, lift: 185 });
export const ITEMS = Object.freeze([
  { id: 'sofa', name: 'Bank', room: 'Woonkamer', m3: 2.5, icon: 'sofa' },
  { id: 'corner-sofa', name: 'Hoekbank', room: 'Woonkamer', m3: 4, icon: 'sofa' },
  { id: 'armchair', name: 'Fauteuil', room: 'Woonkamer', m3: 0.8, icon: 'chair' },
  { id: 'table', name: 'Eettafel', room: 'Woonkamer', m3: 1.2, icon: 'table' },
  { id: 'chair', name: 'Stoel', room: 'Woonkamer', m3: 0.3, icon: 'chair' },
  { id: 'coffee-table', name: 'Salontafel', room: 'Woonkamer', m3: 0.4, icon: 'table' },
  { id: 'cabinet', name: 'Kast', room: 'Woonkamer', m3: 1.5, icon: 'cabinet' },
  { id: 'bookcase', name: 'Boekenkast', room: 'Woonkamer', m3: 1, icon: 'cabinet' },
  { id: 'tv-unit', name: 'Tv-meubel', room: 'Woonkamer', m3: 0.6, icon: 'cabinet' },
  { id: 'television', name: 'Televisie', room: 'Woonkamer', m3: 0.25, icon: 'box' },
  { id: 'lamp', name: 'Staande lamp', room: 'Woonkamer', m3: 0.2, icon: 'box' },
  { id: 'rug', name: 'Vloerkleed (opgerold)', room: 'Woonkamer', m3: 0.2, icon: 'box' },
  { id: 'bed', name: 'Tweepersoonsbed', room: 'Slaapkamer', m3: 2, icon: 'bed' },
  { id: 'single-bed', name: 'Eenpersoonsbed', room: 'Slaapkamer', m3: 1.2, icon: 'bed' },
  { id: 'bunk-bed', name: 'Stapelbed', room: 'Slaapkamer', m3: 2, icon: 'bed' },
  { id: 'cot', name: 'Kinderbed / ledikant', room: 'Slaapkamer', m3: 0.7, icon: 'bed' },
  { id: 'mattress', name: 'Los matras', room: 'Slaapkamer', m3: 0.5, icon: 'bed' },
  { id: 'wardrobe', name: 'Kledingkast', room: 'Slaapkamer', m3: 2, icon: 'cabinet' },
  { id: 'dresser', name: 'Ladekast / commode', room: 'Slaapkamer', m3: 0.8, icon: 'cabinet' },
  { id: 'nightstand', name: 'Nachtkastje', room: 'Slaapkamer', m3: 0.2, icon: 'cabinet' },
  { id: 'mirror', name: 'Spiegel', room: 'Slaapkamer', m3: 0.15, icon: 'box' },
  { id: 'fridge', name: 'Koelkast', room: 'Keuken & bijkeuken', m3: 0.8, icon: 'washer' },
  { id: 'freezer', name: 'Vriezer', room: 'Keuken & bijkeuken', m3: 0.7, icon: 'washer' },
  { id: 'dishwasher', name: 'Vaatwasser', room: 'Keuken & bijkeuken', m3: 0.4, icon: 'washer' },
  { id: 'oven', name: 'Fornuis / oven', room: 'Keuken & bijkeuken', m3: 0.5, icon: 'washer' },
  { id: 'microwave', name: 'Magnetron', room: 'Keuken & bijkeuken', m3: 0.1, icon: 'box' },
  { id: 'washer', name: 'Wasmachine', room: 'Keuken & bijkeuken', m3: 0.5, icon: 'washer' },
  { id: 'dryer', name: 'Wasdroger', room: 'Keuken & bijkeuken', m3: 0.5, icon: 'washer' },
  { id: 'rack', name: 'Stellingkast', room: 'Keuken & bijkeuken', m3: 0.8, icon: 'cabinet' },
  { id: 'desk', name: 'Bureau', room: 'Werkkamer', m3: 0.8, icon: 'table' },
  { id: 'office-chair', name: 'Bureaustoel', room: 'Werkkamer', m3: 0.4, icon: 'chair' },
  { id: 'computer', name: 'Computer met scherm', room: 'Werkkamer', m3: 0.2, icon: 'box' },
  { id: 'printer', name: 'Printer', room: 'Werkkamer', m3: 0.15, icon: 'box' },
  { id: 'filing-cabinet', name: 'Archiefkast', room: 'Werkkamer', m3: 0.8, icon: 'cabinet' },
  { id: 'bike', name: 'Fiets', room: 'Tuin & berging', m3: 0.5, icon: 'bike' },
  { id: 'ebike', name: 'Elektrische fiets', room: 'Tuin & berging', m3: 0.6, icon: 'bike' },
  { id: 'garden-table', name: 'Tuintafel', room: 'Tuin & berging', m3: 1, icon: 'table' },
  { id: 'garden-chair', name: 'Tuinstoel', room: 'Tuin & berging', m3: 0.3, icon: 'chair' },
  { id: 'lounge', name: 'Loungeset', room: 'Tuin & berging', m3: 3, icon: 'sofa' },
  { id: 'bbq', name: 'Barbecue', room: 'Tuin & berging', m3: 0.6, icon: 'box' },
  { id: 'mower', name: 'Grasmaaier', room: 'Tuin & berging', m3: 0.4, icon: 'box' },
  { id: 'workbench', name: 'Werkbank', room: 'Tuin & berging', m3: 1, icon: 'table' },
  { id: 'ladder', name: 'Ladder', room: 'Tuin & berging', m3: 0.3, icon: 'box' },
  { id: 'plant', name: 'Grote plant in pot', room: 'Tuin & berging', m3: 0.3, icon: 'box' },
  { id: 'box', name: 'Verhuisdoos', room: 'Overig', m3: 0.1, icon: 'box' },
  { id: 'suitcase', name: 'Koffer', room: 'Overig', m3: 0.15, icon: 'box' },
  { id: 'storage-bin', name: 'Opbergbox / krat', room: 'Overig', m3: 0.1, icon: 'box' },
  { id: 'stroller', name: 'Kinderwagen', room: 'Overig', m3: 0.4, icon: 'box' },
  { id: 'painting', name: 'Schilderij', room: 'Overig', m3: 0.1, icon: 'box' },
  { id: 'fitness', name: 'Fitnessapparaat', room: 'Overig', m3: 1.5, icon: 'box', special: true },
  { id: 'piano', name: 'Piano', room: 'Overig', m3: 1.5, icon: 'box', special: true },
  { id: 'safe', name: 'Kluis', room: 'Overig', m3: 0.5, icon: 'box', special: true },
]);
export const STATUS = { nieuw: 'Nieuw', concept: 'Concept', offerte: 'Offerte klaar', akkoord: 'Akkoord', afgewezen: 'Afgewezen' };
export function euro(value) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value); }
export function round(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }
export function dateAfter(days) { const d = new Date(); d.setDate(d.getDate() + days); return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam' }).format(d); }
const quantity = (value) => Math.max(0, Math.min(100, Math.floor(Number(value) || 0)));
export function customItemVolume(item) {
  const dimensions = [item.length, item.width, item.height].map(Number);
  if (!dimensions.every(n => Number.isFinite(n) && n > 0 && n <= 2000)) return 0;
  return Math.max(.01, round(dimensions.reduce((a, b) => a * b, 1) / 1000000));
}
export function unknownItems(request) {
  return (request.customItems || []).filter(item => quantity(item.quantity) && !customItemVolume(item));
}
export function validateCustomItem(item) {
  if (!item.name?.trim() || item.name.trim().length > 80) return 'Vul een omschrijving van maximaal 80 tekens in.';
  if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 100) return 'Kies een aantal van 1 tot en met 100.';
  const dims = [item.length, item.width, item.height];
  const filled = dims.filter(n => n !== '' && n != null);
  if (filled.length && (filled.length !== 3 || dims.some(n => !Number.isFinite(Number(n)) || Number(n) <= 0 || Number(n) > 2000))) return 'Vul alle drie de afmetingen in (1–2.000 cm), of laat ze alle drie leeg.';
  return '';
}
export function volume(items = {}, customItems = []) {
  return round(ITEMS.reduce((n, item) => n + item.m3 * quantity(items[item.id]), 0) + customItems.reduce((n, item) => n + customItemVolume(item) * quantity(item.quantity), 0));
}
export function inventoryCount(request) {
  return ITEMS.reduce((n, item) => n + quantity(request.items?.[item.id]), 0) + (request.customItems || []).reduce((n, item) => n + quantity(item.quantity), 0);
}
export function specialItems(request) {
  return ITEMS.filter(item => item.special && quantity(request.items?.[item.id])).map(item => item.name).concat((request.customItems || []).filter(item => item.special).map(item => item.name));
}
export function newDraft() { return { from: '', to: '', fromType: 'Appartement', toType: 'Woning', fromFloor: '0', toFloor: '0', fromElevator: false, toElevator: false, date: '', flexible: false, items: {}, customItems: [], extras: { packing: false, assembly: false, lift: false }, photos: [], notes: '', name: '', email: '', phone: '' }; }
export function validateRequest(d, step = 0) {
  if (step === 0 && (!d.from?.trim() || !d.to?.trim() || !d.date)) return 'Vul beide adressen en een gewenste verhuisdatum in.';
  if (step === 0 && d.date < dateAfter(0)) return 'Kies een verhuisdatum vanaf vandaag.';
  if (step === 1 && inventoryCount(d) <= 0) return 'Voeg minimaal één voorwerp of verhuisdoos toe.';
  if (step === 1 && (d.customItems || []).some(item => validateCustomItem(item))) return 'Controleer de omschrijving, aantallen en afmetingen van je eigen voorwerpen.';
  if (step === 3 && (!d.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '') || !/^[+\d ()-]{8,20}$/.test(d.phone || ''))) return 'Vul een naam, geldig e-mailadres en telefoonnummer in.';
  return '';
}
export function calculate(request, rates = DEFAULT_RATES, input = {}) {
  const extraM3 = input.extraM3 ?? 0;
  if (!Number.isFinite(extraM3) || extraM3 < 0 || extraM3 > 1000) throw new Error('Vul een aanvullende inhoud tussen 0 en 1.000 m³ in.');
  const m3 = round(volume(request.items, request.customItems) + extraM3);
  const incomplete = unknownItems(request).length > 0 && extraM3 <= 0;
  const floors = (request.fromElevator ? 0 : Number(request.fromFloor) || 0) + (request.toElevator ? 0 : Number(request.toFloor) || 0);
  const hours = input.hours ?? Math.max(2, Math.ceil((1.5 + m3 / 6 + floors * .3) * 2) / 2);
  const movers = input.movers ?? 2;
  const km = input.km ?? 30;
  if (![hours, movers, km].every(Number.isFinite) || hours < .5 || hours > 48 || movers < 1 || movers > 10 || !Number.isInteger(movers) || km < 0 || km > 2000) throw new Error('Controleer uren (0,5–48), verhuizers (1–10) en afstand (0–2.000 km).');
  for (const key of ['hourly', 'truck', 'km', 'packing', 'assembly', 'lift']) if (!Number.isFinite(rates[key]) || rates[key] < 0 || rates[key] > 1000) throw new Error('Tarieven moeten tussen €0 en €1.000 liggen.');
  const lines = [{ name: `${movers} verhuizers × ${hours} uur`, amount: round(movers * hours * rates.hourly) }, { name: `Verhuiswagen · ${hours} uur`, amount: round(hours * rates.truck) }, { name: `Transport · ${km} km`, amount: round(km * rates.km) }];
  if (request.extras?.packing) lines.push({ name: `Inpakservice · ${m3} m³`, amount: round(m3 * rates.packing) });
  if (request.extras?.assembly) lines.push({ name: 'Meubels demonteren en monteren', amount: rates.assembly });
  if (request.extras?.lift) lines.push({ name: 'Verhuislift · dagdeel', amount: rates.lift });
  const subtotal = round(lines.reduce((sum, item) => sum + item.amount, 0));
  const vat = round(subtotal * .21);
  return { m3, extraM3, incomplete, hours, movers, km, lines, subtotal, vat, total: round(subtotal + vat) };
}
export function makeQuote(request, rates, input, { allowIncomplete = false } = {}) {
  const calculation = calculate(request, rates, input);
  if (calculation.incomplete && !allowIncomplete) throw new Error('Vul eerst de aanvullende inhoud in voor de voorwerpen zonder afmetingen. Controleer daarna ook de benodigde uren en verhuizers.');
  return { ...calculation, company: rates.company, created: new Date().toISOString(), validUntil: dateAfter(14), version: (request.quote?.version || 0) + 1, request: JSON.parse(JSON.stringify({ ...request, photos: undefined, quote: undefined, history: undefined })), acceptedBy: null, acceptedAt: null };
}
export function seedRequests() {
  const seed = (id, name, from, to, days, items, status) => ({ ...newDraft(), id, name, from, to, email: 'demo@example.invalid', phone: '0600000000', date: dateAfter(days), items, status, created: new Date().toISOString(), history: [{ label: 'Voorbeeldaanvraag aangemaakt', at: new Date().toISOString() }], plannerNote: '' });
  const a = seed('VR-1001', 'Sam de Vries', 'Voorbeeldstraat 12, Utrecht', 'Demolaan 8, Amersfoort', 12, { sofa: 1, table: 1, chair: 4, bed: 1, wardrobe: 1, washer: 1, box: 35 }, 'nieuw');
  a.fromFloor = '2'; a.extras.assembly = true; a.notes = 'Graag even overleggen over parkeren voor de deur.';
  const b = seed('VR-1002', 'Robin Bakker', 'Parklaan 4, Tiel', 'Havenstraat 22, Nijmegen', 18, { sofa: 1, bed: 2, cabinet: 2, table: 1, chair: 6, box: 55, bike: 2 }, 'offerte');
  b.extras.packing = true; b.quote = makeQuote(b, DEFAULT_RATES, { km: 42 });
  const c = seed('VR-1003', 'Noor Jansen', 'Dorpsstraat 31, Culemborg', 'Voorbeeldweg 10, Geldermalsen', 25, { bed: 1, desk: 1, chair: 2, box: 22, washer: 1 }, 'akkoord');
  c.quote = makeQuote(c, DEFAULT_RATES, { km: 19 }); c.quote.acceptedBy = c.name; c.quote.acceptedAt = new Date().toISOString();
  return [a, b, c];
}
export function initialState() { return { version: 1, rates: { ...DEFAULT_RATES }, requests: seedRequests(), draft: newDraft() }; }
export function loadState(storage) {
  try { const raw = storage.getItem(STORAGE_KEY); if (!raw) return initialState(); const s = JSON.parse(raw); if (s.version !== 1 || !Array.isArray(s.requests) || !s.rates || !s.draft) throw new Error(); s.draft.customItems ||= []; for (const r of s.requests) r.customItems ||= []; return s; } catch { return initialState(); }
}
export function saveState(storage, state) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
