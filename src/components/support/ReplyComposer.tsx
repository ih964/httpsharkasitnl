import { useRef, useState } from "react";
import { portalSupabase } from "@/integrations/supabase/client";
import { notifySupportChange } from "@/lib/supportNotify";
import { replyTemplates } from "@/lib/support";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const extensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "text/plain": "txt",
};
type Uploaded = {
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
};
export default function ReplyComposer({
  ticketId,
  userId,
  isStaff = false,
  onSent,
}: {
  ticketId: string;
  userId: string;
  isStaff?: boolean;
  onSent: () => Promise<unknown>;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const draft = useRef<{ id: string; uploaded: Uploaded[] } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current || (!body.trim() && !files.length)) return;
    lock.current = true;
    setBusy(true);
    setError("");
    draft.current ??= { id: crypto.randomUUID(), uploaded: [] };
    try {
      for (let i = draft.current.uploaded.length; i < files.length; i++) {
        const file = files[i];
        const path = `${ticketId}/${userId}/${crypto.randomUUID()}.${extensions[file.type]}`;
        const { error } = await portalSupabase.storage
          .from("support-attachments")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        draft.current.uploaded.push({
          storage_path: path,
          original_name: file.name.slice(0, 255),
          mime_type: file.type,
          size_bytes: file.size,
        });
      }
      setPending(true);
      const { error } = await portalSupabase.rpc("support_submit_reply", {
        p_ticket_id: ticketId,
        p_message_id: draft.current.id,
        p_body: body.trim(),
        p_internal: isStaff && internal,
        p_files: draft.current.uploaded,
      });
      if (error) throw error;
      if (!internal) void notifySupportChange(ticketId);
      draft.current = null;
      setBody("");
      setFiles([]);
      setInternal(false);
      setPending(false);
      if (input.current) input.current.value = "";
      toast({ title: "Reactie en bijlagen opgeslagen" });
      await onSent().catch(() =>
        toast({
          title: "Reactie opgeslagen; ververs het ticket om hem te bekijken.",
        }),
      );
    } catch (e) {
      setPending(true);
      setError(
        (e instanceof Error ? e.message : "Opslaan mislukt.") +
          " Je reactie blijft hier staan. Probeer opnieuw om dezelfde reactie af te ronden.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <label
        className="block text-sm font-medium"
        htmlFor={`reply-${ticketId}`}
      >
        Reactie en bijlagen
      </label>
      {isStaff && (
        <select
          aria-label="Standaardantwoord invoegen"
          disabled={busy || pending}
          className="w-full rounded-lg border bg-background p-2 text-sm"
          value=""
          onChange={(e) => {
            const text =
              replyTemplates[e.target.value as keyof typeof replyTemplates];
            if (text) setBody((b) => (b ? b + "\n\n" + text : text));
          }}
        >
          <option value="">Voeg een standaardantwoord toe...</option>
          <option value="ontvangst">Ontvangst en onderzoek</option>
          <option value="informatie">Meer informatie nodig</option>
          <option value="leverancier">Wachten op leverancier</option>
          <option value="oplossing">Oplossing laten bevestigen</option>
        </select>
      )}
      <Textarea
        id={`reply-${ticketId}`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={8000}
        disabled={busy || pending}
        placeholder="Typ je reactie en voeg eventueel bestanden toe..."
      />
      <Input
        ref={input}
        aria-label="Bijlagen bij reactie kiezen"
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.webp,.pdf,.txt"
        disabled={busy || pending}
        onChange={(e) => {
          const selected = Array.from(e.target.files ?? []);
          if (
            selected.length > 5 ||
            selected.some(
              (f) => !extensions[f.type] || f.size < 1 || f.size > 10485760,
            )
          ) {
            setError(
              "Kies maximaal 5 PNG-, JPG-, WEBP-, PDF- of TXT-bestanden van maximaal 10 MB per stuk.",
            );
            e.target.value = "";
            setFiles([]);
            return;
          }
          setFiles(selected);
          setError("");
        }}
      />
      {files.length > 0 && (
        <ul className="space-y-1 text-sm">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="break-all">{f.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy || pending}
                onClick={() =>
                  setFiles((items) => items.filter((_, n) => n !== i))
                }
              >
                Verwijderen
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Maximaal 5 bestanden, 10 MB per bestand.{" "}
        {internal
          ? "Notitie en bijlagen zijn alleen zichtbaar voor medewerkers."
          : "Reactie en bijlagen worden samen geplaatst. De e-mailupdate bevat een link naar het ticket."}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {isStaff && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={internal}
              disabled={busy || pending}
              onChange={(e) => setInternal(e.target.checked)}
            />
            Interne notitie
          </label>
        )}
        <Button
          type="submit"
          disabled={busy || (!body.trim() && !files.length)}
        >
          {busy
            ? "Opslaan..."
            : pending
              ? "Opnieuw proberen"
              : internal
                ? "Notitie en bijlagen opslaan"
                : "Reactie versturen"}
        </Button>
      </div>
    </form>
  );
}
