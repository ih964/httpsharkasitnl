import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CountryCode = "NL" | "DE" | "BE";
type FuelType = "e10" | "e5" | "diesel" | "lpg";
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
  mode?: "nearby" | "country";
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
    postalCode?: string;
    city?: string;
    country?: string;
    iso3CountryCode?: string;
  };
  prices?: Array<{
    fuelType?: string;
    value?: number;
    currency?: string;
  }>;
};

const ANWB_URL = "https://api.anwb.nl/routing/points-of-interest/v3/all";
const ANWB_CACHE_MS = 10 * 60 * 1000;

const COUNTRY_META: Record<
  CountryCode,
  { south: number; west: number; north: number; east: number; iso3: string }
> = {
  NL: { south: 50.7, west: 3.3, north: 53.6, east: 7.3, iso3: "NLD" },
  BE: { south: 49.5, west: 2.5, north: 51.5, east: 6.5, iso3: "BEL" },
  DE: { south: 47.2, west: 5.8, north: 55.2, east: 15.2, iso3: "DEU" },
};

const ANWB_FUEL: Record<FuelType, string> = {
  e10: "EURO95",
  e5: "EURO98",
  diesel: "DIESEL",
  lpg: "AUTOGAS",
};

const anwbCache = new Map<CountryCode, { expiresAt: number; stations: AnwbStation[] }>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

const inCountryBounds = (country: CountryCode, lat: number, lng: number) => {
  const bbox = COUNTRY_META[country];
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
};

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { ok: false as const, status: 401, message: "Niet ingelogd." };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false as const, status: 500, message: "Supabase configuratie ontbreekt." };
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

async function fetchAnwbRaw(country: CountryCode): Promise<AnwbStation[]> {
  const cached = anwbCache.get(country);
  if (cached && cached.expiresAt > Date.now()) return cached.stations;

  const bbox = COUNTRY_META[country];
  const params = new URLSearchParams({
    "type-filter": "FUEL_STATION",
    "bounding-box-filter": `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
  });

  const response = await fetch(`${ANWB_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "HarkasIT-FuelPrices/1.0 (+https://harkasit.nl)",
    },
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) throw new Error(`ANWB brandstofendpoint gaf HTTP ${response.status}`);

  const payload = await response.json();
  const rows: AnwbStation[] = Array.isArray(payload?.value)
    ? payload.value
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  if (rows.length === 0) throw new Error(`ANWB gaf geen tankstations terug voor ${country}.`);

  anwbCache.set(country, {
    expiresAt: Date.now() + ANWB_CACHE_MS,
    stations: rows,
  });

  return rows;
}

function normalizeAnwbStation(
  raw: AnwbStation,
  country: CountryCode,
  fuel: FuelType,
  origin?: LatLng,
): FuelStation | null {
  const lat = Number(raw.coordinates?.latitude);
  const lng = Number(raw.coordinates?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const expectedIso3 = COUNTRY_META[country].iso3;
  const stationIso3 = raw.address?.iso3CountryCode?.toUpperCase();
  if (stationIso3 && stationIso3 !== expectedIso3) return null;
  if (!inCountryBounds(country, lat, lng)) return null;

  const wantedFuel = ANWB_FUEL[fuel];
  const priceRow = raw.prices?.find((price) => price.fuelType === wantedFuel);
  const price = Number(priceRow?.value);
  if (!Number.isFinite(price) || price < 0.3 || price > 5) return null;

  const name = raw.title?.trim() || "Tankstation";
  const brand = name.split(/\s+/)[0] || null;
  const position = { lat, lng };

  return {
    id: `anwb-${country}-${raw.id ?? `${lat}-${lng}`}`,
    name,
    brand,
    address: raw.address?.streetAddress?.trim() || null,
    city: raw.address?.city?.trim() || null,
    country,
    lat,
    lng,
    price,
    distanceKm: origin ? distanceKm(origin, position) : null,
    updatedAt: new Date().toISOString(),
    source: "ANWB brandstofdata",
  };
}

async function fetchAnwbCountry(
  country: CountryCode,
  fuel: FuelType,
  origin?: LatLng,
): Promise<FuelStation[]> {
  const rows = await fetchAnwbRaw(country);
  return rows
    .map((row) => normalizeAnwbStation(row, country, fuel, origin))
    .filter((station): station is FuelStation => station !== null);
}

async function fetchTankerkoning(
  center: LatLng,
  radiusKm: number,
  fuel: FuelType,
): Promise<{ stations: FuelStation[]; warning?: string }> {
  const apiKey = Deno.env.get("TANKERKOENIG_API_KEY");
  if (!apiKey) {
    return {
      stations: [],
      warning:
        "Duitsland gebruikt nu de gratis ANWB-bron. Voor officiële MTS-K-data kan later kosteloos een Tankerkönig-key worden toegevoegd.",
    };
  }

  if (fuel === "lpg") {
    return { stations: [], warning: "Tankerkönig levert geen LPG; daarvoor blijft de ANWB-bron actief." };
  }

  if (radiusKm > 25) {
    return {
      stations: [],
      warning:
        "Tankerkönig ondersteunt maximaal 25 km per request; voor 30/50 km gebruikt Harkas automatisch de gratis ANWB-bron.",
    };
  }

  const params = new URLSearchParams({
    lat: String(center.lat),
    lng: String(center.lng),
    rad: String(radiusKm),
    sort: "price",
    type: fuel,
    apikey: apiKey,
  });

  const response = await fetch(
    `https://creativecommons.tankerkoenig.de/json/list.php?${params.toString()}`,
    { signal: AbortSignal.timeout(20_000) },
  );

  if (!response.ok) throw new Error(`Tankerkönig gaf HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload?.ok) throw new Error(payload?.message || "Tankerkönig gaf een foutmelding.");

  const stations: FuelStation[] = (payload.stations ?? [])
    .map((station: Record<string, unknown>) => {
      const lat = Number(station.lat);
      const lng = Number(station.lng);
      const price = Number(station.price);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(price)) return null;

      return {
        id: `tk-${String(station.id)}`,
        name: String(station.name ?? station.brand ?? "Tankstation"),
        brand: station.brand ? String(station.brand) : null,
        address: [station.street, station.houseNumber].filter(Boolean).map(String).join(" ") || null,
        city: station.place ? String(station.place) : null,
        country: "DE" as const,
        lat,
        lng,
        price,
        distanceKm:
          typeof station.dist === "number"
            ? station.dist
            : distanceKm(center, { lat, lng }),
        isOpen: typeof station.isOpen === "boolean" ? station.isOpen : null,
        updatedAt: new Date().toISOString(),
        source: "Tankerkönig / MTS-K",
      } satisfies FuelStation;
    })
    .filter((station): station is FuelStation => station !== null);

  return { stations };
}

async function fetchOsmStations(
  center: LatLng,
  radiusKm: number,
  countries: CountryCode[],
  excludedCountries: Set<CountryCode>,
): Promise<FuelStation[]> {
  const query = `[out:json][timeout:20];nwr["amenity"="fuel"](around:${Math.round(
    radiusKm * 1000,
  )},${center.lat},${center.lng});out center tags;`;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "HarkasIT-FuelPrices/1.0 (+https://harkasit.nl; contact: info@harkasit.nl)",
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) throw new Error(`OpenStreetMap/Overpass gaf HTTP ${response.status}`);
  const payload = await response.json();

  return (payload.elements ?? [])
    .map((element: Record<string, any>) => {
      const lat = Number(element.lat ?? element.center?.lat);
      const lng = Number(element.lon ?? element.center?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const tags = element.tags ?? {};
      let country: CountryCode | null = null;
      const tagCountry = String(tags["addr:country"] ?? "").toUpperCase();
      if (tagCountry === "NL" || tagCountry === "DE" || tagCountry === "BE") {
        country = tagCountry;
      } else {
        country =
          (["NL", "BE", "DE"] as CountryCode[]).find((code) => inCountryBounds(code, lat, lng)) ??
          null;
      }

      if (!country || !countries.includes(country) || excludedCountries.has(country)) return null;

      return {
        id: `osm-${element.type}-${element.id}`,
        name: String(tags.name ?? tags.brand ?? "Tankstation"),
        brand: tags.brand ? String(tags.brand) : null,
        address: [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ") || null,
        city: tags["addr:city"] ?? tags["addr:place"] ?? null,
        country,
        lat,
        lng,
        price: null,
        distanceKm: distanceKm(center, { lat, lng }),
        source: "OpenStreetMap",
      } satisfies FuelStation;
    })
    .filter((station: FuelStation | null): station is FuelStation => station !== null);
}

function dedupe(stations: FuelStation[]) {
  const byId = new Map<string, FuelStation>();
  for (const station of stations) {
    const key = `${station.country ?? "?"}:${station.id.replace(/^anwb-[A-Z]{2}-|^tk-/, "")}`;
    const existing = byId.get(key);
    if (!existing || (existing.source !== "Tankerkönig / MTS-K" && station.source === "Tankerkönig / MTS-K")) {
      byId.set(key, station);
    }
  }

  const kept: FuelStation[] = [];
  for (const station of byId.values()) {
    const duplicateIndex = kept.findIndex(
      (other) => other.country === station.country && distanceKm(station, other) < 0.05,
    );
    if (duplicateIndex === -1) {
      kept.push(station);
      continue;
    }

    if (
      kept[duplicateIndex].source !== "Tankerkönig / MTS-K" &&
      station.source === "Tankerkönig / MTS-K"
    ) {
      kept[duplicateIndex] = station;
    }
  }

  return kept;
}

function sortStations(stations: FuelStation[]) {
  return [...stations].sort((a, b) => {
    const ap = typeof a.price === "number" ? a.price : Number.POSITIVE_INFINITY;
    const bp = typeof b.price === "number" ? b.price : Number.POSITIVE_INFINITY;
    if (ap !== bp) return ap - bp;
    return (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999);
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = await requireAdmin(req);
  if (!admin.ok) return json({ error: admin.message }, admin.status);

  try {
    const body = (await req.json()) as RequestBody;
    const mode = body.mode === "country" ? "country" : "nearby";
    const fuel = body.fuel ?? "e10";
    const radiusKm = Math.max(1, Math.min(Number(body.radiusKm ?? 30), 50));
    const countries = (body.countries ?? ["NL", "DE", "BE"]).filter(
      (country): country is CountryCode => country === "NL" || country === "DE" || country === "BE",
    );

    if (countries.length === 0) return json({ error: "Selecteer minimaal één land." }, 400);

    const warnings: string[] = [];
    const sources = new Set<string>();
    let stations: FuelStation[] = [];

    if (mode === "country") {
      const results = await Promise.allSettled(
        countries.map(async (country) => ({
          country,
          stations: await fetchAnwbCountry(country, fuel),
        })),
      );

      results.forEach((result, index) => {
        const country = countries[index];
        if (result.status === "fulfilled") {
          stations.push(...result.value.stations);
          sources.add("ANWB brandstofdata");
        } else {
          warnings.push(
            result.reason instanceof Error
              ? `${country}: ${result.reason.message}`
              : `${country}: brandstofdata kon niet worden geladen.`,
          );
        }
      });
    } else {
      const center = body.center;
      if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
        return json({ error: "Geldige kaartcoördinaten ontbreken." }, 400);
      }

      const countriesWithPrices = new Set<CountryCode>();

      const anwbResults = await Promise.allSettled(
        countries.map(async (country) => ({
          country,
          stations: (await fetchAnwbCountry(country, fuel, center)).filter(
            (station) => (station.distanceKm ?? distanceKm(center, station)) <= radiusKm,
          ),
        })),
      );

      anwbResults.forEach((result, index) => {
        const country = countries[index];
        if (result.status === "fulfilled") {
          if (result.value.stations.length > 0) {
            stations.push(...result.value.stations);
            countriesWithPrices.add(country);
            sources.add("ANWB brandstofdata");
          }
        } else {
          warnings.push(
            result.reason instanceof Error
              ? `${country}: ${result.reason.message}`
              : `${country}: brandstofdata kon niet worden geladen.`,
          );
        }
      });

      if (countries.includes("DE") && radiusKm <= 25 && Deno.env.get("TANKERKOENIG_API_KEY")) {
        try {
          const german = await fetchTankerkoning(center, radiusKm, fuel);
          if (german.stations.length > 0) {
            stations = stations.filter((station) => station.country !== "DE");
            stations.push(...german.stations);
            countriesWithPrices.add("DE");
            sources.add("Tankerkönig / MTS-K");
          }
          if (german.warning) warnings.push(german.warning);
        } catch (error) {
          warnings.push(
            error instanceof Error
              ? `Tankerkönig: ${error.message}; ANWB-resultaten blijven actief.`
              : "Tankerkönig kon niet worden geladen; ANWB-resultaten blijven actief.",
          );
        }
      }

      const countriesWithoutPrices = countries.filter((country) => !countriesWithPrices.has(country));
      if (countriesWithoutPrices.length > 0) {
        try {
          const osmStations = await fetchOsmStations(
            center,
            radiusKm,
            countries,
            countriesWithPrices,
          );
          stations.push(...osmStations);
          if (osmStations.length > 0) sources.add("OpenStreetMap");
          warnings.push(
            `Voor ${countriesWithoutPrices.join(", ")} zijn tijdelijk geen live pompprijzen beschikbaar; stations zonder prijs worden als fallback getoond.`,
          );
        } catch (error) {
          warnings.push(
            error instanceof Error ? error.message : "Tankstationlocaties konden niet worden geladen.",
          );
        }
      }
    }

    stations = sortStations(dedupe(stations)).filter(
      (station) => Number.isFinite(station.lat) && Number.isFinite(station.lng),
    );

    if (mode === "country") {
      stations = stations.slice(0, 100);
    } else {
      stations = stations.slice(0, 300);
    }

    return json({
      stations,
      warnings: [...new Set(warnings)],
      sources: [...sources],
      generatedAt: new Date().toISOString(),
      cacheMinutes: ANWB_CACHE_MS / 60000,
    });
  } catch (error) {
    console.error("[fuel-prices]", error);
    return json({ error: error instanceof Error ? error.message : "Onbekende fout." }, 500);
  }
});
