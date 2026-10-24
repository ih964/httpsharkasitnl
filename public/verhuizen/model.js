export const STORAGE_KEY = 'harkas-verhuisregie-v1';
export const DEFAULT_RATES = Object.freeze({ company: 'Rivier Verhuizingen', hourly: 52.5, truck: 27.5, km: 1.1, packing: 7.5, assembly: 95, lift: 185 });
export const ITEMS = Object.freeze([
  { id: 'sofa', name: 'Bank', room: 'Woonkamer', m3: 2.5, icon: 'sofa' },
  { id: 'table', name: 'Eettafel', room: 'Woonkamer', m3: 1.2, icon: 'table' },
  { id: 'chair', name: 'Stoel', room: 'Woonkamer', m3: .3, icon: 'chair' },
  { id: 'cabinet', name: 'Kast', room: 'Woonkamer', m3: 1.5, icon: 'cabinet' },
  { id: 'bed', name: 'Tweepersoonsbed', room: 'Slaapkamer', m3: 2, icon: 'bed' },
  { id: 'wardrobe', name: 'Kledingkast', room: 'Slaapkamer', m3: 2, icon: 'cabinet' },
  { id: 'desk', name: 'Bureau', room: 'Slaapkamer', m3: .8, icon: 'table' },
  { id: 'washer', name: 'Wasmachine', room: 'Overig', m3: .5, icon: 'washer' },
  { id: 'bike', name: 'Fiets', room: 'Overig', m3: .5, icon: 'bike' },
  { id: 'box', name: 'Verhuisdoos', room: 'Overig', m3: .1, icon: 'box' },
]);
export const STATUS = { nieuw: 'Nieuw', concept: 'Concept', offerte: 'Offerte klaar', akkoord: 'Akkoord', afgewezen: 'Afgewezen' };
export function euro(value) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value); }
export function round(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }
export function dateAfter(days) { const d = new Date(); d.setDate(d.getDate() + days); return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam' }).format(d); }
export function volume(items = {}) { return round(ITEMS.reduce((n, item) => n + item.m3 * Math.max(0, Math.min(100, Number(items[item.id]) || 0)), 0)); }
export function newDraft() { return { from: '', to: '', fromType: 'Appartement', toType: 'Woning', fromFloor: '0', toFloor: '0', fromElevator: false, toElevator: false, date: '', flexible: false, items: {}, extras: { packing: false, assembly: false, lift: false }, photos: [], notes: '', name: '', email: '', phone: '' }; }
export function validateRequest(d, step = 0) {
  if (step === 0 && (!d.from?.trim() || !d.to?.trim() || !d.date)) return 'Vul beide adressen en een gewenste verhuisdatum in.';
  if (step === 0 && d.date < dateAfter(0)) return 'Kies een verhuisdatum vanaf vandaag.';
  if (step === 1 && volume(d.items) <= 0) return 'Voeg minimaal één meubel of verhuisdoos toe.';
  if (step === 3 && (!d.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || '') || !/^[+\d ()-]{8,20}$/.test(d.phone || ''))) return 'Vul een naam, geldig e-mailadres en telefoonnummer in.';
  return '';
}
export function calculate(request, rates = DEFAULT_RATES, input = {}) {
  const m3 = volume(request.items);
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
  return { m3, hours, movers, km, lines, subtotal, vat, total: round(subtotal + vat) };
}
export function makeQuote(request, rates, input) {
  return { ...calculate(request, rates, input), company: rates.company, created: new Date().toISOString(), validUntil: dateAfter(14), version: (request.quote?.version || 0) + 1, request: JSON.parse(JSON.stringify({ ...request, photos: undefined, quote: undefined, history: undefined })), acceptedBy: null, acceptedAt: null };
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
  try { const raw = storage.getItem(STORAGE_KEY); if (!raw) return initialState(); const s = JSON.parse(raw); if (s.version !== 1 || !Array.isArray(s.requests) || !s.rates || !s.draft) throw new Error(); return s; } catch { return initialState(); }
}
export function saveState(storage, state) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
