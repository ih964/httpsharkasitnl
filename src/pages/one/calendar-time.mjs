// Calendar wall times are always Europe/Amsterdam, independent of the handset timezone.
export const ZONE = 'Europe/Amsterdam';
const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export function wallTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Ongeldige datum.');
  const p = Object.fromEntries(formatter.formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function addDays(day, count) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Ongeldige datum.');
  const d = new Date(day + 'T12:00:00Z');
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== day) throw new Error('Ongeldige datum.');
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
}
export function toInstant(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Vul datum en tijd volledig in.');
  const [y, m, d, h, min] = value.match(/\d+/g).map(Number);
  if (y < 2000 || y > 2100 || h > 23 || min > 59) throw new Error('Kies een geldige datum en tijd tussen 2000 en 2100.');
  addDays(value.slice(0, 10), 0);
  const nominal = Date.UTC(y, m - 1, d, h, min);
  const matches = new Set();
  for (const hours of [-36, -12, 0, 12, 36]) {
    const sample = nominal + hours * 3600000;
    const wall = wallTime(sample);
    const parts = wall.match(/\d+/g).map(Number);
    const offset = Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4]) - sample;
    const candidate = nominal - offset;
    if (wallTime(candidate) === value) matches.add(candidate);
  }
  if (!matches.size) throw new Error('Dit tijdstip bestaat niet door de overgang naar zomertijd. Kies een ander tijdstip.');
  if (matches.size > 1) throw new Error('Dit tijdstip komt twee keer voor door de overgang naar wintertijd. Kies een tijdstip buiten dat dubbele uur.');
  return new Date([...matches][0]).toISOString();
}
export function monthGrid(month) {
  const first = month + '-01';
  const weekday = new Date(first + 'T12:00:00Z').getUTCDay();
  const start = addDays(first, -((weekday + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
export function shiftMonth(month, amount) {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m - 1 + amount, 1)).toISOString().slice(0, 7);
}
export function eventValues(draft) {
  const title = String(draft.title || '').trim();
  if (!title || title.length > 200) throw new Error('Vul een titel van maximaal 200 tekens in.');
  if (!['private', 'business'].includes(draft.kind)) throw new Error('Kies privé of zakelijk.');
  const starts_at = toInstant(`${draft.startDate}T${draft.allDay ? '00:00' : draft.startTime}`);
  const ends_at = toInstant(`${draft.allDay ? addDays(draft.endDate, 1) : draft.endDate}T${draft.allDay ? '00:00' : draft.endTime}`);
  if (new Date(ends_at) <= new Date(starts_at)) throw new Error('De eindtijd moet na de begintijd liggen.');
  const reminder_minutes = draft.reminder === '' ? null : Number(draft.reminder);
  const choices = draft.allDay ? [0, 1440] : [0, 5, 15, 30, 60, 1440];
  if (reminder_minutes !== null && !choices.includes(reminder_minutes)) throw new Error('Kies een geldige herinnering.');
  const location = String(draft.location || '').trim(), notes = String(draft.notes || '').trim();
  if (location.length > 300 || notes.length > 4000) throw new Error('Locatie of notities zijn te lang.');
  return { title, kind: draft.kind, starts_at, ends_at, all_day: Boolean(draft.allDay), location, notes, reminder_minutes };
}
