import AttachmentActions from "./AttachmentActions";
import InboundAttachments from "./InboundAttachments";
import { useEffect, useState } from "react";
import { portalSupabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Paperclip, Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { notifySupportChange } from "@/lib/supportNotify";
import { formatTicketDate } from "@/lib/support";

type Attachment = {
  id: string;
  ticket_id: string;
  uploaded_by: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  is_internal: boolean;
  created_at: string;
};

const MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
];
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "text/plain": "txt",
};
const BUCKET = "support-attachments";
const MAX_BYTES = 10 * 1024 * 1024;

type Props = {
  ticketId: string;
  userId: string;
  isStaff?: boolean;
  closed?: boolean;
  uploadOnly?: boolean;
  onUploaded?: () => void;
};

export default function TicketAttachments({
  ticketId,
  userId,
  isStaff = false,
  closed = false,
  uploadOnly = false,
  onUploaded,
}: Props) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await portalSupabase
      .from("support_ticket_files")
      .select(
        "id,ticket_id,uploaded_by,storage_path,original_name,mime_type,size_bytes,is_internal,created_at",
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false });
    if (error)
      toast({
        title: "Bijlagen laden mislukt",
        description: error.message,
        variant: "destructive",
      });
    else setItems((data ?? []) as Attachment[]);
    setLoading(false);
  };

  useEffect(() => {
    setItems([]);
    setFile(null);
    setLoading(true);
    if (!uploadOnly) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, uploadOnly]);

  const upload = async () => {
    if (!file || busy) return;
    if (
      !MIME_TYPES.includes(file.type) ||
      file.size < 1 ||
      file.size > MAX_BYTES
    ) {
      toast({
        title: "Bestand niet toegestaan",
        description: "Kies een PNG, JPG, WEBP, PDF of TXT van maximaal 10 MB.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    const path =
      ticketId +
      "/" +
      userId +
      "/" +
      crypto.randomUUID() +
      "." +
      EXTENSIONS[file.type];
    try {
      const uploadResult = await portalSupabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type,
          cacheControl: "0",
          upsert: false,
        });
      if (uploadResult.error) throw uploadResult.error;
      const { error } = await portalSupabase
        .from("support_ticket_files")
        .insert({
          ticket_id: ticketId,
          uploaded_by: userId,
          storage_path: path,
          original_name: file.name.slice(0, 255),
          mime_type: file.type,
          size_bytes: file.size,
          is_internal: isStaff && internal,
        });
      if (error) {
        await portalSupabase.storage.from(BUCKET).remove([path]);
        throw error;
      }
      setFile(null);
      setInternal(false);
      const el = document.getElementById(
        "support-upload-" + ticketId,
      ) as HTMLInputElement | null;
      if (el) el.value = "";
      // A customer-visible attachment is a ticket update; a private staff file is not.
      if (!(isStaff && internal)) void notifySupportChange(ticketId);
      toast({ title: "Bijlage toegevoegd" });
      onUploaded?.();
      if (!uploadOnly) await load();
    } catch (e: unknown) {
      toast({
        title: "Upload mislukt",
        description: e instanceof Error ? e.message : "Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const loadFile = async (item: Attachment) => {
    const { data, error } = await portalSupabase.storage
      .from(BUCKET)
      .createSignedUrl(item.storage_path, 60);
    if (error || !data?.signedUrl) throw new Error("Bijlage ophalen mislukt.");
    const response = await fetch(data.signedUrl);
    if (!response.ok)
      throw new Error("Bijlage ophalen mislukt. Probeer het opnieuw.");
    return response.blob();
  };

  return (
    <div className="space-y-3">
      {!uploadOnly && (
        <>
          <h3 className="font-semibold flex items-center gap-2">
            <Paperclip className="h-4 w-4" /> Bijlagen
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Bijlagen laden...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Geen via het portaal geüploade bijlagen.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="break-all text-sm font-medium">
                      {item.original_name}
                    </p>
                    {item.is_internal && (
                      <span className="text-xs text-amber-600">Intern · </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {Math.max(1, Math.round(item.size_bytes / 1024))} kB ·{" "}
                      {formatTicketDate(item.created_at)}
                    </span>
                  </div>
                  <AttachmentActions
                    filename={item.original_name}
                    mimeType={item.mime_type}
                    loadFile={() => loadFile(item)}
                  />
                </div>
              ))}
            </div>
          )}
          <InboundAttachments ticketId={ticketId} />
        </>
      )}
      {(!closed || isStaff) && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3">
          <Input
            id={"support-upload-" + ticketId}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={busy}
            aria-label="Bijlage kiezen"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            {isStaff ? (
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={internal}
                  onCheckedChange={(v) => setInternal(v === true)}
                  disabled={busy}
                />
                Alleen voor medewerkers
              </label>
            ) : (
              <span className="text-xs text-muted-foreground">
                Maximaal 10 MB per bestand.
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void upload()}
              disabled={!file || busy}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Uploaden
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
