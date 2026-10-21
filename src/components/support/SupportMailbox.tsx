import { useEffect, useState } from "react";
import { mailboxRequest } from "@/lib/supportMailbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTicketDate } from "@/lib/support";
type Intake = {
  id: string;
  sender: string;
  subject: string;
  body: string;
  reason: string;
  created_at: string;
  files: number;
};
type State = {
  configured: boolean;
  last_checked_at?: string;
  last_error?: string;
  intake: Intake[];
};
export default function SupportMailbox() {
  const [state, setState] = useState<State>(),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [target, setTarget] = useState<Record<string, string>>({});
  const load = async () => {
    try {
      setState(await (await mailboxRequest()).json());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ophalen mislukt");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      await mailboxRequest("", body);
      setPassword("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verwerking mislukt");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="text-xl font-semibold">Supportmailbox & intake</h2>
      <p className="text-sm text-muted-foreground">
        support@harkasit.nl · beveiligde IMAP-verbinding · controle iedere
        minuut. E-mails worden niet uit de mailbox verwijderd of verplaatst.
      </p>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <p className="text-sm">
        {state?.configured ? "Mailbox verbonden" : "Mailbox nog niet verbonden"}
        {state?.last_checked_at
          ? " · Laatste controle: " + formatTicketDate(state.last_checked_at)
          : ""}
      </p>
      {state?.last_error && (
        <p role="alert" className="text-sm text-destructive">
          {state.last_error}
        </p>
      )}
      <form
        className="space-y-2 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          void run({ action: "configure", password });
        }}
      >
        <Label htmlFor="support-imap-password">
          Wachtwoord van support@harkasit.nl
        </Label>
        <Input
          id="support-imap-password"
          type="password"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground">
          Het wachtwoord wordt eerst getest en daarna versleuteld opgeslagen.
          Het wordt nooit teruggetoond. Alle bestaande mails worden vanaf de
          eerste controle beoordeeld.
        </p>
        <Button disabled={busy || !password} type="submit">
          {busy
            ? "Controleren..."
            : state?.configured
              ? "Verbinding bijwerken"
              : "Mailbox verbinden"}
        </Button>
      </form>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Te beoordelen ({state?.intake.length ?? 0})
        </h3>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void load()}
        >
          Verversen
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Nieuwe mails van bekende contactpersonen met precies één
        klantorganisatie worden automatisch een ticket. Antwoorden worden via de
        verwijzing naar onze ticketmail gekoppeld. Onbekende afzenders en
        onduidelijke koppelingen blijven hier ter beoordeling. Bij handmatig
        koppelen keur je expliciet deze afzender en inhoud voor het gekozen
        ticket goed; de afzender ontvangt een bevestiging.
      </p>
      {state?.intake.map((item) => (
        <details key={item.id} className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            {item.subject} · {item.sender}
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            {formatTicketDate(item.created_at)} · {item.reason} · {item.files}{" "}
            opgeslagen bijlage(n)
          </p>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm">
            {item.body || "Geen leesbare tekst. Bekijk de originele mail."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              aria-label={"Doelticket voor " + item.subject}
              placeholder="HIT-00002"
              value={target[item.id] ?? ""}
              onChange={(e) =>
                setTarget({ ...target, [item.id]: e.target.value })
              }
              className="max-w-40"
            />
            <Button
              size="sm"
              disabled={busy || !target[item.id]}
              onClick={() => {
                if (
                  window.confirm(
                    "Deze mail van " +
                      item.sender +
                      " koppelen aan " +
                      target[item.id] +
                      "? De inhoud wordt klantzichtbaar en de afzender ontvangt een bevestiging.",
                  )
                )
                  void run({
                    action: "approve",
                    id: item.id,
                    ticketNumber: target[item.id],
                  });
              }}
            >
              Koppelen
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void run({ action: "ignore", id: item.id })}
            >
              Afhandelen zonder koppeling
            </Button>
          </div>
        </details>
      ))}
    </section>
  );
}
