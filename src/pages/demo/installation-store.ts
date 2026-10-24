import { useEffect, useState } from "react";

export type LeadStatus = "Nieuw" | "In behandeling" | "Offerte verstuurd" | "Gewonnen" | "Afgesloten";
export const statusLabels: LeadStatus[] = ["Nieuw", "In behandeling", "Offerte verstuurd", "Gewonnen", "Afgesloten"];
export interface DemoPhoto { id: string; name: string; dataUrl: string }
export interface DemoEntry { id: string; text: string; at: string }
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  postcode: string;
  service: string;
  description: string;
  preference: string;
  createdAt: string;
  status: LeadStatus;
  followUp: string;
  notes: DemoEntry[];
  activity: DemoEntry[];
  photos: DemoPhoto[];
}
export type NewLeadInput = Pick<Lead, "name" | "email" | "phone" | "postcode" | "service" | "description" | "preference"> & { photos?: DemoPhoto[] };

export const DEMO_STORAGE_KEY = "harkas:installation-demo:v1";
export const MAX_DEMO_PHOTOS = 3;
export const MAX_DEMO_PHOTO_BYTES = 750 * 1024;
const CHANGE_EVENT = "harkas-installation-demo-change";
const VERSION = 1;

function uid() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function relativeDate(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return localDate(date); }
function relativeTime(days: number, hour: number) { const date = new Date(); date.setDate(date.getDate() + days); date.setHours(hour, 20, 0, 0); return date.toISOString(); }
function entry(text: string, at = new Date().toISOString()): DemoEntry { return { id: uid(), text, at }; }

export function createSeedLeads(): Lead[] {
  const examples: Array<{ name: string; email: string; service: string; description: string; status: LeadStatus; days: number; hour: number; followUp: string; postcode: string; preference: string }> = [
    { name: "Lisa Voorbeeld", email: "lisa@demo.example", service: "Verwarming", description: "Onze cv-ketel is toe aan vervanging. Graag advies over een energiezuinige oplossing voor een tussenwoning.", status: "Nieuw", days: 0, hour: 9, followUp: relativeDate(0), postcode: "4001 AB", preference: "Binnen 2 weken" },
    { name: "Mark Voorbeeld", email: "mark@demo.example", service: "Elektra", description: "Wij willen de groepenkast uitbreiden voor een inductiekookplaat en een laadpunt. Er zijn nu zes groepen.", status: "In behandeling", days: -1, hour: 14, followUp: relativeDate(-1), postcode: "4101 CD", preference: "Binnen 1 maand" },
    { name: "Noor Voorbeeld", email: "noor@demo.example", service: "Ventilatie", description: "De mechanische ventilatie maakt veel geluid. Graag een voorstel voor vervanging en reiniging van de kanalen.", status: "Offerte verstuurd", days: -3, hour: 11, followUp: relativeDate(0), postcode: "4191 EF", preference: "In overleg" },
    { name: "Sam Voorbeeld", email: "sam@demo.example", service: "Verwarming", description: "Jaarlijks onderhoud van de cv-installatie en controle van twee radiatorkranen. De afspraak is bevestigd.", status: "Gewonnen", days: -4, hour: 10, followUp: "", postcode: "4003 GH", preference: "Binnen 2 weken" },
    { name: "Eva Voorbeeld", email: "eva@demo.example", service: "Elektra", description: "Vier extra stopcontacten en verlichting in de nieuwe aanbouw. De verbouwing begint volgende maand.", status: "Nieuw", days: -1, hour: 16, followUp: relativeDate(1), postcode: "4191 JK", preference: "Binnen 1 maand" },
    { name: "Ruben Voorbeeld", email: "ruben@demo.example", service: "Ventilatie", description: "Advies over ventilatie in een kleine werkruimte. De klant heeft gekozen de verbouwing uit te stellen.", status: "Afgesloten", days: -7, hour: 13, followUp: "", postcode: "4102 LM", preference: "In overleg" },
  ];
  return examples.map((item, index) => {
    const { days, hour, ...fields } = item;
    const createdAt = relativeTime(days, hour);
    return {
      ...fields, id: `VD-${new Date().getFullYear()}-${String(1042 - index).padStart(4, "0")}`,
      phone: "06 0000 0000", createdAt, photos: [],
      notes: index === 1 ? [entry("Voorbeeldnotitie: vraag bij de intake om een foto van de huidige groepenkast.", relativeTime(-1, 15))] : [],
      activity: [entry("Demoaanvraag aangemaakt", createdAt), ...(item.status !== "Nieuw" ? [entry(`Status gewijzigd naar ${item.status}`, relativeTime(Math.min(days + 1, 0), hour))] : [])],
    };
  });
}

function validatePhotos(photos: DemoPhoto[]) {
  if (!Array.isArray(photos) || photos.length > MAX_DEMO_PHOTOS) throw new Error("Voeg maximaal 3 foto's toe.");
  let bytes = 0;
  for (const photo of photos) {
    if (typeof photo?.id !== "string" || typeof photo.name !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo.dataUrl)) {
      throw new Error("Gebruik alleen geldige JPG-, PNG- of WebP-foto's.");
    }
    bytes += (photo.dataUrl.length - photo.dataUrl.indexOf(",") - 1) * 0.75;
  }
  if (bytes > MAX_DEMO_PHOTO_BYTES) throw new Error("De foto's zijn samen te groot. Gebruik maximaal 750 KB aan verkleinde foto's.");
}

function isEntry(value: unknown): value is DemoEntry {
  const item = value as DemoEntry;
  return !!item && typeof item.id === "string" && typeof item.text === "string" && typeof item.at === "string" && Number.isFinite(Date.parse(item.at));
}
function validateLead(value: unknown): asserts value is Lead {
  const lead = value as Lead;
  const fields: Array<keyof Lead> = ["id", "name", "email", "phone", "postcode", "service", "description", "preference", "createdAt", "followUp"];
  if (!lead || fields.some(field => typeof lead[field] !== "string") || !statusLabels.includes(lead.status) || !Number.isFinite(Date.parse(lead.createdAt)) || (lead.followUp && !/^\d{4}-\d{2}-\d{2}$/.test(lead.followUp)) || !Array.isArray(lead.notes) || !lead.notes.every(isEntry) || !Array.isArray(lead.activity) || !lead.activity.every(isEntry)) {
    throw new Error("De opgeslagen demogegevens zijn ongeldig. Herstel de demo om opnieuw te beginnen.");
  }
  validatePhotos(lead.photos);
}

export function loadDemoLeads(): Lead[] {
  if (typeof window === "undefined") return createSeedLeads();
  let raw: string | null;
  try { raw = window.localStorage.getItem(DEMO_STORAGE_KEY); }
  catch { throw new Error("Deze browser blokkeert lokale opslag. Sta lokale opslag toe om de demo te gebruiken."); }
  if (raw === null) return createSeedLeads();
  try {
    const saved = JSON.parse(raw);
    if (saved.version !== VERSION || !Array.isArray(saved.leads)) throw new Error();
    saved.leads.forEach(validateLead);
    return saved.leads;
  } catch { throw new Error("De opgeslagen demogegevens kunnen niet worden gelezen. Gebruik 'Demo herstellen' om opnieuw te beginnen."); }
}

export function saveDemoLeads(leads: Lead[]) {
  leads.forEach(validateLead);
  if (typeof window === "undefined") throw new Error("Open de demo in een browser om wijzigingen op te slaan.");
  try { window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: VERSION, leads })); }
  catch (error) {
    if (error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
      throw new Error("De lokale opslag is vol. Verwijder foto's of herstel de demo. Je wijziging is niet opgeslagen.");
    }
    throw new Error("Opslaan in deze browser is niet mogelijk. Controleer je privacy-instellingen. Je wijziging is niet opgeslagen.");
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function resetDemoLeads(): Lead[] {
  const leads = createSeedLeads();
  saveDemoLeads(leads);
  return leads;
}

export function isFollowUpDue(lead: Lead) {
  return !!lead.followUp && lead.followUp <= localDate() && lead.status !== "Gewonnen" && lead.status !== "Afgesloten";
}

export function useDemoLeads() {
  const [initial] = useState(() => {
    try { return { leads: loadDemoLeads(), error: "" }; }
    catch (error) { return { leads: createSeedLeads(), error: error instanceof Error ? error.message : "Demogegevens kunnen niet worden gelezen." }; }
  });
  const [leads, setLeads] = useState<Lead[]>(initial.leads);
  const [storageError, setStorageError] = useState(initial.error);

  useEffect(() => {
    const sync = () => {
      try { setLeads(loadDemoLeads()); setStorageError(""); }
      catch (error) { setStorageError(error instanceof Error ? error.message : "De demo kan niet worden bijgewerkt."); }
    };
    const onStorage = (event: StorageEvent) => { if (event.key === DEMO_STORAGE_KEY || event.key === null) sync(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(CHANGE_EVENT, sync); };
  }, []);

  function persist(next: Lead[]) { saveDemoLeads(next); setLeads(next); setStorageError(""); }

  function addLead(input: NewLeadInput): Lead {
    const name = input.name.trim();
    const email = input.email.trim();
    const phone = input.phone.trim();
    const postcode = input.postcode.trim().toUpperCase();
    const description = input.description.trim();
    if (!name || name.length > 120) throw new Error("Vul een naam in van maximaal 120 tekens.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Vul een geldig e-mailadres in.");
    if (!/^[+\d\s().-]{8,30}$/.test(phone)) throw new Error("Vul een geldig telefoonnummer in.");
    if (!/^[1-9][0-9]{3}\s?[A-Z]{2}$/.test(postcode)) throw new Error("Vul een geldige Nederlandse postcode in.");
    if (!input.service.trim()) throw new Error("Kies een dienst.");
    if (description.length < 10 || description.length > 3000) throw new Error("Beschrijf de klus in 10 tot 3000 tekens.");
    const photos = input.photos ?? [];
    validatePhotos(photos);
    const now = new Date();
    const createdAt = now.toISOString();
    const lead: Lead = {
      id: `VD-${localDate(now).replace(/-/g, "")}-${uid().slice(0, 6).toUpperCase()}`,
      name, email, phone, postcode, service: input.service.trim(), description,
      preference: input.preference.trim() || "In overleg", createdAt, status: "Nieuw", followUp: localDate(now),
      photos, notes: [], activity: [entry("Demoaanvraag ontvangen", createdAt), entry("Ontvangstbevestiging gesimuleerd — er is geen e-mail verstuurd", createdAt)],
    };
    persist([lead, ...loadDemoLeads()]);
    return lead;
  }

  function updateLead(id: string, patch: Partial<Lead>) {
    const current = loadDemoLeads();
    if (!current.some(lead => lead.id === id)) throw new Error("Deze demoaanvraag bestaat niet meer. Vernieuw het overzicht.");
    const now = new Date().toISOString();
    const next = current.map(lead => {
      if (lead.id !== id) return lead;
      const activity = [...lead.activity];
      if (patch.status !== undefined && patch.status !== lead.status) activity.push(entry(`Status gewijzigd naar ${patch.status}`, now));
      if (patch.followUp !== undefined && patch.followUp !== lead.followUp) activity.push(entry(patch.followUp ? `Opvolging gepland op ${patch.followUp}` : "Opvolging afgerond", now));
      return { ...lead, ...patch, id: lead.id, createdAt: lead.createdAt, activity };
    });
    persist(next);
  }

  function addNote(id: string, text: string) {
    const clean = text.trim();
    if (!clean || clean.length > 3000) throw new Error("Vul een notitie in van maximaal 3000 tekens.");
    const current = loadDemoLeads();
    if (!current.some(lead => lead.id === id)) throw new Error("Deze demoaanvraag bestaat niet meer.");
    const now = new Date().toISOString();
    persist(current.map(lead => lead.id === id ? { ...lead, notes: [...lead.notes, entry(clean, now)], activity: [...lead.activity, entry("Interne notitie toegevoegd", now)] } : lead));
  }

  function reset() { const next = resetDemoLeads(); setLeads(next); setStorageError(""); }
  return { leads, addLead, updateLead, addNote, reset, storageError };
}
