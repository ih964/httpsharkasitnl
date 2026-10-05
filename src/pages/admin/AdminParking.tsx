import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  CalendarClock,
  Car,
  CircleAlert,
  Clock3,
  ExternalLink,
  List,
  LocateFixed,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";

type LatLng = { lat: number; lng: number };
type ParkingStatus = "free" | "paid" | "permit" | "blue" | "restricted" | "unknown";
type StatusFilter = "all" | ParkingStatus;
type MobilePanelView = "filters" | "results";

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

type ParkingResponse = {
  items?: ParkingItem[];
  warnings?: string[];
  sources?: string[];
  error?: string;
};

declare global {
  interface Window {
    L?: any;
    __harkasLeafletPromise?: Promise<any>;
  }
}

const STATUS_META: Record<ParkingStatus, { label: string; marker: string; border: string }> = {
  free: { label: "Gratis", marker: "#16a34a", border: "#22c55e" },
  paid: { label: "Betaald", marker: "#dc2626", border: "#ef4444" },
  blue: { label: "Blauwe zone", marker: "#2563eb", border: "#3b82f6" },
  permit: { label: "Vergunning", marker: "#d97706", border: "#f59e0b" },
  restricted: { label: "Niet parkeren", marker: "#7f1d1d", border: "#991b1b" },
  unknown: { label: "Onbekend", marker: "#475569", border: "#64748b" },
};

const localDateTimeValue = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
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

const formatMoney = (value?: number | null) =>
  typeof value === "number"
    ? new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value)
    : null;

const maxStayLabel = (minutes?: number | null) => {
  if (!minutes) return null;
  if (minutes >= 1440 && minutes % 1440 === 0) return `max. ${minutes / 1440} dag`;
  if (minutes >= 60 && minutes % 60 === 0) return `max. ${minutes / 60} uur`;
  return `max. ${minutes} min`;
};

function ParkingMap({
  center,
  zoom,
  items,
  selectedId,
  onSelect,
}: {
  center: LatLng;
  zoom: number;
  items: ParkingItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any>(null);

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
      layersRef.current = L.layerGroup().addTo(map);
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
    const layer = layersRef.current;
    if (!L || !map || !layer) return;

    layer.clearLayers();

    items.forEach((item) => {
      const meta = STATUS_META[item.status];
      const selected = item.id === selectedId;

      if (item.geometry?.length) {
        item.geometry.forEach((ring) => {
          const polygon = L.polygon(
            ring.map((p) => [p.lat, p.lng]),
            {
              color: meta.border,
              fillColor: meta.marker,
              fillOpacity: selected ? 0.35 : 0.18,
              opacity: selected ? 1 : 0.75,
              weight: selected ? 4 : 2,
            },
          ).addTo(layer);
          polygon.on("click", () => onSelect(item.id));
        });
      } else {
        const price = formatMoney(item.pricePerHour);
        const label = item.status === "paid" && price ? `${price}/u` : meta.label;
        const icon = L.divIcon({
          className: "",
          html: `<div style="transform:translate(-50%,-100%);white-space:nowrap;background:${meta.marker};color:#fff;border:2px solid ${selected ? "#fff" : meta.border};padding:6px 9px;border-radius:12px;font:700 12px/1 system-ui;box-shadow:0 6px 20px rgba(0,0,0,.32)">${label}</div>`,
          iconSize: [1, 1],
          iconAnchor: [0, 0],
        });
        L.marker([item.lat, item.lng], { icon })
          .addTo(layer)
          .on("click", () => onSelect(item.id));
      }
    });
  }, [items, selectedId, onSelect]);

  useEffect(() => {
    if (!selectedId) return;
    const item = items.find((x) => x.id === selectedId);
    const map = mapRef.current;
    if (!item || !map) return;
    map.flyTo([item.lat, item.lng], Math.max(map.getZoom(), 15), { animate: true, duration: 0.5 });
  }, [selectedId, items]);

  return <div ref={nodeRef} className="h-full w-full bg-slate-900" aria-label="Parkeerkaart" />;
}

function ResultsList({
  items,
  selectedId,
  onSelect,
}: {
  items: ParkingItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
        Zoek een plaats of postcode om parkeerregels te laden.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const meta = STATUS_META[item.status];
        const selected = item.id === selectedId;
        const price = formatMoney(item.pricePerHour);
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-xl border p-3 text-left transition ${selected ? "border-primary bg-primary/10" : "border-border bg-background/70 hover:bg-muted/50"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white"
                    style={{ background: meta.marker }}
                  >
                    {item.statusLabel}
                  </span>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                    {item.kind === "zone" ? "zone" : "parkeerplaats"}
                  </span>
                </div>
                <p className="mt-1 truncate font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.nextChange || item.note || item.source}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {item.status === "paid" && price ? (
                  <p className="font-bold text-primary">{price}/u</p>
                ) : item.status === "free" ? (
                  <p className="font-bold text-green-400">Gratis</p>
                ) : null}
                <p className="text-[11px] text-muted-foreground">{item.distanceKm.toFixed(1)} km</p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {maxStayLabel(item.maxStayMinutes) && <span>{maxStayLabel(item.maxStayMinutes)}</span>}
              {item.dayMax != null && <span>dagmax. {formatMoney(item.dayMax)}</span>}
              {item.schedule?.[0] && <span>{item.schedule[0]}</span>}
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
                className="ml-auto inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                Route <ExternalLink className="h-3 w-3" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function FilterPanel({
  query,
  setQuery,
  radius,
  setRadius,
  atValue,
  setAtValue,
  statusFilter,
  setStatusFilter,
  loading,
  onSearch,
  onLocate,
  warnings,
  sources,
  view = "all",
  items,
  selectedId,
  onSelect,
}: {
  query: string;
  setQuery: (value: string) => void;
  radius: number;
  setRadius: (value: number) => void;
  atValue: string;
  setAtValue: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  loading: boolean;
  onSearch: () => void;
  onLocate: () => void;
  warnings: string[];
  sources: string[];
  view?: "all" | MobilePanelView;
  items: ParkingItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      {view !== "results" && (
        <div className={view === "filters" ? "min-h-0 flex-1 overflow-y-auto p-4 pb-6 sm:p-5" : "border-b border-border p-4 sm:p-5"}>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold">Parkeren</h1>
              <p className="text-xs text-muted-foreground">Gratis · betaald · vergunning · blauwe zone</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Plaats of postcode
              </label>
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSearch()}
                  placeholder="Bijv. Nieuwegein, Rotterdam..."
                />
                <Button variant="outline" size="icon" onClick={onLocate} title="Mijn locatie">
                  <LocateFixed className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Straal
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 5, 10].map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setRadius(value)}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${radius === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-muted"}`}
                  >
                    {value} km
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Wanneer
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <CalendarClock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="datetime-local"
                    value={atValue}
                    onChange={(e) => setAtValue(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={() => setAtValue(localDateTimeValue())}>
                  Nu
                </Button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Toon
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["all", "Alles"],
                  ["free", "Gratis"],
                  ["paid", "Betaald"],
                  ["blue", "Blauwe zone"],
                  ["permit", "Vergunning"],
                  ["restricted", "Niet parkeren"],
                ] as Array<[StatusFilter, string]>).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${statusFilter === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {view === "all" && (
              <Button onClick={onSearch} className="w-full" disabled={loading}>
                <Search className="h-4 w-4" />
                {loading ? "Parkeerregels laden..." : "Zoek parkeren"}
              </Button>
            )}
          </div>

          {(warnings.length > 0 || sources.length > 0) && (
            <div className="mt-4 space-y-2">
              {warnings.map((warning) => (
                <div
                  key={warning}
                  className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-100"
                >
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
      )}

      {view !== "filters" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">{items.length} resultaten</p>
            <p className="text-xs text-muted-foreground">status · afstand</p>
          </div>
          <ResultsList items={items} selectedId={selectedId} onSelect={onSelect} />
        </div>
      )}
    </div>
  );
}

export default function AdminParking() {
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState(3);
  const [atValue, setAtValue] = useState(localDateTimeValue());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [center, setCenter] = useState<LatLng>({ lat: 52.09, lng: 5.12 });
  const [zoom, setZoom] = useState(11);
  const [municipality, setMunicipality] = useState("");
  const [items, setItems] = useState<ParkingItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobilePanelView, setMobilePanelView] = useState<MobilePanelView>("filters");

  const filteredItems = useMemo(
    () => items.filter((item) => statusFilter === "all" || item.status === statusFilter),
    [items, statusFilter],
  );

  const geocode = async (value: string) => {
    const params = new URLSearchParams({
      format: "jsonv2",
      q: value,
      countrycodes: "nl",
      limit: "1",
      addressdetails: "1",
      "accept-language": "nl",
      email: "info@harkasit.nl",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
    if (!response.ok) throw new Error("Plaats zoeken is mislukt.");
    const data = await response.json();
    if (!data?.[0]) throw new Error("Plaats of postcode niet gevonden.");
    const address = data[0].address ?? {};
    const municipalityName =
      address.municipality || address.city || address.town || address.village || address.county || "";
    return {
      center: { lat: Number(data[0].lat), lng: Number(data[0].lon) },
      municipality: municipalityName,
    };
  };

  const reverseGeocode = async (origin: LatLng) => {
    const params = new URLSearchParams({
      format: "jsonv2",
      lat: String(origin.lat),
      lon: String(origin.lng),
      addressdetails: "1",
      "accept-language": "nl",
      email: "info@harkasit.nl",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
    if (!response.ok) return "";
    const data = await response.json();
    const address = data?.address ?? {};
    return address.municipality || address.city || address.town || address.village || address.county || "";
  };

  const fetchParking = useCallback(
    async (origin: LatLng, municipalityName: string) => {
      setLoading(true);
      setWarnings([]);
      setSources([]);
      setSelectedId(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("Je adminsessie is verlopen. Log opnieuw in.");

        const selectedDate = new Date(atValue);
        const response = await fetch("/api/parking", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            center: origin,
            radiusKm: radius,
            municipality: municipalityName,
            at: selectedDate.toISOString(),
          }),
        });
        const data = (await response.json()) as ParkingResponse;
        if (!response.ok) throw new Error(data.error || "Parkeerdata kon niet worden geladen.");

        setItems(data.items ?? []);
        setWarnings(data.warnings ?? []);
        setSources(data.sources ?? []);
        setMobilePanelView("results");
      } catch (error) {
        setItems([]);
        setWarnings([error instanceof Error ? error.message : "Parkeerdata kon niet worden geladen."]);
      } finally {
        setLoading(false);
      }
    },
    [atValue, radius],
  );

  const handleSearch = async () => {
    try {
      const result = query.trim()
        ? await geocode(query.trim())
        : { center, municipality: municipality || (await reverseGeocode(center)) };

      setCenter(result.center);
      setMunicipality(result.municipality);
      setZoom(radius >= 10 ? 11 : radius >= 5 ? 12 : radius >= 3 ? 13 : 14);
      await fetchParking(result.center, result.municipality);
    } catch (error) {
      setWarnings([error instanceof Error ? error.message : "Zoeken is mislukt."]);
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
        const municipalityName = await reverseGeocode(origin);
        setCenter(origin);
        setMunicipality(municipalityName);
        setQuery("");
        setZoom(14);
        await fetchParking(origin, municipalityName);
      },
      () => {
        setLoading(false);
        setWarnings(["Locatie kon niet worden opgehaald. Controleer de browsertoestemming."]);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const selectMobile = (id: string) => {
    setSelectedId(id);
    setMobileSheetOpen(false);
  };

  const panelProps = {
    query,
    setQuery,
    radius,
    setRadius,
    atValue,
    setAtValue,
    statusFilter,
    setStatusFilter,
    loading,
    onSearch: handleSearch,
    onLocate: handleLocate,
    warnings,
    sources,
    items: filteredItems,
    selectedId,
    onSelect: setSelectedId,
  };

  return (
    <div className="relative h-[calc(100svh-3.5rem)] min-h-[560px] overflow-hidden bg-background">
      <div className="grid h-full lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="relative min-h-0">
          <ParkingMap
            center={center}
            zoom={zoom}
            items={filteredItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[calc(100%-1.5rem)]">
            <div className="pointer-events-auto rounded-xl border border-white/10 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <MapPin className="h-3.5 w-3.5 text-sky-400" />
                {query || municipality || "Parkeerkaart"} · {radius} km
              </div>
            </div>
          </div>

          <div className="absolute right-3 top-3 z-[500] hidden max-w-xs rounded-xl border border-white/10 bg-slate-950/90 p-2 text-[11px] text-white shadow-xl backdrop-blur sm:block">
            <div className="flex flex-wrap gap-2">
              {(["free", "paid", "blue", "permit"] as ParkingStatus[]).map((status) => (
                <span key={status} className="inline-flex items-center gap-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: STATUS_META[status].marker }}
                  />
                  {STATUS_META[status].label}
                </span>
              ))}
            </div>
          </div>

          <div className="absolute inset-x-3 bottom-3 z-[500] lg:hidden">
            <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="h-12 rounded-2xl shadow-2xl"
                  onClick={() => {
                    setMobilePanelView("filters");
                    setMobileSheetOpen(true);
                  }}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </Button>
                <Button
                  variant="secondary"
                  className="h-12 rounded-2xl shadow-2xl"
                  onClick={() => {
                    setMobilePanelView("results");
                    setMobileSheetOpen(true);
                  }}
                >
                  <List className="h-4 w-4" />
                  Lijst
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{filteredItems.length}</span>
                </Button>
              </div>

              <SheetContent side="bottom" className="h-[88svh] max-h-[88svh] overflow-hidden rounded-t-3xl border-border p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Parkeren</SheetTitle>
                </SheetHeader>

                <div className="flex h-full min-h-0 flex-col">
                  <div className="grid grid-cols-2 gap-2 border-b border-border bg-card p-3 pr-12">
                    <button
                      type="button"
                      onClick={() => setMobilePanelView("filters")}
                      className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mobilePanelView === "filters" ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"}`}
                    >
                      Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobilePanelView("results")}
                      className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${mobilePanelView === "results" ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"}`}
                    >
                      Lijst ({filteredItems.length})
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden">
                    <FilterPanel
                      {...panelProps}
                      onSelect={selectMobile}
                      view={mobilePanelView}
                    />
                  </div>

                  {mobilePanelView === "filters" && (
                    <div className="border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                      <Button className="h-12 w-full" onClick={handleSearch} disabled={loading}>
                        <Search className="h-4 w-4" />
                        {loading ? "Parkeerregels laden..." : "Zoek parkeren"}
                      </Button>
                    </div>
                  )}
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
