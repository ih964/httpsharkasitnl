import { Check, Copy, ExternalLink, Globe, Info, LayoutDashboard, Presentation } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

const demos = [
  {
    id: "installatiebedrijf",
    title: "Installatiebedrijven",
    brand: "Veld",
    category: "Website + dashboard",
    description: "Van een eerste websitebezoek naar een aanvraag die je direct kunt opvolgen.",
    image: "/demo/veld/woning-comfort.webp",
    imageAlt: "Moderne woning uit de Veld installatiedemo",
    url: "https://www.harkasit.nl/demo/installatiebedrijf",
    dashboardUrl: "https://www.harkasit.nl/demo/installatiebedrijf/dashboard",
    features: ["Bedrijfswebsite met diensten en projecten", "Aanvraagformulier voor nieuwe klanten", "Dashboard met status, planning en notities"],
  },
  {
    id: "veranda",
    title: "Veranda Studio",
    brand: "Veranda Studio",
    category: "Showroom + configurator",
    description: "Laat klanten hun veranda samenstellen en bekijk hun aanvraag in het dashboard.",
    image: "/veranda/assets/hero.svg",
    imageAlt: "Veranda aan een woning in de Veranda Studio demo",
    url: "https://www.harkasit.nl/veranda",
    dashboardUrl: "https://www.harkasit.nl/veranda#dashboard",
    features: ["Showroom voor veranda’s en buitenleven", "Configurator met visuele prijsindicatie", "Dashboard voor aanvragen en opvolging"],
  },
];

async function copyDemoLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Demolink gekopieerd. Klaar om te delen.");
  } catch {
    toast.error("Kopiëren lukt niet. Selecteer en kopieer de link in het linkveld.");
  }
}

export default function AdminDemos() {
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <Presentation className="h-4 w-4" aria-hidden="true" />
            Harkas IT showcase
          </div>
          <h1 className="font-heading text-3xl font-bold">Demo’s</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Alles bij elkaar om aan klanten te laten zien. Open een demo, probeer het dashboard of kopieer de link om te delen.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
          {demos.length} openbare demo’s
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {demos.map((demo) => (
          <Card key={demo.id} className="flex min-w-0 flex-col overflow-hidden">
            <div className="relative aspect-[16/8] overflow-hidden bg-muted">
              <img
                src={demo.image}
                alt={demo.imageAlt}
                className="h-full w-full object-cover"
                width={1536}
                height={768}
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <p className="absolute bottom-4 left-6 font-heading text-xl font-semibold text-white">
                {demo.brand}
              </p>
            </div>
            <CardHeader>
              <Badge variant="secondary" className="mb-2 w-fit">{demo.category}</Badge>
              <h2 className="font-heading text-2xl font-semibold tracking-tight">{demo.title}</h2>
              <CardDescription className="leading-relaxed">{demo.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <ul className="space-y-2.5 text-sm">
                {demo.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild>
                    <a href={demo.url} target="_blank" rel="noopener noreferrer" aria-label={demo.title + " demo openen in een nieuw tabblad"}>
                      <ExternalLink aria-hidden="true" />
                      Demo openen
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={demo.dashboardUrl} target="_blank" rel="noopener noreferrer" aria-label={demo.title + " dashboard openen in een nieuw tabblad"}>
                      <LayoutDashboard aria-hidden="true" />
                      Dashboard
                    </a>
                  </Button>
                </div>

                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <label htmlFor={demo.id + "-url"} className="text-xs font-medium text-muted-foreground">
                    Openbare link · geen account nodig
                  </label>
                  <input
                    id={demo.id + "-url"}
                    type="text"
                    readOnly
                    value={demo.url}
                    onFocus={(event) => event.currentTarget.select()}
                    onClick={(event) => event.currentTarget.select()}
                    className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void copyDemoLink(demo.url)}
                    aria-label={"Link van " + demo.title + " kopiëren"}
                  >
                    <Copy aria-hidden="true" />
                    Link kopiëren
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p>
          <strong className="font-medium text-foreground">Vrij om te proberen.</strong>{" "}
          Beide demo’s werken zonder login. Gebruik fictieve gegevens: aanvragen, statussen en notities blijven alleen in de browser waarin je test. Er worden geen echte aanvragen of e-mails verstuurd.
        </p>
      </div>
    </div>
  );
}
