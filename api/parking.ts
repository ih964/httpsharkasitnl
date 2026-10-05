import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 30 };

type LatLng = { lat: number; lng: number };
type ParkingStatus = "free" | "paid" | "permit" | "blue" | "restricted" | "unknown";

type ParkingItem = {
  id: string;
  name: string;
  kind: "zone" | "parking";
  status: ParkingStatus;
  statusLabel: string;
  lat: number;
  lng: number;
  distanceKm: number;
  geometry?: LatLng[][];
  pricePerHour?: number | null;
  dayMax?: number | null;
  maxStayMinutes?: number | null;
  schedule?: string[];
  nextChange?: string | null;
  usage?: string | null;
  source: string;
  note?: string | null;
};

type RequestBody = {
  center?: LatLng;
  radiusKm?: number;
  municipality?: string;
  at?: string;
};

const RDW_BASE = "https://opendata.rdw.nl/resource";
const CACHE_MS = 15 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; payload: any }>();

const DATASETS = {
  managers: "2uc2-nnv3",
  areas: "adw6-9hsg",
  geometry: "nsk3-v9n7",
  areaRegulations: "qtex-qwd8",
  regulations: "yefi-qfiq",
  timeframes: "ixf8-gtwq",
  fareParts: "534e-5vdg",
} as const;

const DAY_NAMES = [
  "ZONDAG",
  "MAANDAG",
  "DINSDAG",
  "WOENSDAG",
  "DONDERDAG",
  "VRIJDAG",
  "ZATERDAG",
] as const;

const DAY_SHORT = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

const getAuthHeader = (req: any) => {
  const raw = req.headers?.authorization ?? req.headers?.Authorization;
  return Array.isArray(raw) ? raw[0] : raw;
};

async function requireParkingAccess(req: any) {
  const authHeader = getAuthHeader(req);
  if (!authHeader) return { ok: false as const, status: 401, message: "Niet ingelogd." };

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false as const, status: 500, message: "Supabase configuratie ontbreekt op Vercel." };
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false as const, status: 401, message: "Sessie ongeldig." };
  }

  const { data: adminRole, error: roleError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleError && adminRole) return { ok: true as const };

  const { data: moduleAccess, error: moduleError } = await client
    .from("user_module_access")
    .select("module_key")
    .eq("user_id", userData.user.id)
    .eq("module_key", "parkeren")
    .maybeSingle();

  if (!moduleError && moduleAccess) return { ok: true as const };

  return { ok: false as const, status: 403, message: "Geen toegang tot de parkeermodule." };
}

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

async function fetchJson(url: string, source = "bron") {
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "HarkasIT-Parkeren/1.0 (+https://harkasit.nl)",
    },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`${source} gaf HTTP ${response.status}`);
  const payload = await response.json();
  cache.set(url, { expiresAt: Date.now() + CACHE_MS, payload });
  return payload;
}

async function rdw(dataset: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(`${RDW_BASE}/${dataset}.json`);
  url.searchParams.set("$limit", String(params.$limit ?? 50000));
  for (const [key, value] of Object.entries(params)) {
    if (key === "$limit" || value == null) continue;
    url.searchParams.set(key, String(value));
  }
  return fetchJson(url.toString(), "RDW");
}

const distanceKm = (a: LatLng, b: LatLng) => {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * r * Math.asin(Math.sqrt(x));
};

function dateDigits(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.slice(0, 8);
}

function isActive(row: any, endField: string, at: Date) {
  const end = dateDigits(row?.[endField]) || "29991231";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const nowKey = `${map.year}${map.month}${map.day}`;
  return end >= nowKey;
}

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dayIndex = weekdayMap[map.weekday] ?? date.getDay();
  return {
    dayIndex,
    minute: Number(map.hour) * 60 + Number(map.minute),
  };
}

function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function amsterdamDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isDutchHoliday(date: Date) {
  const key = amsterdamDateKey(date);
  const year = Number(key.slice(0, 4));
  const fixed = new Set([
    `${year}-01-01`,
    `${year}-05-05`,
    `${year}-12-25`,
    `${year}-12-26`,
  ]);
  const kings = new Date(Date.UTC(year, 3, 27, 12));
  const kingsDay = kings.getUTCDay() === 0 ? 26 : 27;
  fixed.add(`${year}-04-${String(kingsDay).padStart(2, "0")}`);

  const easter = easterSunday(year);
  for (const offset of [0, 1, 39, 49, 50]) {
    const d = new Date(easter.getTime() + offset * 86400000);
    fixed.add(d.toISOString().slice(0, 10));
  }
  return fixed.has(key);
}

function dayMatches(raw: unknown, date: Date) {
  const value = normalize(raw);
  if (!value) return false;
  const { dayIndex } = localParts(date);
  const day = DAY_NAMES[dayIndex];

  if (value.includes(day)) return true;
  if (value.includes("ALLE DAGEN") || value === "DAGELIJKS") return true;
  if (dayIndex >= 1 && dayIndex <= 5 && (value.includes("WERKDAG") || value.includes("MAANDAG T M VRIJDAG"))) return true;
  if (dayIndex >= 1 && dayIndex <= 6 && value.includes("MAANDAG T M ZATERDAG")) return true;
  if (isDutchHoliday(date) && value.includes("FEESTDAG")) return true;
  return false;
}

function hhmmToMinutes(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const hours = Math.floor(n / 100);
  const mins = n % 100;
  return hours * 60 + mins;
}

function minutesToTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeMatches(frame: any, date: Date) {
  if (!dayMatches(frame.daytimeframe, date)) return false;
  const minute = localParts(date).minute;
  const start = hhmmToMinutes(frame.starttimetimeframe, 0);
  const end = hhmmToMinutes(frame.endtimetimeframe, 1440);
  if (end >= start) return minute >= start && minute < end;
  return minute >= start || minute < end;
}

function fareCost(parts: any[], minutes: number) {
  let total = 0;
  for (const p of parts) {
    const start = Number(p.startdurationfarepart ?? 0);
    const end = Number(p.enddurationfarepart ?? 999999);
    const step = Math.max(Number(p.stepsizefarepart ?? 1), 1);
    const amount = Number(p.amountfarepart ?? 0);
    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(amount)) continue;
    if (minutes <= start) break;
    const covered = Math.min(minutes, end) - start;
    if (covered > 0) total += Math.ceil(covered / step) * amount;
  }
  return Math.round(total * 100) / 100;
}

function wktRings(wkt: string): LatLng[][] {
  if (!wkt) return [];
  const chunks: string[] = [];
  const re = /\(\(([^()]+)\)\)/g;
  for (const match of wkt.matchAll(re)) chunks.push(match[1]);
  if (chunks.length === 0) {
    const start = wkt.indexOf("((");
    const end = wkt.lastIndexOf("))");
    if (start >= 0 && end > start) chunks.push(wkt.slice(start + 2, end));
  }

  return chunks
    .map((chunk) => {
      const points: LatLng[] = [];
      const pairRe = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g;
      for (const pair of chunk.matchAll(pairRe)) {
        points.push({ lng: Number(pair[1]), lat: Number(pair[2]) });
      }
      if (points.length > 100) {
        const step = Math.ceil(points.length / 100);
        return points.filter((_, i) => i % step === 0 || i === points.length - 1);
      }
      return points;
    })
    .filter((ring) => ring.length >= 3);
}

function geometryCenter(rings: LatLng[]) {
  const valid = rings.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!valid.length) return null;
  return {
    lat: valid.reduce((sum, p) => sum + p.lat, 0) / valid.length,
    lng: valid.reduce((sum, p) => sum + p.lng, 0) / valid.length,
  };
}

function nextPaidStart(frames: any[], at: Date) {
  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date(at.getTime() + offset * 86400000);
    const currentMinute = offset === 0 ? localParts(at).minute : -1;
    const candidates = frames
      .filter((f) => f.farecalculationcode && dayMatches(f.daytimeframe, d))
      .map((f) => hhmmToMinutes(f.starttimetimeframe, 0))
      .filter((minute) => offset > 0 || minute > currentMinute)
      .sort((a, b) => a - b);
    if (candidates.length) {
      const prefix = offset === 0 ? "" : `${DAY_SHORT[localParts(d).dayIndex]} `;
      return `${prefix}${minutesToTime(candidates[0])}`;
    }
  }
  return null;
}

function scheduleSummary(frames: any[]) {
  return frames
    .filter((f) => f.farecalculationcode)
    .slice(0, 6)
    .map((f) => {
      const day = String(f.daytimeframe ?? "").toLowerCase();
      return `${day}: ${minutesToTime(hhmmToMinutes(f.starttimetimeframe, 0))}–${minutesToTime(
        hhmmToMinutes(f.endtimetimeframe, 1440),
      )}`;
    });
}

function evaluateZone(
  usage: string,
  desc: string,
  regulation: any,
  frames: any[],
  partsByCode: Map<string, any[]>,
  at: Date,
) {
  const normalizedUsage = normalize(usage);
  const normalizedDesc = normalize(desc);
  const activeFrames = frames.filter((f) => timeMatches(f, at));
  const paidFrame = activeFrames.find((f) => f.farecalculationcode);
  const blockedFrame = activeFrames.find((f) => normalize(f.claimrightpossible) === "N");

  const blue =
    normalizedDesc.includes("BLAUW") ||
    normalizedDesc.includes("SCHIJF") ||
    normalizedUsage.includes("SCHIJF");
  const permit =
    normalizedUsage.includes("VERGUN") ||
    normalizedDesc.includes("VERGUNNING") ||
    normalizedDesc.includes("BELANGHEBBEND");

  if (blockedFrame) {
    return {
      status: "restricted" as const,
      statusLabel: "Nu niet parkeren",
      nextChange: minutesToTime(hhmmToMinutes(blockedFrame.endtimetimeframe, 1440)),
      pricePerHour: null,
    };
  }

  if (blue) {
    const maxStay = activeFrames.find((f) => Number(f.maxdurationright) > 0)?.maxdurationright;
    return {
      status: "blue" as const,
      statusLabel: "Blauwe zone",
      nextChange: activeFrames[0]
        ? minutesToTime(hhmmToMinutes(activeFrames[0].endtimetimeframe, 1440))
        : null,
      pricePerHour: 0,
      maxStayMinutes: maxStay ? Number(maxStay) : null,
    };
  }

  if (paidFrame?.farecalculationcode) {
    const parts = partsByCode.get(paidFrame.farecalculationcode) ?? [];
    const hourly = parts.length ? fareCost(parts, 60) : null;
    const end = minutesToTime(hhmmToMinutes(paidFrame.endtimetimeframe, 1440));
    return {
      status: "paid" as const,
      statusLabel: hourly != null ? `Nu betaald · €${hourly.toFixed(2)}/u` : "Nu betaald",
      nextChange: `Gratis/andere regeling vanaf ${end}`,
      pricePerHour: hourly,
      maxStayMinutes: Number(paidFrame.maxdurationright) || null,
    };
  }

  if (permit) {
    return {
      status: "permit" as const,
      statusLabel: "Vergunningzone",
      nextChange: null,
      pricePerHour: null,
    };
  }

  if (normalizedUsage.includes("BETAAL") || frames.some((f) => f.farecalculationcode)) {
    const next = nextPaidStart(frames, at);
    return {
      status: "free" as const,
      statusLabel: "Nu gratis",
      nextChange: next ? `Betaald vanaf ${next}` : null,
      pricePerHour: 0,
    };
  }

  return {
    status: "unknown" as const,
    statusLabel: "Regeling onbekend",
    nextChange: null,
    pricePerHour: null,
  };
}

async function managerIdsForMunicipality(municipality: string) {
  const managers = await rdw(DATASETS.managers, { $limit: 5000 });
  const needle = normalize(municipality);
  if (!needle) return [];

  return (managers as any[])
    .map((m) => {
      const desc = normalize(m.areamanagerdesc);
      let score = 0;
      if (desc === needle) score = 100;
      else if (desc.includes(needle)) score = 80;
      else if (needle.includes(desc) && desc.length > 4) score = 60;
      return { id: String(m.areamanagerid ?? ""), score };
    })
    .filter((m) => m.id && m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((m) => m.id);
}

async function rdwParking(center: LatLng, radiusKm: number, municipality: string, at: Date) {
  const managerIds = await managerIdsForMunicipality(municipality);
  if (!managerIds.length) return { items: [] as ParkingItem[], warning: "Geen NPR-gebiedsbeheerder gevonden voor deze plaats." };

  const items: ParkingItem[] = [];

  for (const managerId of managerIds) {
    const [geometry, areas, areaRegs, regulations, frames, parts] = await Promise.all([
      rdw(DATASETS.geometry, { areamanagerid: managerId }),
      rdw(DATASETS.areas, { areamanagerid: managerId }),
      rdw(DATASETS.areaRegulations, { areamanagerid: managerId }),
      rdw(DATASETS.regulations, { areamanagerid: managerId }),
      rdw(DATASETS.timeframes, { areamanagerid: managerId }),
      rdw(DATASETS.fareParts, { areamanagerid: managerId }),
    ]);

    const areaDesc = new Map<string, string>();
    for (const row of areas as any[]) {
      if (isActive(row, "enddatearea", at)) areaDesc.set(String(row.areaid), String(row.areadesc ?? row.areaid));
    }

    const regulationsById = new Map<string, any>();
    for (const row of regulations as any[]) {
      if (isActive(row, "enddateregulation", at)) regulationsById.set(String(row.regulationid), row);
    }

    const framesByReg = new Map<string, any[]>();
    for (const row of frames as any[]) {
      if (!isActive(row, "enddatetimeframe", at)) continue;
      const key = String(row.regulationid);
      framesByReg.set(key, [...(framesByReg.get(key) ?? []), row]);
    }

    const partsByCode = new Map<string, any[]>();
    for (const row of parts as any[]) {
      if (!isActive(row, "enddatefarepart", at)) continue;
      const key = String(row.farecalculationcode);
      partsByCode.set(key, [...(partsByCode.get(key) ?? []), row]);
    }
    for (const [key, rows] of partsByCode) {
      rows.sort((a, b) => Number(a.startdurationfarepart ?? 0) - Number(b.startdurationfarepart ?? 0));
      partsByCode.set(key, rows);
    }

    const regByArea = new Map<string, any[]>();
    for (const row of areaRegs as any[]) {
      if (!isActive(row, "enddatearearegulation", at)) continue;
      const key = String(row.areaid);
      regByArea.set(key, [...(regByArea.get(key) ?? []), row]);
    }

    const seen = new Set<string>();
    for (const row of geometry as any[]) {
      const areaId = String(row.areaid ?? "");
      if (!areaId || seen.has(areaId)) continue;
      if (!regByArea.has(areaId)) continue;

      const rings = wktRings(String(row.areageometryastext ?? ""));
      const flat = rings.flat();
      const centroid = geometryCenter(flat);
      if (!centroid) continue;

      const dist = Math.min(
        distanceKm(center, centroid),
        ...flat.slice(0, 150).map((p) => distanceKm(center, p)),
      );
      if (dist > radiusKm + 0.75) continue;

      const regs = regByArea.get(areaId) ?? [];
      const preferred =
        regs.find((r) => normalize(r.usageid).includes("BETAAL")) ??
        regs.find((r) => normalize(r.usageid).includes("VERGUN")) ??
        regs[0];
      if (!preferred) continue;

      const regId = String(preferred.regulationid ?? "");
      const desc = areaDesc.get(areaId) ?? areaId;
      const regulation = regulationsById.get(regId);
      const regFrames = framesByReg.get(regId) ?? [];
      const evaluated = evaluateZone(
        String(preferred.usageid ?? ""),
        desc,
        regulation,
        regFrames,
        partsByCode,
        at,
      );

      const relevant =
        evaluated.status !== "unknown" ||
        normalize(preferred.usageid).includes("BETAAL") ||
        normalize(preferred.usageid).includes("VERGUN");
      if (!relevant) continue;

      seen.add(areaId);
      items.push({
        id: `rdw-${managerId}-${areaId}`,
        name: desc,
        kind: "zone",
        status: evaluated.status,
        statusLabel: evaluated.statusLabel,
        lat: centroid.lat,
        lng: centroid.lng,
        distanceKm: distanceKm(center, centroid),
        geometry: rings.length ? rings : undefined,
        pricePerHour: evaluated.pricePerHour,
        dayMax: regulation?.maximumdaycharge ? Number(regulation.maximumdaycharge) : null,
        maxStayMinutes: (evaluated as any).maxStayMinutes ?? null,
        schedule: scheduleSummary(regFrames),
        nextChange: evaluated.nextChange,
        usage: String(preferred.usageid ?? ""),
        source: "RDW / Nationaal Parkeerregister",
        note: regulation?.regulationdesc ? String(regulation.regulationdesc) : null,
      });
    }
  }

  return { items, warning: null as string | null };
}

function parseSimpleCondition(raw: string, at: Date) {
  const value = raw.trim();
  const match = value.match(/yes\s*@\s*\(?([^)]*)\)?/i);
  if (!match) return null;
  const condition = normalize(match[1]);
  const { dayIndex, minute } = localParts(at);
  const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  const day = dayMap[dayIndex];

  let dayOk = condition.includes(day);
  if (/MO\s*FR|MO FR/.test(condition) && dayIndex >= 1 && dayIndex <= 5) dayOk = true;
  if (/MO\s*SA|MO SA/.test(condition) && dayIndex >= 1 && dayIndex <= 6) dayOk = true;
  if (!/[A-Z]{2}/.test(condition)) dayOk = true;

  const time = match[1].match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!time) return dayOk;
  const start = Number(time[1]) * 60 + Number(time[2]);
  const end = Number(time[3]) * 60 + Number(time[4]);
  return dayOk && minute >= start && minute < end;
}

async function osmParking(center: LatLng, radiusKm: number, at: Date) {
  const query = `[out:json][timeout:20];nwr["amenity"="parking"](around:${Math.round(
    radiusKm * 1000,
  )},${center.lat},${center.lng});out center tags;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "HarkasIT-Parkeren/1.0 (+https://harkasit.nl)",
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`OpenStreetMap gaf HTTP ${response.status}`);
  const payload = await response.json();

  const items: ParkingItem[] = [];
  for (const element of payload.elements ?? []) {
    const lat = Number(element.lat ?? element.center?.lat);
    const lng = Number(element.lon ?? element.center?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const dist = distanceKm(center, { lat, lng });
    if (dist > radiusKm + 0.2) continue;

    const tags = element.tags ?? {};
    const fee = normalize(tags.fee);
    const access = normalize(tags.access);
    const condition = String(tags["fee:conditional"] ?? "");
    const parkingCondition = normalize(
      tags["parking:condition"] ?? tags["parking:condition:both"] ?? tags["parking:right:restriction"],
    );

    let status: ParkingStatus = "unknown";
    let statusLabel = "Kosten onbekend";
    let note: string | null = null;

    if (access === "PRIVATE" || access === "PERMIT") {
      status = "permit";
      statusLabel = "Privé / vergunning";
    } else if (parkingCondition.includes("DISC") || normalize(tags.authentication).includes("DISC")) {
      status = "blue";
      statusLabel = "Blauwe zone";
    } else if (fee === "NO") {
      const conditionalPaid = condition ? parseSimpleCondition(condition, at) : false;
      status = conditionalPaid ? "paid" : "free";
      statusLabel = conditionalPaid ? "Nu betaald" : "Expliciet gratis";
      if (condition) note = `Voorwaarde: ${condition}`;
    } else if (fee === "YES") {
      status = "paid";
      statusLabel = "Betaald parkeren";
      if (tags.charge) note = String(tags.charge);
    } else if (condition) {
      const paid = parseSimpleCondition(condition, at);
      status = paid === true ? "paid" : paid === false ? "free" : "unknown";
      statusLabel = paid === true ? "Nu betaald" : paid === false ? "Nu gratis" : "Tijdafhankelijk";
      note = `Voorwaarde: ${condition}`;
    }

    const maxStayRaw = String(tags.maxstay ?? "");
    const maxStayMatch = maxStayRaw.match(/(\d+)/);
    const maxStayMinutes = maxStayMatch
      ? /hour|uur|h/i.test(maxStayRaw)
        ? Number(maxStayMatch[1]) * 60
        : Number(maxStayMatch[1])
      : null;

    items.push({
      id: `osm-${element.type}-${element.id}`,
      name: String(tags.name ?? tags.operator ?? "Parkeerplaats"),
      kind: "parking",
      status,
      statusLabel,
      lat,
      lng,
      distanceKm: dist,
      maxStayMinutes,
      schedule: tags.opening_hours ? [String(tags.opening_hours)] : undefined,
      nextChange: null,
      usage: String(tags.parking ?? ""),
      source: "OpenStreetMap",
      note,
    });
  }
  return items;
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "Harkas IT parkeren",
      providers: ["RDW / Nationaal Parkeerregister", "OpenStreetMap"],
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const access = await requireParkingAccess(req);
  if (!access.ok) return res.status(access.status).json({ error: access.message });

  try {
    const body = (req.body ?? {}) as RequestBody;
    const center = body.center;
    if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
      return res.status(400).json({ error: "Geldige kaartcoördinaten ontbreken." });
    }

    const radiusKm = Math.max(0.5, Math.min(Number(body.radiusKm ?? 3), 10));
    const municipality = String(body.municipality ?? "").trim();
    const at = body.at ? new Date(body.at) : new Date();
    if (Number.isNaN(at.getTime())) return res.status(400).json({ error: "Ongeldige datum/tijd." });

    const warnings: string[] = [];
    const sources = new Set<string>();
    let items: ParkingItem[] = [];

    if (municipality) {
      try {
        const rdwResult = await rdwParking(center, radiusKm, municipality, at);
        items.push(...rdwResult.items);
        if (rdwResult.items.length) sources.add("RDW / Nationaal Parkeerregister");
        if (rdwResult.warning) warnings.push(rdwResult.warning);
      } catch (error) {
        warnings.push(error instanceof Error ? `RDW: ${error.message}` : "RDW-parkeerdata kon niet worden geladen.");
      }
    } else {
      warnings.push("Gemeente kon niet worden bepaald; officiële RDW-zones zijn daarom niet geladen.");
    }

    try {
      const osm = await osmParking(center, radiusKm, at);
      items.push(...osm);
      if (osm.length) sources.add("OpenStreetMap");
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "OpenStreetMap-parkeerplaatsen konden niet worden geladen.");
    }

    const statusOrder: Record<ParkingStatus, number> = {
      free: 0,
      paid: 1,
      blue: 2,
      permit: 3,
      restricted: 4,
      unknown: 5,
    };

    items.sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.distanceKm - b.distanceKm;
    });

    return res.status(200).json({
      items: items.slice(0, 500),
      warnings: [...new Set(warnings)],
      sources: [...sources],
      at: at.toISOString(),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[parking]", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Onbekende fout." });
  }
}
