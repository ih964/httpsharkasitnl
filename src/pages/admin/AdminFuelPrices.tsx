import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  CircleAlert,
  Clock3,
  ExternalLink,
  Fuel,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
} from "lucide-react";

type FuelType = "e10" | "e5" | "diesel" | "lpg";
type CountryCode = "NL" | "DE" | "BE";
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

type FuelResponse = {
  stations?: FuelStation[];
  warnings?: string[];
  sources?: string[];
};

declare global {
  interface Window {
    L?: any;
    __harkasLeafletPromise?: Promise<any>;
  }
}

const countryCenters: Record<CountryCode, { center: LatLng; zoom: number; label: string }> = {
  NL: { center: { lat: 52.1326, lng: 5.2913 }, zoom: 7, label: "Nederland" },
  DE: { center: { lat: 51.1657, lng: 10.4515 }, zoom: 6, label: "Duitsland" },
  BE: { center: { lat: 50.5039, lng: 4.4699 }, zoom: 7, label: "België" },
};

const fuelLabels: Record<FuelType, string> = {
  e10: "Euro 95 / E10",
  e5: "Euro 98 / E5",
  diesel: "Diesel",
  lpg: "LPG",
};

const loadLeaflet = () => {
  if (window.L) return Promise.resolve(window.L);
  if (window.__harkasLeafletPromise) return window.__harkasLeafletPromise;

  window.__harkasLeafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-harkas-leaflet="true"]')) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      css.dataset.harkasLeaflet = "true";
      document.head.appendChild(css);
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-harkas-leaflet="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.dataset.harkasLeaflet = "true";
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });

  return window.__harkasLeafletPromise;
};

const formatPrice = (price?: number | null) =>
  typeof price === "number"
    ? new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(price)
    : null;

const distanceBetweenKm = (a: LatLng, b: LatLng) => {
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

function FuelMap({
  center,
  zoom,
  radiusKm,
  priceOrder,
  stations,
  selectedId,
  onSelect,
  onViewportCenter,
}: {
  center: LatLng;
  zoom: number;
  radiusKm: number;
  priceOrder: PriceOrder;
  stations: FuelStation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onViewportCenter: (center: LatLng) => void;
}) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !nodeRef.current || mapRef.current) return;

      const map = L.map(nodeRef.current, { zoomControl: false }).setView([center.lat, center.lng], zoom);
      L.control.zoom({ position: "bottomleft" }).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      map.on("moveend", () => {
        const c = map.getCenter();
        onViewportCenter({ lat: c.lat, lng: c.lng });
      });
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], zoom);
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    if (circleRef.current) circleRef.current.remove();
    if (radiusKm <= 0) {
      circleRef.current = null;
      return;
    }
    circleRef.current = L.circle([center.lat, center.lng], {
      radius: radiusKm * 1000,
      color: "#0ea5e9",
      fillColor: "#0ea5e9",
      fillOpacity: 0.05,
      weight: 1,
      dashArray: "6 8",
    }).addTo(map);
  }, [center.lat, center.lng, radiusKm]);

  useEffect(() => {
    if (!selectedId) return;
    const map = mapRef.current;
    if (!map) return;

    const station = stations.find((item) => item.id === selectedId);
    if (!station) return;

    const targetZoom = Math.max(map.getZoom(), 15);
    map.flyTo([station.lat, station.lng], targetZoom, {
      animate: true,
      duration: 0.55,
    });
  }, [selectedId, stations]);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    const layer = markersRef.current;
    if (!L || !map || !layer) return;

    layer.clearLayers();
    stations.forEach((station, index) => {
      const price = formatPrice(station.price);
      const selected = station.id === selectedId;
      const priced = price !== null;
      const bg = selected ? "#0284c7" : priced ? "#111827" : "#334155";
      const border =
        index === 0 && priced
          ? priceOrder === "cheapest"
            ? "#22c55e"
            : "#ef4444"
          : "#ffffff";
      const label = priced ? `€${price}` : "Pomp";

      const icon = L.divIcon({
        className: "",
        html: `<div style="transform:translate(-50%,-100%);white-space:nowrap;background:${bg};color:#fff;border:2px solid ${border};padding:6px 9px;border-radius:12px;font:700 12px/1 system-ui;box-shadow:0 6px 20px rgba(0,0,0,.35)">${label}</div>`,
        iconSize: [1, 1],
        iconAnchor: [0, 0],
      });

      L.marker([station.lat, station.lng], { icon })
        .addTo(layer)
        .on("click", () => onSelect(station.id));
    });
  }, [stations, selectedId, onSelect, priceOrder]);

  return <div ref={nodeRef} className="h-full w-full bg-slate-900" aria-label="Kaart met tankstations" />;
}

const normalizeOsmStation = (element: any, origin: LatLng): FuelStation | null => {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const tags = element.tags ?? {};
  const country = String(tags["addr:country"] ?? "").toUpperCase() as CountryCode;

  return {
    id: `osm-${element.type}-${element.id}`,
    name: tags.name || tags.brand || "Tankstation",
    brand: tags.brand || null,
    address: [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ") || null,
    city: tags["addr:city"] || tags["addr:place"] || null,
    country: ["NL", "DE", "BE"].includes(country) ? country : null,
    lat,
    lng,
    distanceKm: distanceBetweenKm(origin, { lat, lng }),
    price: null,
    source: "OpenStreetMap",
  };
};

const fetchOsmStations = async (center: LatLng, radiusKm: number, countries: CountryCode[]) => {
  const query = `[out:json][timeout:20];nwr["amenity"="fuel"](around:${Math.round(radiusKm * 1000)},${center.lat},${center.lng});out center tags;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: query }),
  });
  if (!response.ok) throw new Error("Tankstationlocaties konden niet worden opgehaald.");
  const data = await response.json();
  return (data.elements ?? [])
    .map((element: any) => normalizeOsmStation(element, center))
    .filter((station: FuelStation | null): station is FuelStation => station !== null)
    .filter((station) => !station.country || countries.includes(station.country))
    .sort((a: FuelStation, b: FuelStation) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
};

function FilterPanel({
  mode,
  setMode,
  fuel,
  setFuel,
  priceOrder,
  setPriceOrder,
  query,
  setQuery,
  radius,
  setRadius,
  unlimited,
  setUnlimited,
  countries,
  toggleCountry,
  countryModeCountry,
  setCountryModeCountry,
  loading,
  onSearch,
  onLocate,
  stations,
  selectedId,
  setSelectedId,
  warnings,
  sources,
}: {
  mode: SearchMode;
  setMode: (mode: SearchMode) => void;
  fuel: FuelType;
  setFuel: (fuel: FuelType) => void;
  priceOrder: PriceOrder;
  setPriceOrder: (order: PriceOrder) => void;
  query: string;
  setQuery: (value: string) => void;
  radius: number;
  setRadius: (radius: number) => void;
  unlimited: boolean;
  setUnlimited: (value: boolean) => void;
  countries: CountryCode[];
  toggleCountry: (country: CountryCode) => void;
  countryModeCountry: CountryCode;
  setCountryModeCountry: (country: CountryCode) => void;
  loading: boolean;
  onSearch: () => void;
  onLocate: () => void;
  stations: FuelStation[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  warnings: string[];
  sources: string[];
}) {
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Fuel className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold">Tankprijzen</h1>
            <p className="text-xs text-muted-foreground">Nederland · Duitsland · België</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-xl bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("nearby");
              setUnlimited(false);
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "nearby" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            Rond plaats
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("country");
              setUnlimited(false);
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "country" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            Heel land
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brandstof</label>
            <Select value={fuel} onValueChange={(value) => setFuel(value as FuelType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(fuelLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prijs</label>
            <div className="grid grid-cols-2 gap-2">
              {(["cheapest", "expensive"] as PriceOrder[]).map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setPriceOrder(value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${priceOrder === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  {value === "cheapest" ? "Goedkoopste" : "Duurste"}
                </button>
              ))}
            </div>
          </div>

          {mode === "nearby" ? (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plaats of postcode</label>
                <div className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && onSearch()}
                    placeholder={unlimited ? "Niet nodig bij onbeperkt" : "Bijv. Venlo, 4101..."}
                    disabled={unlimited}
                  />
                  <Button variant="outline" size="icon" onClick={onLocate} title="Mijn locatie" disabled={unlimited}>
                    <LocateFixed className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Straal</label>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 20, 30, 50].map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => {
                        setUnlimited(false);
                        setRadius(value);
                      }}
                      className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${!unlimited && radius === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-muted"}`}
                    >
                      {value} km
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setUnlimited(true)}
                    className={`col-span-2 rounded-lg border px-2 py-2 text-sm font-medium transition ${unlimited ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-muted"}`}
                  >
                    Onbeperkt
                  </button>
                </div>
                {unlimited && (
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Zoekt per geselecteerd land naar de {priceOrder === "cheapest" ? "goedkoopste" : "duurste"} tankstationprijs. DE ondersteunt E5, E10 en Diesel; LPG niet.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Landen</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["NL", "DE", "BE"] as CountryCode[]).map((country) => (
                    <button
                      type="button"
                      key={country}
                      onClick={() => toggleCountry(country)}
                      className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${countries.includes(country) ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Land</label>
              <Select value={countryModeCountry} onValueChange={(value) => setCountryModeCountry(value as CountryCode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NL">Nederland</SelectItem>
                  <SelectItem value="DE">Duitsland</SelectItem>
                  <SelectItem value="BE">België</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={onSearch} className="w-full" disabled={loading || (mode === "nearby" && countries.length === 0)}>
            <Search className="h-4 w-4" />
            {loading
              ? "Zoeken..."
              : mode === "nearby"
                ? unlimited
                  ? `Zoek ${priceOrder === "cheapest" ? "goedkoopste" : "duurste"} per land`
                  : `Zoek ${priceOrder === "cheapest" ? "goedkoopste" : "duurste"}`
                : `Zoek ${priceOrder === "cheapest" ? "goedkoopste" : "duurste"} van land`}
          </Button>
        </div>

        {(warnings.length > 0 || sources.length > 0) && (
          <div className="mt-4 space-y-2">
            {warnings.map((warning) => (
              <div key={warning} className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-100">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
            {sources.length > 0 && (
              <p className="text-[11px] text-muted-foreground">Bronnen: {sources.join(" · ")}</p>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">{stations.length} tankstations</p>
          <p className="text-xs text-muted-foreground">Prijs · afstand</p>
        </div>

        {stations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            Zoek op plaats, postcode of huidige locatie.
          </div>
        ) : (
          <div className="space-y-2">
            {stations.map((station, index) => {
              const price = formatPrice(station.price);
              const selected = selectedId === station.id;
              return (
                <button
                  type="button"
                  key={station.id}
                  onClick={() => setSelectedId(station.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${selected ? "border-primary bg-primary/10" : "border-border bg-background/70 hover:bg-muted/50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {unlimited && price && station.country ? (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${priceOrder === "cheapest" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                            {priceOrder === "cheapest" ? "Goedkoopste" : "Duurste"} {station.country}
                          </span>
                        ) : (
                          index === 0 && price && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${priceOrder === "cheapest" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                              {priceOrder === "cheapest" ? "Goedkoopste" : "Duurste"}
                            </span>
                          )
                        )}
                        {station.country && <span className="text-[10px] font-bold text-muted-foreground">{station.country}</span>}
                      </div>
                      <p className="mt-1 truncate font-semibold">{station.brand || station.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[station.address, station.city].filter(Boolean).join(", ") || "Adres onbekend"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-lg font-bold ${price ? "text-primary" : "text-muted-foreground"}`}>
                        {price ? `€ ${price}` : "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {typeof station.distanceKm === "number" ? `${station.distanceKm.toFixed(1)} km` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {station.updatedAt ? new Date(station.updatedAt).toLocaleString("nl-NL") : station.source || "Geen live prijsbron"}
                    </span>
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`, "_blank", "noopener,noreferrer");
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      Route <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminFuelPrices() {
  const [mode, setMode] = useState<SearchMode>("nearby");
  const [fuel, setFuel] = useState<FuelType>("e10");
  const [priceOrder, setPriceOrder] = useState<PriceOrder>("cheapest");
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState(30);
  const [unlimited, setUnlimited] = useState(false);
  const [countries, setCountries] = useState<CountryCode[]>(["NL", "DE", "BE"]);
  const [countryModeCountry, setCountryModeCountry] = useState<CountryCode>("NL");
  const [center, setCenter] = useState<LatLng>(countryCenters.NL.center);
  const [zoom, setZoom] = useState(7);
  const [viewportCenter, setViewportCenter] = useState<LatLng>(countryCenters.NL.center);
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const sortedStations = useMemo(
    () =>
      [...stations].sort((a, b) => {
        const missing = priceOrder === "cheapest" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        const ap = typeof a.price === "number" ? a.price : missing;
        const bp = typeof b.price === "number" ? b.price : missing;
        if (ap !== bp) return priceOrder === "cheapest" ? ap - bp : bp - ap;
        return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
      }),
    [stations, priceOrder],
  );

  const toggleCountry = (country: CountryCode) => {
    setCountries((current) =>
      current.includes(country) ? current.filter((item) => item !== country) : [...current, country],
    );
  };

  const geocode = async (value: string): Promise<LatLng> => {
    const params = new URLSearchParams({
      format: "jsonv2",
      q: value,
      countrycodes: "nl,de,be",
      limit: "1",
      "accept-language": "nl",
      email: "info@harkasit.nl",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    if (!response.ok) throw new Error("Plaats zoeken is mislukt.");
    const data = await response.json();
    if (!data?.[0]) throw new Error("Plaats of postcode niet gevonden.");
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  };

  const requestStations = useCallback(async (
    origin: LatLng,
    requestedMode: SearchMode = mode,
    requestedCountries?: CountryCode[],
    bestPerCountry = false,
  ) => {
    setLoading(true);
    setWarnings([]);
    setSources([]);
    setSelectedId(null);

    try {
      const requestCountries =
        requestedCountries ?? (requestedMode === "country" ? [countryModeCountry] : countries);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Je adminsessie is verlopen. Log opnieuw in.");

      const response = await fetch("/api/fuel-prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          mode: requestedMode,
          center: origin,
          radiusKm: radius,
          fuel,
          countries: requestCountries,
          bestPerCountry,
          order: priceOrder,
        }),
      });

      const rawBody = await response.text();
      let data: FuelResponse & { error?: string };
      try {
        data = JSON.parse(rawBody) as FuelResponse & { error?: string };
      } catch {
        throw new Error(`Prijsservice gaf geen JSON terug (HTTP ${response.status}). Controleer de API-route/deployment.`);
      }
      if (!response.ok) throw new Error(data.error || `Tankprijzen konden niet worden geladen (HTTP ${response.status}).`);

      const nextStations = data?.stations ?? [];
      setStations(nextStations);
      setWarnings(data?.warnings ?? []);
      setSources(data?.sources ?? []);
    } catch (error) {
      if (requestedMode === "country") {
        setStations([]);
        setWarnings([error instanceof Error ? error.message : "Landelijk zoeken kon niet worden geladen."]);
      } else {
        try {
          const fallback = await fetchOsmStations(origin, radius, countries);
          setStations(fallback);
          const reason = error instanceof Error ? error.message : "Onbekende fout in de live prijsservice.";
          setWarnings([
            `Live prijsservice fout: ${reason}`,
            "Tankstationlocaties worden tijdelijk via OpenStreetMap getoond; prijzen blijven leeg.",
          ]);
          setSources(["OpenStreetMap"]);
        } catch {
          setStations([]);
          setWarnings([error instanceof Error ? error.message : "Tankprijzen konden niet worden geladen."]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [mode, countryModeCountry, countries, radius, fuel, priceOrder]);

  const handleSearch = async () => {
    if (mode === "country") {
      const preset = countryCenters[countryModeCountry];
      setCenter(preset.center);
      setViewportCenter(preset.center);
      setZoom(preset.zoom);
      await requestStations(preset.center, "country");
      return;
    }

    if (unlimited) {
      if (countries.length === 0) {
        setWarnings(["Selecteer minimaal één land."]);
        return;
      }

      const selectedCenter =
        countries.length === 1
          ? countryCenters[countries[0]].center
          : { lat: 51.4, lng: 8.2 };
      const selectedZoom = countries.length === 1 ? countryCenters[countries[0]].zoom : 5;

      setCenter(selectedCenter);
      setViewportCenter(selectedCenter);
      setZoom(selectedZoom);
      await requestStations(selectedCenter, "country", countries, true);
      return;
    }

    try {
      setLoading(true);
      const origin = query.trim() ? await geocode(query.trim()) : center;
      setCenter(origin);
      setViewportCenter(origin);
      setZoom(radius >= 50 ? 9 : radius >= 30 ? 10 : 11);
      await requestStations(origin, "nearby");
    } catch (error) {
      setWarnings([error instanceof Error ? error.message : "Zoeken is mislukt."]);
      setLoading(false);
    }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setWarnings(["Locatiebepaling wordt niet ondersteund door deze browser."]);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const origin = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCenter(origin);
        setViewportCenter(origin);
        setQuery("");
        setZoom(radius >= 50 ? 9 : radius >= 30 ? 10 : 11);
        await requestStations(origin, "nearby");
      },
      () => {
        setLoading(false);
        setWarnings(["Locatie kon niet worden opgehaald. Controleer de browsertoestemming."]);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  useEffect(() => {
    if (mode === "country") {
      const preset = countryCenters[countryModeCountry];
      setCenter(preset.center);
      setViewportCenter(preset.center);
      setZoom(preset.zoom);
    }
  }, [mode, countryModeCountry]);

  const moved = distanceBetweenKm(center, viewportCenter) > 2;

  const panelProps = {
    mode,
    setMode,
    fuel,
    setFuel,
    priceOrder,
    setPriceOrder,
    query,
    setQuery,
    radius,
    setRadius,
    unlimited,
    setUnlimited,
    countries,
    toggleCountry,
    countryModeCountry,
    setCountryModeCountry,
    loading,
    onSearch: handleSearch,
    onLocate: handleLocate,
    stations: sortedStations,
    selectedId,
    setSelectedId,
    warnings,
    sources,
  };

  return (
    <div className="relative h-[calc(100svh-3.5rem)] min-h-[560px] overflow-hidden bg-background">
      <div className="grid h-full lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="relative min-h-0">
          <FuelMap
            center={center}
            zoom={zoom}
            radiusKm={mode === "nearby" && !unlimited ? radius : 0}
            priceOrder={priceOrder}
            stations={sortedStations}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onViewportCenter={setViewportCenter}
          />

          <div className="pointer-events-none absolute left-3 top-3 z-[500] flex max-w-[calc(100%-1.5rem)] items-center gap-2">
            <div className="pointer-events-auto rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <MapPin className="h-3.5 w-3.5 text-sky-400" />
                {mode === "country"
                  ? countryCenters[countryModeCountry].label
                  : unlimited
                    ? `Onbeperkt · ${countries.join(" / ")} · ${fuelLabels[fuel]} · ${priceOrder === "cheapest" ? "goedkoopste" : "duurste"}`
                    : `${radius} km · ${fuelLabels[fuel]} · ${priceOrder === "cheapest" ? "goedkoopste" : "duurste"}`}
              </div>
            </div>
          </div>

          {moved && mode === "nearby" && !unlimited && (
            <div className="absolute left-1/2 top-3 z-[500] hidden -translate-x-1/2 lg:block">
              <Button
                size="sm"
                variant="secondary"
                className="shadow-xl"
                onClick={() => {
                  setCenter(viewportCenter);
                  requestStations(viewportCenter, "nearby");
                }}
              >
                <Navigation className="h-4 w-4" />
                Zoek in dit kaartgebied
              </Button>
            </div>
          )}

          <div className="absolute inset-x-3 bottom-3 z-[500] lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button className="h-12 w-full justify-between rounded-2xl shadow-2xl">
                  <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filters & resultaten</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{sortedStations.length}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[84svh] overflow-hidden rounded-t-3xl border-border p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Tankprijzen zoeken</SheetTitle>
                </SheetHeader>
                <div className="h-[82svh]">
                  <FilterPanel {...panelProps} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <aside className="hidden min-h-0 border-l border-border lg:block">
          <FilterPanel {...panelProps} />
        </aside>
      </div>
    </div>
  );
}
