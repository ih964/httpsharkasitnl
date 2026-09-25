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

const normalizeCountry = (value: unknown): CountryCode | null => {
  const code = String(value ?? "").toUpperCase();
  return code === "NL" || code === "DE" || code === "BE" ? code : null;
};

const normalizeExternalStation = (
  raw: Record<string, unknown>,
  country: CountryCode,
  origin?: LatLng,
  source = "Externe prijsfeed",
): FuelStation | null => {
  const lat = Number(raw.lat ?? raw.latitude);
  const lng = Number(raw.lng ?? raw.lon ?? raw.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const position = { lat, lng };
  const priceValue = raw.price == null ? null : Number(raw.price);

  return {
    id: String(raw.id ?? `${country}-${lat}-${lng}`),
    name: String(raw.name ?? raw.brand ?? "Tankstation"),
    brand: raw.brand ? String(raw.brand) : null,
    address: raw.address ? String(raw.address) : null,
    city: raw.city ? String(raw.city) : null,
    country: normalizeCountry(raw.country) ?? country,
    lat,
    lng,
    price: Number.isFinite(priceValue) ? priceValue : null,
    distanceKm: origin ? distanceKm(origin, position) : null,
    isOpen: typeof raw.isOpen === "boolean" ? raw.isOpen : null,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
    source: raw.source ? String(raw.source) : source,
  };
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

async function fetchConfiguredFeed(
  country: CountryCode,
  fuel: FuelType,
  origin?: LatLng,
): Promise<FuelStation[] | null> {
  const url = Deno.env.get(`FUEL_FEED_URL_${country}`);
  if (!url) return null;

  const token = Deno.env.get(`FUEL_FEED_TOKEN_${country}`);
  const endpoint = new URL(url);
  endpoint.searchParams.set("fuel", fuel);

  const response = await fetch(endpoint, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error(`${country}-prijsfeed gaf HTTP ${response.status}`);

  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload?.stations;
  if (!Array.isArray(rows)) throw new Error(`${country}-prijsfeed heeft een onbekend formaat`);

  return rows
    .map((row: Record<string, unknown>) => normalizeExternalStation(row, country, origin, `${country} live prijsfeed`))
    .filter(Boolean) as FuelStation[];
}

async function fetchTankerkoning(
  center: LatLng,
  radiusKm: number,
  fuel: FuelType,
): Promise<{ stations: FuelStation[]; warning?: string }> {
  const apiKey = Deno.env.get("TANKERKOENIG_API_KEY");
  if (!apiKey) return { stations: [], warning: "Duitse live prijzen zijn klaar voor Tankerkönig, maar de API-key is nog niet als Supabase secret ingesteld." };
  if (fuel === "lpg") return { stations: [], warning: "Tankerkönig levert via deze API geen LPG-prijzen." };

  const effectiveRadius = Math.min(radiusKm, 25);
  const params = new URLSearchParams({
    lat: String(center.lat),
    lng: String(center.lng),
    rad: String(effectiveRadius),
    sort: "price",
    type: fuel,
    apikey: apiKey,
  });

  const response = await fetch(`https://creativecommons.tankerkoenig.de/json/list.php?${params.toString()}`);
  if (!response.ok) throw new Error(`Tankerkönig gaf HTTP ${response.status}`);
  const payload = await response.json();

  if (!payload?.ok) throw new Error(payload?.message || "Tankerkönig gaf een foutmelding.");

  const stations: FuelStation[] = (payload.stations ?? []).map((station: Record<string, unknown>) => ({
    id: `tk-${String(station.id)}`,
    name: String(station.name ?? station.brand ?? "Tankstation"),
    brand: station.brand ? String(station.brand) : null,
    address: [station.street, station.houseNumber].filter(Boolean).map(String).join(" ") || null,
    city: station.place ? String(station.place) : null,
    country: "DE",
    lat: Number(station.lat),
    lng: Number(station.lng),
    price: typeof station.price === "number" ? station.price : null,
    distanceKm: typeof station.dist === "number" ? station.dist : distanceKm(center, { lat: Number(station.lat), lng: Number(station.lng) }),
    isOpen: typeof station.isOpen === "boolean" ? station.isOpen : null,
    updatedAt: new Date().toISOString(),
    source: "Tankerkönig / MTS-K",
  }));

  return {
    stations,
    warning: radiusKm > 25 ? "De vrije Tankerkönig-API ondersteunt maximaal 25 km per live zoekopdracht; Duitse resultaten zijn daarom binnen 25 km." : undefined,
  };
}

async function fetchOsmStations(
  center: LatLng,
  radiusKm: number,
  countries: CountryCode[],
  excludedCountries: Set<CountryCode>,
): Promise<FuelStation[]> {
  const query = `[out:json][timeout:20];nwr["amenity"="fuel"](around:${Math.round(radiusKm * 1000)},${center.lat},${center.lng});out center tags;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "HarkasIT-FuelPrices/1.0 (+https://harkasit.nl; contact: info@harkasit.nl)",
    },
    body: new URLSearchParams({ data: query }),
  });

  if (!response.ok) throw new Error(`OpenStreetMap/Overpass gaf HTTP ${response.status}`);
  const payload = await response.json();

  return (payload.elements ?? [])
    .map((element: Record<string, any>) => {
      const lat = Number(element.lat ?? element.center?.lat);
      const lng = Number(element.lon ?? element.center?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const tags = element.tags ?? {};
      const country = normalizeCountry(tags["addr:country"]);
      if (country && (!countries.includes(country) || excludedCountries.has(country))) return null;

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
    .filter(Boolean) as FuelStation[];
}

function dedupe(stations: FuelStation[]) {
  const kept: FuelStation[] = [];
  for (const station of stations) {
    const duplicate = kept.some((other) => distanceKm(station, other) < 0.08);
    if (!duplicate) kept.push(station);
  }
  return kept;
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
    const countries = (body.countries ?? ["NL", "DE", "BE"]).filter((country): country is CountryCode =>
      country === "NL" || country === "DE" || country === "BE"
    );

    if (countries.length === 0) return json({ error: "Selecteer minimaal één land." }, 400);

    const warnings: string[] = [];
    const sources = new Set<string>();
    let stations: FuelStation[] = [];

    if (mode === "country") {
      for (const country of countries) {
        try {
          const feed = await fetchConfiguredFeed(country, fuel);
          if (feed) {
            stations.push(...feed);
            sources.add(`${country} live prijsfeed`);
          } else if (country === "DE") {
            warnings.push("Heel Duitsland doorzoeken kan niet via de vrije Tankerkönig-omtrek-API. Koppel een landelijke feed via FUEL_FEED_URL_DE.");
          } else {
            warnings.push(`Voor ${country} is nog geen landelijke live prijsfeed ingesteld (FUEL_FEED_URL_${country}).`);
          }
        } catch (error) {
          warnings.push(error instanceof Error ? error.message : `${country}-prijsfeed kon niet worden geladen.`);
        }
      }
    } else {
      const center = body.center;
      if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
        return json({ error: "Geldige kaartcoördinaten ontbreken." }, 400);
      }

      const countriesWithPricedFeed = new Set<CountryCode>();

      for (const country of countries) {
        try {
          const feed = await fetchConfiguredFeed(country, fuel, center);
          if (feed) {
            const nearby = feed.filter((station) => (station.distanceKm ?? distanceKm(center, station)) <= radiusKm);
            stations.push(...nearby);
            countriesWithPricedFeed.add(country);
            sources.add(`${country} live prijsfeed`);
          }
        } catch (error) {
          warnings.push(error instanceof Error ? error.message : `${country}-prijsfeed kon niet worden geladen.`);
        }
      }

      if (countries.includes("DE") && !countriesWithPricedFeed.has("DE")) {
        try {
          const german = await fetchTankerkoning(center, radiusKm, fuel);
          if (german.stations.length > 0) {
            stations.push(...german.stations);
            countriesWithPricedFeed.add("DE");
            sources.add("Tankerkönig / MTS-K");
          }
          if (german.warning) warnings.push(german.warning);
        } catch (error) {
          warnings.push(error instanceof Error ? error.message : "Duitse prijsfeed kon niet worden geladen.");
        }
      }

      const countriesWithoutPricedFeed = countries.filter((country) => !countriesWithPricedFeed.has(country));
      if (countriesWithoutPricedFeed.length > 0) {
        try {
          const osmStations = await fetchOsmStations(center, radiusKm, countries, countriesWithPricedFeed);
          stations.push(...osmStations);
          sources.add("OpenStreetMap");
          warnings.push(
            `Voor ${countriesWithoutPricedFeed.join(", ")} worden tankstationlocaties getoond, maar er is nog geen live pompprijsfeed gekoppeld.`,
          );
        } catch (error) {
          warnings.push(error instanceof Error ? error.message : "Tankstationlocaties konden niet worden geladen.");
        }
      }
    }

    stations = dedupe(stations)
      .filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng))
      .sort((a, b) => {
        const ap = typeof a.price === "number" ? a.price : Number.POSITIVE_INFINITY;
        const bp = typeof b.price === "number" ? b.price : Number.POSITIVE_INFINITY;
        if (ap !== bp) return ap - bp;
        return (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999);
      });

    return json({
      stations,
      warnings: [...new Set(warnings)],
      sources: [...sources],
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[fuel-prices]", error);
    return json({ error: error instanceof Error ? error.message : "Onbekende fout." }, 500);
  }
});
