import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Eye } from "lucide-react";

type Props = {
  filename: string;
  mimeType: string;
  loadFile: () => Promise<Blob>;
};
export default function AttachmentActions({
  filename,
  mimeType,
  loadFile,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ url: string; text?: string } | null>(
    null,
  );
  const active = useRef(true);
  const pending = useRef(false);
  const previewUrl = useRef<string | null>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);
  const closePreview = () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview(null);
  };
  const run = async (open: boolean) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const blob = new Blob([await loadFile()], { type: mimeType });
      if (!active.current) return;
      if (open) {
        if (
          ![
            "image/png",
            "image/jpeg",
            "image/webp",
            "application/pdf",
            "text/plain",
          ].includes(mimeType)
        )
          throw new Error("Voorbeeld niet beschikbaar. Kies Downloaden.");
        const text = mimeType === "text/plain" ? await blob.text() : undefined;
        if (!active.current) return;
        const url = URL.createObjectURL(blob);
        if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
        previewUrl.current = url;
        setPreview({ url, text });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (e) {
      if (active.current)
        setError(e instanceof Error ? e.message : "Bijlage ophalen mislukt.");
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void run(true)}
          aria-label={"Openen: " + filename}
        >
          <Eye className="mr-2 h-4 w-4" />
          Openen
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void run(false)}
          aria-label={"Downloaden: " + filename}
        >
          <Download className="mr-2 h-4 w-4" />
          Downloaden
        </Button>
      </div>
      {busy && (
        <p role="status" className="text-xs text-muted-foreground">
          Bestand ophalen...
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="break-all">{filename}</DialogTitle>
            <DialogDescription>
              Voorbeeld van de bijlage. Kies Downloaden om een kopie op te
              slaan.
            </DialogDescription>
          </DialogHeader>
          {preview &&
            (mimeType.startsWith("image/") ? (
              <img
                src={preview.url}
                alt={filename}
                className="max-h-[65dvh] w-full object-contain"
              />
            ) : mimeType === "text/plain" ? (
              <pre className="max-h-[65dvh] overflow-auto whitespace-pre-wrap break-words rounded border p-4 text-sm">
                {preview.text}
              </pre>
            ) : (
              <iframe
                src={preview.url}
                title={filename}
                sandbox="allow-same-origin"
                className="h-[65dvh] w-full rounded border"
              />
            ))}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void run(false)}
          >
            <Download className="mr-2 h-4 w-4" />
            Downloaden
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
