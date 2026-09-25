import { createClient } from "@supabase/supabase-js";

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
): Promise<FuelStation[]> {
  const bbox = COUNTRY_META[country];
  const params = new URLSearchParams({
    "type-filter": "FUEL_STATION",
    "bounding-box-filter": `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
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

    if (countries.length === 0) {
      return res.status(400).json({ error: "Selecteer minimaal één land." });
    }

    const warnings: string[] = [];
    const sources = new Set<string>();
    let stations: FuelStation[] = [];

    if (mode === "country") {
      for (const country of countries) {
        if (country === "DE") {
          warnings.push(
            "Heel Duitsland doorzoeken wordt door de gratis Duitse live-bron niet als bulk-query toegestaan. Gebruik 'Rond plaats' met maximaal 50 km.",
          );
          continue;
        }

        try {
          const rows = await fetchAnwbCountry(country, fuel);
          stations.push(...rows);
          sources.add("ANWB brandstofdata");
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
            const rows = (await fetchAnwbCountry(country, fuel, center)).filter(
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
    if (mode === "country") stations = stations.slice(0, 100);
    else stations = stations.slice(0, 300);

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
