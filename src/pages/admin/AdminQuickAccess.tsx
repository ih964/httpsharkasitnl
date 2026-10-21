import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe,
  Headphones,
  Inbox,
  Loader2,
  Mail,
  Server,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const PLESK_ORIGIN = "https://shared70.cloud86-host.nl:8443";
const PLESK_HOME = PLESK_ORIGIN + "/smb/web/view";

const mailboxes = [
  {
    label: "Algemene mailbox",
    email: "info@harkasit.nl",
    description: "Klantvragen, aanvragen en algemene correspondentie.",
    url: "https://webmail.harkasit.nl/roundcube/index.php?_user=info%40harkasit.nl",
    icon: Inbox,
  },
  {
    label: "Administratie",
    email: "administratie@harkasit.nl",
    description: "Facturen, betalingen, leveranciers en boekhouding.",
    url: "https://webmail.harkasit.nl/roundcube/index.php?_user=administratie%40harkasit.nl",
    icon: FileText,
  },
  {
    label: "Servicedesk",
    email: "support@harkasit.nl",
    description: "Binnenkomende meldingen en reacties op supporttickets.",
    url: "https://webmail.harkasit.nl/roundcube/index.php?_user=support%40harkasit.nl",
    icon: Headphones,
  },
] as const;

const pleskLinks = [
  {
    label: "Mailadressen beheren",
    description: "Mailboxen, aliassen en mailinstellingen",
    url: PLESK_ORIGIN + "/smb/email-address/list/domainId/191",
    icon: Mail,
  },
  {
    label: "Websites & domeinen",
    description: "Hosting en domeininstellingen",
    url: PLESK_HOME,
    icon: Globe,
  },
  {
    label: "Bestandsbeheer",
    description: "Bestanden op de hostingomgeving",
    url: PLESK_ORIGIN + "/smb/file-manager",
    icon: FolderOpen,
  },
  {
    label: "WordPress",
    description: "WordPress Toolkit van Plesk",
    url: PLESK_ORIGIN + "/modules/wp-toolkit/index.php/domain/index?context=extNavButton_wp_toolkit_1",
    icon: Server,
  },
] as const;

type SsoStatus = "loading" | "configured" | "not-configured" | "unavailable";

const AdminQuickAccess = () => {
  const { session } = useAuth();
  const [ssoStatus, setSsoStatus] = useState<SsoStatus>("loading");
  const [openingPlesk, setOpeningPlesk] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    const controller = new AbortController();
    fetch("/api/plesk-sso", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Status niet beschikbaar");
        const body = await response.json();
        setSsoStatus(body.configured ? "configured" : "not-configured");
      })
      .catch(() => {
        if (!controller.signal.aborted) setSsoStatus("unavailable");
      });
    return () => controller.abort();
  }, [session?.access_token]);

  const openPlesk = async () => {
    if (ssoStatus !== "configured" || !session?.access_token) {
      window.open(PLESK_HOME, "_blank", "noopener,noreferrer");
      return;
    }

    // Open on the click before awaiting the network to avoid popup blockers.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setOpeningPlesk(true);

    try {
      const response = await fetch("/api/plesk-sso", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.url !== "string") {
        throw new Error(body.error || "Plesk-aanmelding niet beschikbaar.");
      }

      const target = new URL(body.url);
      if (
        target.origin !== PLESK_ORIGIN ||
        target.pathname !== "/enterprise/rsession_init.php"
      ) {
        throw new Error("Plesk gaf een ongeldige bestemming terug.");
      }
      if (tab) tab.location.replace(target.toString());
      else window.location.assign(target.toString());
    } catch {
      if (tab) tab.location.replace(PLESK_HOME);
      else window.open(PLESK_HOME, "_blank", "noopener,noreferrer");
      toast.warning("Automatische aanmelding is niet gelukt. Open Plesk met je bestaande sessie.");
    } finally {
      setOpeningPlesk(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div>
        <h1 className="text-3xl font-heading font-bold">Mail & Hosting</h1>
        <p className="mt-2 text-muted-foreground">
          Direct naar de Harkas IT-mailboxen en Cloud86/Plesk, vanuit één beveiligde plek.
        </p>
      </div>

      <section aria-labelledby="mailboxes-title" className="space-y-4">
        <h2 id="mailboxes-title" className="text-xl font-semibold">Mailboxen</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {mailboxes.map((mailbox) => (
            <Card key={mailbox.email} className="flex flex-col">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <mailbox.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{mailbox.label}</CardTitle>
                <CardDescription className="break-all font-medium text-foreground">
                  {mailbox.email}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <p className="min-h-10 text-sm text-muted-foreground">{mailbox.description}</p>
                <Button asChild className="w-full">
                  <a href={mailbox.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open webmail
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="hosting-title" className="space-y-4">
        <h2 id="hosting-title" className="text-xl font-semibold">Hostingbeheer</h2>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Server className="h-5 w-5 text-primary" /> Plesk — Cloud86
                </CardTitle>
                <CardDescription className="mt-2">
                  shared70.cloud86-host.nl · Websites, e-mail, bestanden en WordPress.
                </CardDescription>
              </div>
              {ssoStatus === "configured" && (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-label="SSO ingesteld" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void openPlesk()} disabled={openingPlesk}>
                {openingPlesk
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <ExternalLink className="mr-2 h-4 w-4" />}
                {ssoStatus === "configured" ? "Plesk openen met automatische aanmelding" : "Plesk openen"}
              </Button>
              <Button variant="outline" asChild>
                <a
                  href="https://my.cloud86.io/clientarea.php?action=productdetails&id=16509"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> Plesk via Mijn Cloud86
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {ssoStatus === "configured"
                ? "Automatisch aanmelden gebruikt een eenmalig Plesk-sessietoken. Je wachtwoord wordt niet naar de browser gestuurd."
                : ssoStatus === "loading"
                  ? "Plesk-koppeling wordt gecontroleerd..."
                  : "Een bestaande Plesk-sessie wordt hergebruikt. Voor volledig automatisch aanmelden is een toegestane Plesk API-koppeling nodig."}
            </p>
            <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
              {pleskLinks.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <item.icon className="h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{item.description}</span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              ))}
              <a
                href="https://my.cloud86.io/clientarea.php?action=productdetails&id=16509"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Globe className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Mijn Cloud86</span>
                  <span className="block text-xs text-muted-foreground">Harkas IT-hostingpakket en Plesk-aanmelding</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>
          <strong className="text-foreground">Veilig aanmelden:</strong> de webmaillinks
          selecteren de juiste gebruikersnaam en hergebruiken een geldige webmailsessie.
          Roundcube ondersteunt hiermee geen gegarandeerde automatische login voor drie
          verschillende accounts tegelijk. Mailboxwachtwoorden staan niet in de links
          of in de broncode van Harkas Admin.
        </p>
      </div>
    </div>
  );
};

export default AdminQuickAccess;
