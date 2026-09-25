import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 30 };

type CountryCode = "NL" | "DE" | "BE";
type FuelType = "e10" | "e5" | "diesel" | "lpg";
type SearchMode = "nearby" | "country";
type PriceOrder = "cheapest" | "expensive";
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
  order?: PriceOrder;
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

type TankPulsSearchStation = {
  id?: string;
  name?: string;
  brandName?: string | null;
  street?: string | null;
  postcode?: string | null;
  city?: string | null;
  status?: string | null;
  isActive?: boolean | null;
  lat?: number;
  lng?: number;
  priceCents?: number | null;
  priceTs?: string | null;
};

const ANWB_URL = "https://api.anwb.nl/routing/points-of-interest/v3/all";
const TANKPULS_SEARCH_URL = "https://api.tankpuls.de/api/search/cheapest";
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

async function fetchTankPulsBox(
  searchBox: BoundingBox,
  fuel: Exclude<FuelType, "lpg">,
  origin?: LatLng,
  radiusKm?: number,
  limit = 50,
  offset = 0,
): Promise<FuelStation[]> {
  const params = new URLSearchParams({
    minLat: searchBox.south.toFixed(6),
    minLng: searchBox.west.toFixed(6),
    maxLat: searchBox.north.toFixed(6),
    maxLng: searchBox.east.toFixed(6),
    fuel,
    limit: String(Math.max(1, Math.min(limit, 500))),
    offset: String(Math.max(0, Math.floor(offset))),
  });

  const payload = await fetchCachedJson(`${TANKPULS_SEARCH_URL}?${params.toString()}`, "tankpuls");
  const rows: TankPulsSearchStation[] = Array.isArray(payload?.items) ? payload.items : [];

  return rows
    .map((raw): FuelStation | null => {
      const lat = Number(raw.lat);
      const lng = Number(raw.lng);
      const priceCents = Number(raw.priceCents);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (!Number.isFinite(priceCents) || priceCents <= 0) return null;
      if (raw.isActive === false) return null;

      const point = { lat, lng };
      const distance = origin ? distanceKm(origin, point) : null;
      if (typeof radiusKm === "number" && distance !== null && distance > radiusKm + 0.5) {
        return null;
      }

      const name = String(raw.name || raw.brandName || "Tankstation").trim();
      const address = [raw.street, raw.postcode].filter(Boolean).join(", ");

      return {
        id: `tankpuls-${raw.id ?? `${lat}-${lng}`}`,
        name,
        brand: raw.brandName?.trim() || name.split(/\s+/)[0] || null,
        address: address || null,
        city: raw.city?.trim() || null,
        country: "DE",
        lat,
        lng,
        price: priceCents / 1000,
        distanceKm: distance,
        isOpen: raw.status === "open" ? true : raw.status === "closed" ? false : null,
        updatedAt: raw.priceTs || null,
        source: "TankPuls · MTS-K",
      };
    })
    .filter((station): station is FuelStation => station !== null)
    .sort((a, b) => {
      const priceDiff = (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);
      if (priceDiff !== 0) return priceDiff;
      return (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999);
    });
}

async function fetchTankPulsMostExpensiveBox(
  searchBox: BoundingBox,
  fuel: Exclude<FuelType, "lpg">,
  origin?: LatLng,
  radiusKm?: number,
): Promise<FuelStation[]> {
  const existsAt = async (offset: number) =>
    (await fetchTankPulsBox(searchBox, fuel, undefined, undefined, 1, offset)).length > 0;

  if (!(await existsAt(0))) return [];

  let low = 0;
  let high = 20_000;
  if (await existsAt(high)) {
    low = high;
    high = 40_000;
    while (high < 160_000 && (await existsAt(high))) {
      low = high;
      high *= 2;
    }
  }

  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    if (await existsAt(mid)) low = mid;
    else high = mid;
  }

  let cursor = low;
  const collected: FuelStation[] = [];

  while (cursor >= 0 && collected.length < 50) {
    const start = Math.max(0, cursor - 199);
    const pageSize = cursor - start + 1;
    const page = await fetchTankPulsBox(searchBox, fuel, origin, radiusKm, pageSize, start);
    collected.push(...page);
    if (start === 0) break;
    cursor = start - 1;
  }

  return sortStations(dedupe(collected), "expensive").slice(0, 50);
}

function dedupe(stations: FuelStation[]) {
  const byKey = new Map<string, FuelStation>();
  for (const station of stations) {
    const key = `${station.country}:${station.id}`;
    if (!byKey.has(key)) byKey.set(key, station);
  }
  return [...byKey.values()];
}

function sortStations(stations: FuelStation[], order: PriceOrder = "cheapest") {
  return [...stations].sort((a, b) => {
    const missingPrice = order === "cheapest" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    const ap = typeof a.price === "number" ? a.price : missingPrice;
    const bp = typeof b.price === "number" ? b.price : missingPrice;
    if (ap !== bp) return order === "cheapest" ? ap - bp : bp - ap;
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
    const order: PriceOrder = body.order === "expensive" ? "expensive" : "cheapest";

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
              warnings.push("DE: MTS-K bevat E5, E10 en diesel, maar geen LPG.");
              continue;
            }

            const rows =
              order === "expensive"
                ? await fetchTankPulsMostExpensiveBox(COUNTRY_BOUNDS.DE, fuel)
                : await fetchTankPulsBox(COUNTRY_BOUNDS.DE, fuel, undefined, undefined, 50);
            const orderedRows = sortStations(rows, order);
            if (bestPerCountry) {
              if (orderedRows[0]) stations.push(orderedRows[0]);
            } else {
              stations.push(...orderedRows);
            }
            if (rows.length > 0) sources.add("TankPuls · MTS-K");
            continue;
          }

          const rows = sortStations(await fetchAnwbCountry(country, fuel), order);
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
            const localBox = boundingBoxAround(center, radiusKm);
            const rows =
              order === "expensive"
                ? await fetchTankPulsMostExpensiveBox(localBox, fuel, center, radiusKm)
                : await fetchTankPulsBox(localBox, fuel, center, radiusKm, 300);
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

    stations = sortStations(dedupe(stations), order);
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
