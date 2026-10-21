import { useEffect, useState } from "react";
import { Paperclip } from "lucide-react";
import { portalSupabase } from "@/integrations/supabase/client";
import { mailboxRequest } from "@/lib/supportMailbox";
import {
  formatTicketDate,
  type SupportTicket,
  type TicketMessage,
} from "@/lib/support";
import AttachmentActions from "./AttachmentActions";

type FileEntry = {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  is_internal?: boolean;
  storage_path?: string;
  message_id?: string;
};
const STAFF_LABEL = "Support@harkasit.nl · Harkas IT Beheer";
const customerStyle = "border-blue-300 bg-blue-50 text-blue-950";
const staffStyle = "border-emerald-300 bg-emerald-50 text-emerald-950";
const internalStyle = "border-amber-300 bg-amber-50 text-amber-950";

export default function TicketConversation({
  ticket,
  messages,
  loading,
  userId,
  isStaff = false,
}: {
  ticket: SupportTicket;
  messages: TicketMessage[];
  loading: boolean;
  userId?: string;
  isStaff?: boolean;
}) {
  const [authors, setAuthors] = useState<
    Record<string, { label: string; is_self: boolean }>
  >({});
  useEffect(() => {
    let active = true;
    void mailboxRequest(
      "?action=authors&ticketId=" + encodeURIComponent(ticket.id),
    )
      .then((r) => r.json())
      .then((data) => {
        if (active)
          setAuthors(
            Object.fromEntries(
              (data.authors ?? []).map(
                (a: { author_id: string; label: string; is_self: boolean }) => [
                  a.author_id,
                  a,
                ],
              ),
            ),
          );
      })
      .catch(() => {
        /* Keep safe fallback labels if the lookup is unavailable. */
      });
    return () => {
      active = false;
    };
  }, [ticket.id, ticket.last_activity_at, messages.length]);
  const authorLabel = (authorId: string, staff: boolean, original = false) => {
    if (staff) return STAFF_LABEL;
    const author = authors[authorId];
    if (!isStaff && !staff && (author?.is_self || authorId === userId))
      return "Jij";
    const label =
      author?.label ||
      (original
        ? ticket.requester_email
        : staff
          ? "Medewerker"
          : "Afzender onbekend");
    return label;
  };
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const results = await Promise.allSettled([
        portalSupabase
          .from("support_ticket_files")
          .select(
            "id,original_name,mime_type,size_bytes,created_at,is_internal,storage_path,message_id",
          )
          .eq("ticket_id", ticket.id)
          .then(({ data, error }) => {
            if (error) throw error;
            return (data ?? []).map((f) => ({
              ...f,
              id: "portal-" + f.id,
              filename: f.original_name,
            }));
          }),
        mailboxRequest(
          "?action=files&ticketId=" + encodeURIComponent(ticket.id),
        )
          .then((r) => r.json())
          .then((data) => (data.files ?? []) as FileEntry[]),
      ]);
      if (!active) return;
      setFiles(
        results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])),
      );
      setError(
        results.some((r) => r.status === "rejected")
          ? "Niet alle bijlagen konden worden geladen. Probeer het opnieuw via het tabblad Bijlagen."
          : "",
      );
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ticket.id, ticket.last_activity_at]);

  const loadFile = async (file: FileEntry) => {
    if (file.storage_path) {
      const { data, error } = await portalSupabase.storage
        .from("support-attachments")
        .createSignedUrl(file.storage_path, 60);
      if (error || !data?.signedUrl)
        throw new Error("Bijlage ophalen mislukt.");
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error("Bijlage ophalen mislukt.");
      return response.blob();
    }
    return (
      await mailboxRequest(
        "?action=download&ticketId=" +
          encodeURIComponent(ticket.id) +
          "&id=" +
          encodeURIComponent(file.id),
      )
    ).blob();
  };
  // Files have no message relation: show their actual timestamp without guessing ownership.
  const entries = [
    ...messages
      .filter((m) => isStaff || !m.is_internal)
      .map((message) => ({
        id: "message-" + message.id,
        date: message.created_at,
        message,
        file: null,
      })),
    ...files
      .filter((f) => !f.message_id && (isStaff || !f.is_internal))
      .map((file) => ({
        id: "file-" + file.id,
        date: file.created_at,
        message: null,
        file,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap gap-2 text-xs"
        aria-label="Kleuren van het gesprek"
      >
        <span className={"rounded-full border px-2 py-1 " + customerStyle}>
          Klant
        </span>
        <span className={"rounded-full border px-2 py-1 " + staffStyle}>
          {STAFF_LABEL}
        </span>
        {isStaff && (
          <span className={"rounded-full border px-2 py-1 " + internalStyle}>
            Alleen intern
          </span>
        )}
      </div>
      <div
        className="max-h-[48vh] xl:max-h-[clamp(240px,calc(100dvh-600px),520px)] space-y-3 overflow-y-auto overscroll-contain pr-2"
        role="region"
        aria-label="Ticketgesprek en bijlagen"
        tabIndex={0}
      >
        <article
          className={"rounded-xl border border-l-4 p-4 " + customerStyle}
        >
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
            <strong>
              {authorLabel(ticket.created_by, false, true)} · Oorspronkelijke
              melding
            </strong>
            <span>{formatTicketDate(ticket.created_at)}</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm">
            {ticket.description}
          </p>
        </article>
        {loading && (
          <p className="text-sm text-muted-foreground">Reacties laden...</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {entries.map(({ id, date, message, file }) => (
          <article
            key={id}
            className={
              "rounded-xl border border-l-4 p-4 " +
              (message
                ? message.is_internal
                  ? internalStyle
                  : message.sender_type === "medewerker"
                    ? staffStyle
                    : customerStyle
                : file?.is_internal
                  ? internalStyle
                  : "border-border bg-muted/30")
            }
          >
            <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
              <strong>
                {message
                  ? message.is_internal
                    ? `${authorLabel(message.author_id, true)} · Interne notitie · Alleen intern`
                    : message.sender_type === "medewerker"
                      ? authorLabel(message.author_id, true)
                      : authorLabel(message.author_id, false)
                  : file?.is_internal
                    ? "Bijlage · Alleen intern"
                    : file?.storage_path
                      ? "Bijlage via portaal"
                      : "Bijlage ontvangen per e-mail"}
              </strong>
              <span>{formatTicketDate(date)}</span>
            </div>
            {message && (
              <p className="whitespace-pre-wrap break-words text-sm">
                {message.body}
              </p>
            )}
            {message &&
              files
                .filter(
                  (f) =>
                    f.message_id === message.id && (isStaff || !f.is_internal),
                )
                .map((f) => (
                  <div
                    key={f.id}
                    className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-current/20 p-3"
                  >
                    <span className="break-all text-sm">{f.filename}</span>
                    <AttachmentActions
                      filename={f.filename}
                      mimeType={f.mime_type}
                      loadFile={() => loadFile(f)}
                    />
                  </div>
                ))}
            {file && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all text-sm font-medium">
                    <Paperclip className="mr-1 inline h-4 w-4" />
                    {file.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.max(1, Math.round(file.size_bytes / 1024))} kB
                  </p>
                </div>
                <AttachmentActions
                  filename={file.filename}
                  mimeType={file.mime_type}
                  loadFile={() => loadFile(file)}
                />
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
