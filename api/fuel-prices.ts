import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 60 };

type CountryCode = "NL" | "DE" | "BE";
type FuelType = "e10" | "e5" | "diesel" | "lpg";
type SearchMode = "nearby" | "country";
type LatLng = { lat: number; lng: number };

type FuelStation = {
  id: string;
  name: string;
  brand?: string | null;
  address?: string | null;
  city?: string | null;
  country?: CountryCode | null;
  lat: number;
  lng: number;
  price?: number | null;
  distanceKm?: number | null;
  isOpen?: boolean | null;
  updatedAt?: string | null;
  source?: string | null;
};

type RequestBody = {
  mode?: SearchMode;
  center?: LatLng;
  radiusKm?: number;
  fuel?: FuelType;
  countries?: CountryCode[];
  bestPerCountry?: boolean;
};

type AnwbStation = {
  id?: string;
  coordinates?: { latitude?: number; longitude?: number };
  title?: string;
  address?: {
    streetAddress?: string;
    city?: string;
    iso3CountryCode?: string;
  };
  prices?: Array<{ fuelType?: string; value?: number; currency?: string }>;
};

type TankPulsListStation = {
  id?: string;
  brand?: string;
  name?: string;
  address?: string;
  distance?: number;
  prices?: Record<string, number | null | undefined>;
  open?: boolean;
  reported_at?: string;
  lat?: number;
  lon?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  coordinates?: Record<string, number>;
  location?: Record<string, number>;
};

const ANWB_URL = "https://api.anwb.nl/routing/points-of-interest/v3/all";
const TANKPULS_URL = "https://api.tankpuls.de/v1";
const CACHE_MS = 10 * 60 * 1000;

const COUNTRY_META = {
  NL: { south: 50.7, west: 3.3, north: 53.6, east: 7.3, iso3: "NLD" },
  BE: { south: 49.5, west: 2.5, north: 51.5, east: 6.5, iso3: "BEL" },
} satisfies Record<"NL" | "BE", { south: number; west: number; north: number; east: number; iso3: string }>;

type BoundingBox = { south: number; west: number; north: number; east: number };

const COUNTRY_BOUNDS: Record<CountryCode, BoundingBox> = {
  NL: { south: 50.7, west: 3.3, north: 53.6, east: 7.3 },
  BE: { south: 49.5, west: 2.5, north: 51.5, east: 6.5 },
  DE: { south: 47.2, west: 5.5, north: 55.1, east: 15.6 },
};

const ANWB_FUEL: Record<FuelType, string> = {
  e10: "EURO95",
  e5: "EURO98",
  diesel: "DIESEL",
  lpg: "AUTOGAS",
};

const TANKPULS_FUEL: Record<Exclude<FuelType, "lpg">, string> = {
  e10: "E10",
  e5: "E5",
  diesel: "Diesel",
};

const anwbCache = new Map<string, { expiresAt: number; stations: AnwbStation[] }>();
const tankPulsCache = new Map<string, { expiresAt: number; payload: any }>();

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

const boundingBoxAround = (center: LatLng, radiusKm: number): BoundingBox => {
  const latDelta = radiusKm / 111;
  const lonScale = Math.max(111 * Math.cos((center.lat * Math.PI) / 180), 0.1);
  const lonDelta = radiusKm / lonScale;
  return {
    south: center.lat - latDelta,
    west: center.lng - lonDelta,
    north: center.lat + latDelta,
    east: center.lng + lonDelta,
  };
};

const boxesIntersect = (a: BoundingBox, b: BoundingBox) =>
  a.south <= b.north && a.north >= b.south && a.west <= b.east && a.east >= b.west;

const searchIntersectsCountry = (center: LatLng, radiusKm: number, country: CountryCode) =>
  boxesIntersect(boundingBoxAround(center, radiusKm + 2), COUNTRY_BOUNDS[country]);

const destination = (origin: LatLng, bearingDegrees: number, distance: number): LatLng => {
  const r = 6371;
  const bearing = (bearingDegrees * Math.PI) / 180;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lon1 = (origin.lng * Math.PI) / 180;
  const angular = distance / r;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: (lat2 * 180) / Math.PI, lng: (lon2 * 180) / Math.PI };
};

const isCountryCode = (value: unknown): value is CountryCode =>
  value === "NL" || value === "BE" || value === "DE";

const getAuthHeader = (req: any) => {
  const raw = req.headers?.authorization ?? req.headers?.Authorization;
  return Array.isArray(raw) ? raw[0] : raw;
};

async function requireAdmin(req: any) {
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

  const { data: role, error: roleError } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !role) {
    return { ok: false as const, status: 403, message: "Alleen admins hebben toegang." };
  }

  return { ok: true as const };
}

async function fetchCachedJson(url: string, source: "tankpuls" | "anwb") {
  const cache = source === "tankpuls" ? tankPulsCache : anwbCache;
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return source === "tankpuls" ? (cached as any).payload : (cached as any).stations;
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "HarkasIT-FuelPrices/1.0 (+https://harkasit.nl)",
  };
  if (source === "anwb") {
    headers.Referer = "https://www.anwb.nl/";
    headers["x-anwb-caller-id"] = "routing/point-of-interest-map-web";
  }
  const tankPulsKey = process.env.TANKPULS_API_KEY;
  if (source === "tankpuls" && tankPulsKey) {
    headers.Authorization = `Bearer ${tankPulsKey}`;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(source === "tankpuls" ? 20_000 : 45_000),
  });

  if (!response.ok) {
    throw new Error(`${source === "tankpuls" ? "TankPuls" : "ANWB"} gaf HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (source === "tankpuls") {
    tankPulsCache.set(url, { expiresAt: Date.now() + CACHE_MS, payload });
  } else {
    anwbCache.set(url, { expiresAt: Date.now() + CACHE_MS, stations: payload });
  }
  return payload;
}

async function fetchAnwbCountry(
  country: "NL" | "BE",
  fuel: FuelType,
  origin?: LatLng,
  searchBox?: BoundingBox,
): Promise<FuelStation[]> {
  const bbox = COUNTRY_META[country];
  const requestBox = searchBox ?? bbox;
  const params = new URLSearchParams({
    "type-filter": "FUEL_STATION",
    "show-all-pois-along-route-filter": "true",
    "bounding-box-filter": `${requestBox.south},${requestBox.west},${requestBox.north},${requestBox.east}`,
  });
  const payload = await fetchCachedJson(`${ANWB_URL}?${params.toString()}`, "anwb");
  const rows: AnwbStation[] = Array.isArray(payload?.value)
    ? payload.value
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  return rows
    .map((raw): FuelStation | null => {
      const lat = Number(raw.coordinates?.latitude);
      const lng = Number(raw.coordinates?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const stationIso = raw.address?.iso3CountryCode?.toUpperCase();
      if (stationIso && stationIso !== bbox.iso3) return null;
      if (lat < bbox.south || lat > bbox.north || lng < bbox.west || lng > bbox.east) return null;

      const priceRow = raw.prices?.find((price) => price.fuelType === ANWB_FUEL[fuel]);
      const price = Number(priceRow?.value);
      if (!Number.isFinite(price) || price <= 0 || price > 5) return null;

      const name = raw.title?.trim() || "Tankstation";
      return {
        id: `anwb-${country}-${raw.id ?? `${lat}-${lng}`}`,
        name,
        brand: name.split(/\s+/)[0] || null,
        address: raw.address?.streetAddress?.trim() || null,
        city: raw.address?.city?.trim() || null,
        country,
        lat,
        lng,
        price,
        distanceKm: origin ? distanceKm(origin, { lat, lng }) : null,
        updatedAt: null,
        source: "ANWB brandstofdata",
      };
    })
    .filter((station): station is FuelStation => station !== null);
}

function tankPulsSearchCenters(origin: LatLng, radiusKm: number): Array<{ center: LatLng; radius: number }> {
  if (radiusKm <= 25) return [{ center: origin, radius: radiusKm }];

  if (radiusKm <= 30) {
    const ringDistance = 21.2;
    return [0, 90, 180, 270].map((bearing) => ({
      center: destination(origin, bearing, ringDistance),
      radius: 25,
    }));
  }

  const centers: Array<{ center: LatLng; radius: number }> = [{ center: origin, radius: 25 }];
  const ringDistance = 43.3;
  for (let bearing = 0; bearing < 360; bearing += 60) {
    centers.push({ center: destination(origin, bearing, ringDistance), radius: 25 });
  }
  return centers;
}

const GERMANY_OUTLINE: LatLng[] = [
  { lat: 54.983104, lng: 9.921906 }, { lat: 54.596642, lng: 9.93958 },
  { lat: 54.363607, lng: 10.950112 }, { lat: 54.008693, lng: 10.939467 },
  { lat: 54.196486, lng: 11.956252 }, { lat: 54.470371, lng: 12.51844 },
  { lat: 54.075511, lng: 13.647467 }, { lat: 53.757029, lng: 14.119686 },
  { lat: 53.248171, lng: 14.353315 }, { lat: 52.981263, lng: 14.074521 },
  { lat: 52.62485, lng: 14.4376 }, { lat: 52.089947, lng: 14.685026 },
  { lat: 51.745188, lng: 14.607098 }, { lat: 51.106674, lng: 15.016996 },
  { lat: 51.002339, lng: 14.570718 }, { lat: 51.117268, lng: 14.307013 },
  { lat: 50.926918, lng: 14.056228 }, { lat: 50.733234, lng: 13.338132 },
  { lat: 50.484076, lng: 12.966837 }, { lat: 50.266338, lng: 12.240111 },
  { lat: 49.969121, lng: 12.415191 }, { lat: 49.547415, lng: 12.521024 },
  { lat: 49.307068, lng: 13.031329 }, { lat: 48.877172, lng: 13.595946 },
  { lat: 48.416115, lng: 13.243357 }, { lat: 48.289146, lng: 12.884103 },
  { lat: 47.637584, lng: 13.025851 }, { lat: 47.467646, lng: 12.932627 },
  { lat: 47.672388, lng: 12.62076 }, { lat: 47.703083, lng: 12.141357 },
  { lat: 47.523766, lng: 11.426414 }, { lat: 47.566399, lng: 10.544504 },
  { lat: 47.302488, lng: 10.402084 }, { lat: 47.580197, lng: 9.896068 },
  { lat: 47.525058, lng: 9.594226 }, { lat: 47.830828, lng: 8.522612 },
  { lat: 47.61358, lng: 8.317301 }, { lat: 47.620582, lng: 7.466759 },
  { lat: 48.333019, lng: 7.593676 }, { lat: 49.017784, lng: 8.099279 },
  { lat: 49.201958, lng: 6.65823 }, { lat: 49.463803, lng: 6.18632 },
  { lat: 49.902226, lng: 6.242751 }, { lat: 50.128052, lng: 6.043073 },
  { lat: 50.803721, lng: 6.156658 }, { lat: 51.851616, lng: 5.988658 },
  { lat: 51.852029, lng: 6.589397 }, { lat: 52.22844, lng: 6.84287 },
  { lat: 53.144043, lng: 7.092053 }, { lat: 53.482162, lng: 6.90514 },
  { lat: 53.693932, lng: 7.100425 }, { lat: 53.748296, lng: 7.936239 },
  { lat: 53.527792, lng: 8.121706 }, { lat: 54.020786, lng: 8.800734 },
  { lat: 54.395646, lng: 8.572118 }, { lat: 54.962744, lng: 8.526229 },
  { lat: 54.830865, lng: 9.282049 }, { lat: 54.983104, lng: 9.921906 },
];

function pointInPolygon(point: LatLng, polygon: LatLng[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceToSegmentKm(point: LatLng, a: LatLng, b: LatLng) {
  const cosLat = Math.cos((point.lat * Math.PI) / 180);
  const ax = (a.lng - point.lng) * 111 * cosLat;
  const ay = (a.lat - point.lat) * 111;
  const bx = (b.lng - point.lng) * 111 * cosLat;
  const by = (b.lat - point.lat) * 111;
  const dx = bx - ax;
  const dy = by - ay;
  const denom = dx * dx + dy * dy;
  const t = denom === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denom));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function withinGermanyScanMargin(point: LatLng, marginKm = 25) {
  if (pointInPolygon(point, GERMANY_OUTLINE)) return true;
  for (let i = 0; i < GERMANY_OUTLINE.length - 1; i += 1) {
    if (distanceToSegmentKm(point, GERMANY_OUTLINE[i], GERMANY_OUTLINE[i + 1]) <= marginKm) {
      return true;
    }
  }
  return false;
}

function germanySearchCenters() {
  const radiusKm = 25;
  const verticalStepDeg = (1.5 * radiusKm) / 111;
  const centers: LatLng[] = [];
  let row = 0;

  for (let lat = 47.1; lat <= 55.1; lat += verticalStepDeg) {
    const horizontalStepDeg =
      (Math.sqrt(3) * radiusKm) / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));
    const offset = row % 2 === 0 ? 0 : horizontalStepDeg / 2;

    for (let lng = 5.5 - offset; lng <= 15.6 + horizontalStepDeg / 2; lng += horizontalStepDeg) {
      const point = { lat, lng };
      if (withinGermanyScanMargin(point, radiusKm)) centers.push(point);
    }
    row += 1;
  }

  return centers;
}

function extractCoords(raw: any): LatLng | null {
  const candidates = [
    { lat: raw?.lat, lng: raw?.lng ?? raw?.lon },
    { lat: raw?.latitude, lng: raw?.longitude },
    { lat: raw?.coordinates?.lat ?? raw?.coordinates?.latitude, lng: raw?.coordinates?.lng ?? raw?.coordinates?.lon ?? raw?.coordinates?.longitude },
    { lat: raw?.location?.lat ?? raw?.location?.latitude, lng: raw?.location?.lng ?? raw?.location?.lon ?? raw?.location?.longitude },
    { lat: raw?.station?.lat ?? raw?.station?.latitude, lng: raw?.station?.lng ?? raw?.station?.lon ?? raw?.station?.longitude },
  ];

  for (const candidate of candidates) {
    const lat = Number(candidate.lat);
    const lng = Number(candidate.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

function priceFromTankPuls(station: TankPulsListStation, fuel: Exclude<FuelType, "lpg">) {
  const value = station.prices?.[fuel] ?? station.prices?.[fuel.toUpperCase()];
  const price = Number(value);
  return Number.isFinite(price) && price > 0 && price < 5 ? price : null;
}

async function fetchTankPulsStationDetail(id: string) {
  return fetchCachedJson(`${TANKPULS_URL}/stations/${encodeURIComponent(id)}`, "tankpuls");
}

async function fetchTankPulsNearby(
  origin: LatLng,
  radiusKm: number,
  fuel: Exclude<FuelType, "lpg">,
): Promise<FuelStation[]> {
  const centers = tankPulsSearchCenters(origin, radiusKm);
  const listResponses = await Promise.all(
    centers.map(async ({ center, radius }) => {
      const params = new URLSearchParams({
        lat: center.lat.toFixed(6),
        lon: center.lng.toFixed(6),
        radius: String(Math.min(radius, 25)),
        fuel: TANKPULS_FUEL[fuel],
        sort: "price",
      });
      return fetchCachedJson(`${TANKPULS_URL}/stations?${params.toString()}`, "tankpuls");
    }),
  );

  const rawById = new Map<string, TankPulsListStation>();
  let updatedAt: string | null = null;

  for (const payload of listResponses) {
    if (payload?.updated_at && !updatedAt) updatedAt = String(payload.updated_at);
    for (const station of payload?.stations ?? []) {
      if (station?.id) rawById.set(String(station.id), station);
    }
  }

  const candidates = [...rawById.values()]
    .map((station) => ({
      station,
      price: priceFromTankPuls(station, fuel),
    }))
    .filter((item) => item.price !== null)
    .sort((a, b) => (a.price as number) - (b.price as number))
    .slice(0, 30);

  const detailed = await Promise.all(
    candidates.map(async ({ station, price }) => {
      let detail: any = null;
      let coords = extractCoords(station);

      if (!coords && station.id) {
        try {
          detail = await fetchTankPulsStationDetail(String(station.id));
          coords = extractCoords(detail) || extractCoords(detail?.station);
        } catch {
          // Keep this station out of the map if coordinates are unavailable.
        }
      }

      if (!coords || distanceKm(origin, coords) > radiusKm + 0.5) return null;

      const detailStation = detail?.station ?? detail ?? {};
      const address = String(station.address ?? detailStation.address ?? "").trim();

      return {
        id: `tankpuls-${station.id}`,
        name: String(station.name ?? station.brand ?? detailStation.name ?? detailStation.brand ?? "Tankstation"),
        brand: String(station.brand ?? detailStation.brand ?? "") || null,
        address: address || null,
        city: String(detailStation.city ?? "") || null,
        country: "DE" as const,
        lat: coords.lat,
        lng: coords.lng,
        price: price as number,
        distanceKm: distanceKm(origin, coords),
        isOpen: typeof station.open === "boolean" ? station.open : detailStation.open ?? null,
        updatedAt: String(station.reported_at ?? detailStation.reported_at ?? updatedAt ?? new Date().toISOString()),
        source: "TankPuls · MTS-K",
      } satisfies FuelStation;
    }),
  );

  return detailed.filter((station): station is FuelStation => station !== null);
}

async function fetchTankPulsCountryCheapest(
  fuel: Exclude<FuelType, "lpg">,
): Promise<{ station: FuelStation; failedCenters: number; centerCount: number }> {
  if (!process.env.TANKPULS_API_KEY) {
    throw new Error("DE_UNLIMITED_KEY_REQUIRED");
  }

  const centers = germanySearchCenters();
  const rawById = new Map<string, TankPulsListStation>();
  let updatedAt: string | null = null;
  let failedCenters = 0;
  const batchSize = 50;

  for (let start = 0; start < centers.length; start += batchSize) {
    const batch = centers.slice(start, start + batchSize);
    const responses = await Promise.allSettled(
      batch.map((center) => {
        const params = new URLSearchParams({
          lat: center.lat.toFixed(6),
          lon: center.lng.toFixed(6),
          radius: "25",
          fuel: TANKPULS_FUEL[fuel],
          sort: "price",
        });
        return fetchCachedJson(`${TANKPULS_URL}/stations?${params.toString()}`, "tankpuls");
      }),
    );

    for (const response of responses) {
      if (response.status !== "fulfilled") {
        failedCenters += 1;
        continue;
      }
      const payload = response.value;
      if (payload?.updated_at && !updatedAt) updatedAt = String(payload.updated_at);
      for (const station of payload?.stations ?? []) {
        if (station?.id) rawById.set(String(station.id), station);
      }
    }
  }

  const candidates = [...rawById.values()]
    .map((station) => ({ station, price: priceFromTankPuls(station, fuel) }))
    .filter((item): item is { station: TankPulsListStation; price: number } => item.price !== null)
    .sort((a, b) => a.price - b.price)
    .slice(0, 12);

  for (const { station, price } of candidates) {
    let detail: any = null;
    let coords = extractCoords(station);

    if (!coords && station.id) {
      try {
        detail = await fetchTankPulsStationDetail(String(station.id));
        coords = extractCoords(detail) || extractCoords(detail?.station);
      } catch {
        continue;
      }
    }
    if (!coords) continue;

    const detailStation = detail?.station ?? detail ?? {};
    const address = String(station.address ?? detailStation.address ?? "").trim();

    return {
      station: {
        id: `tankpuls-${station.id}`,
        name: String(station.name ?? station.brand ?? detailStation.name ?? detailStation.brand ?? "Tankstation"),
        brand: String(station.brand ?? detailStation.brand ?? "") || null,
        address: address || null,
        city: String(detailStation.city ?? "") || null,
        country: "DE",
        lat: coords.lat,
        lng: coords.lng,
        price,
        distanceKm: null,
        isOpen: typeof station.open === "boolean" ? station.open : detailStation.open ?? null,
        updatedAt: String(station.reported_at ?? detailStation.reported_at ?? updatedAt ?? new Date().toISOString()),
        source: "TankPuls · MTS-K",
      },
      failedCenters,
      centerCount: centers.length,
    };
  }

  throw new Error("Geen landelijke Duitse prijsdata gevonden.");
}

function dedupe(stations: FuelStation[]) {
  const byKey = new Map<string, FuelStation>();
  for (const station of stations) {
    const key = `${station.country}:${station.id}`;
    if (!byKey.has(key)) byKey.set(key, station);
  }
  return [...byKey.values()];
}

function sortStations(stations: FuelStation[]) {
  return [...stations].sort((a, b) => {
    const ap = typeof a.price === "number" ? a.price : Number.POSITIVE_INFINITY;
    const bp = typeof b.price === "number" ? b.price : Number.POSITIVE_INFINITY;
    if (ap !== bp) return ap - bp;
    return (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999);
  });
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "Harkas IT fuel prices",
      providers: ["ANWB NL/BE", "TankPuls DE"],
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req);
  if (!admin.ok) return res.status(admin.status).json({ error: admin.message });

  try {
    const body = (req.body ?? {}) as RequestBody;
    const mode: SearchMode = body.mode === "country" ? "country" : "nearby";
    const fuel: FuelType = ["e10", "e5", "diesel", "lpg"].includes(String(body.fuel))
      ? (body.fuel as FuelType)
      : "e10";
    const radiusKm = Math.max(1, Math.min(Number(body.radiusKm ?? 30), 50));
    const countries = (body.countries ?? ["NL", "DE", "BE"]).filter(isCountryCode);
    const bestPerCountry = Boolean(body.bestPerCountry);

    if (countries.length === 0) {
      return res.status(400).json({ error: "Selecteer minimaal één land." });
    }

    const warnings: string[] = [];
    const sources = new Set<string>();
    let stations: FuelStation[] = [];

    if (mode === "country") {
      for (const country of countries) {
        try {
          if (country === "DE") {
            if (fuel === "lpg") {
              warnings.push("DE: de Duitse MTS-K-bron bevat E5, E10 en diesel, maar geen LPG.");
              continue;
            }

            try {
              const result = await fetchTankPulsCountryCheapest(fuel);
              stations.push(result.station);
              sources.add("TankPuls · MTS-K");
              if (result.failedCenters > 0) {
                warnings.push(
                  `DE: ${result.failedCenters} van ${result.centerCount} deelgebieden konden niet worden geladen; controleer het Duitse resultaat voor vertrek.`,
                );
              }
            } catch (error) {
              if (error instanceof Error && error.message === "DE_UNLIMITED_KEY_REQUIRED") {
                warnings.push(
                  "DE onbeperkt: voeg een gratis TANKPULS_API_KEY toe in Vercel. De anonieme API is beperkt tot 60 aanvragen/minuut en een landelijke scan heeft meer deelgebieden nodig.",
                );
              } else {
                throw error;
              }
            }
            continue;
          }

          const rows = sortStations(await fetchAnwbCountry(country, fuel));
          if (bestPerCountry) {
            if (rows[0]) stations.push(rows[0]);
          } else {
            stations.push(...rows);
          }
          if (rows.length > 0) sources.add("ANWB brandstofdata");
        } catch (error) {
          warnings.push(error instanceof Error ? `${country}: ${error.message}` : `${country}: bronfout`);
        }
      }
    } else {
      const center = body.center;
      if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
        return res.status(400).json({ error: "Geldige kaartcoördinaten ontbreken." });
      }

      for (const country of countries) {
        if (!searchIntersectsCountry(center, radiusKm, country)) continue;

        try {
          if (country === "DE") {
            if (fuel === "lpg") {
              warnings.push("De gratis Duitse MTS-K-bron bevat E5, E10 en diesel, maar geen LPG.");
              continue;
            }
            const rows = await fetchTankPulsNearby(center, radiusKm, fuel);
            stations.push(...rows);
            if (rows.length > 0) sources.add("TankPuls · MTS-K");
          } else {
            const localBox = boundingBoxAround(center, radiusKm + 2);
            const rows = (await fetchAnwbCountry(country, fuel, center, localBox)).filter(
              (station) => (station.distanceKm ?? distanceKm(center, station)) <= radiusKm,
            );
            stations.push(...rows);
            if (rows.length > 0) sources.add("ANWB brandstofdata");
          }
        } catch (error) {
          warnings.push(
            error instanceof Error ? `${country}: ${error.message}` : `${country}: brandstofdata kon niet worden geladen.`,
          );
        }
      }
    }

    stations = sortStations(dedupe(stations));
    if (mode === "country" && !bestPerCountry) stations = stations.slice(0, 100);
    else if (mode !== "country") stations = stations.slice(0, 300);

    return res.status(200).json({
      stations,
      warnings: [...new Set(warnings)],
      sources: [...sources],
      generatedAt: new Date().toISOString(),
      cacheMinutes: CACHE_MS / 60000,
    });
  } catch (error) {
    console.error("[fuel-prices]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Onbekende fout.",
    });
  }
}
