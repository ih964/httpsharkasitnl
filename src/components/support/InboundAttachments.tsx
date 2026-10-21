import { useEffect, useState } from "react";
import AttachmentActions from "./AttachmentActions";
import { mailboxRequest } from "@/lib/supportMailbox";
type FileItem = {
  id: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
};
export default function InboundAttachments({ ticketId }: { ticketId: string }) {
  const [items, setItems] = useState<FileItem[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void mailboxRequest(
      "?action=files&ticketId=" + encodeURIComponent(ticketId),
    )
      .then((r) => r.json())
      .then((data) => {
        if (active) setItems(data.files ?? []);
      })
      .catch(() => {
        if (active) setError("E-mailbijlagen ophalen mislukt.");
      });
    return () => {
      active = false;
    };
  }, [ticketId]);
  const loadFile = async (file: FileItem) => {
    const r = await mailboxRequest(
      "?action=download&ticketId=" +
        encodeURIComponent(ticketId) +
        "&id=" +
        encodeURIComponent(file.id),
    );
    return r.blob();
  };
  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {items.map((f) => (
        <div
          key={f.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
        >
          <div className="min-w-0 text-sm">
            <p className="break-all font-medium">{f.filename}</p>
            <p className="text-xs text-muted-foreground">
              {Math.max(1, Math.round(f.size_bytes / 1024))} kB · Ontvangen per
              e-mail
            </p>
          </div>
          <AttachmentActions
            filename={f.filename}
            mimeType={f.mime_type}
            loadFile={() => loadFile(f)}
          />
        </div>
      ))}
    </div>
  );
}
