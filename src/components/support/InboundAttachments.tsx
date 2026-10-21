import { useEffect, useState } from "react";
import { mailboxRequest } from "@/lib/supportMailbox";
type FileItem = { id: string; filename: string; size_bytes: number };
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
  const download = async (file: FileItem) => {
    try {
      const r = await mailboxRequest(
        "?action=download&ticketId=" +
          encodeURIComponent(ticketId) +
          "&id=" +
          encodeURIComponent(file.id),
      );
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Bijlage downloaden mislukt.");
    }
  };
  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {items.map((f) => (
        <button
          type="button"
          key={f.id}
          onClick={() => void download(f)}
          className="w-full rounded-lg border p-3 text-left text-sm hover:bg-muted/40"
        >
          {f.filename} · {Math.max(1, Math.round(f.size_bytes / 1024))} kB ·
          Ontvangen per e-mail
        </button>
      ))}
    </div>
  );
}
