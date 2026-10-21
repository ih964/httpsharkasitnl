import { useEffect, useState } from "react";
import { portalSupabase } from "@/integrations/supabase/client";
import { ticketCategories } from "@/lib/support";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
type Article = {
  id: string;
  title: string;
  body: string;
  category: string;
  published: boolean;
};
const empty = { title: "", body: "", category: "overig", published: false };
export default function SupportKnowledge({
  isStaff = false,
}: {
  isStaff?: boolean;
}) {
  const [items, setItems] = useState<Article[]>([]),
    [search, setSearch] = useState(""),
    [edit, setEdit] = useState<Partial<Article> | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const load = async () => {
    const { data, error } = await portalSupabase
      .from("support_knowledge")
      .select("id,title,body,category,published")
      .order("title");
    setError(error ? "Kennisbank ophalen mislukt." : "");
    if (!error) setItems((data ?? []) as Article[]);
  };
  useEffect(() => {
    void load();
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit || saving) return;
    setSaving(true);
    const values = {
      title: edit.title?.trim(),
      body: edit.body?.trim(),
      category: edit.category,
      published: edit.published,
    };
    const result = edit.id
      ? await portalSupabase
          .from("support_knowledge")
          .update(values)
          .eq("id", edit.id)
      : await portalSupabase.from("support_knowledge").insert(values);
    setSaving(false);
    if (result.error) {
      toast({
        title: "Opslaan mislukt",
        description: result.error.message,
        variant: "destructive",
      });
      return;
    }
    setEdit(null);
    void load();
  };
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Kennisbank</h2>
        {isStaff && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEdit({ ...empty })}
          >
            Nieuw kennisartikel
          </Button>
        )}
      </div>
      <Input
        aria-label="Kennisbank doorzoeken"
        placeholder="Zoek op onderwerp of oplossing..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {edit && isStaff && (
        <form className="space-y-3 rounded-lg border p-3" onSubmit={save}>
          <Label htmlFor="kb-title">Titel</Label>
          <Input
            id="kb-title"
            required
            minLength={3}
            maxLength={160}
            value={edit.title}
            onChange={(e) => setEdit({ ...edit, title: e.target.value })}
          />
          <Label htmlFor="kb-category">Categorie</Label>
          <select
            id="kb-category"
            className="w-full rounded border bg-background p-2"
            value={edit.category}
            onChange={(e) => setEdit({ ...edit, category: e.target.value })}
          >
            {Object.entries(ticketCategories).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Label htmlFor="kb-body">Oplossing / instructie</Label>
          <Textarea
            id="kb-body"
            required
            minLength={10}
            maxLength={20000}
            rows={6}
            value={edit.body}
            onChange={(e) => setEdit({ ...edit, body: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={edit.published}
              onChange={(e) =>
                setEdit({ ...edit, published: e.target.checked })
              }
            />
            Publiceren voor alle geautoriseerde klanten
          </label>
          <p className="text-xs text-muted-foreground">
            Een ongepubliceerd artikel is alleen intern zichtbaar. Neem geen
            klantgegevens of wachtwoorden op.
          </p>
          <div className="flex gap-2">
            <Button disabled={saving}>
              {saving ? "Opslaan..." : "Artikel opslaan"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEdit(null)}>
              Annuleren
            </Button>
          </div>
        </form>
      )}
      {items
        .filter((a) =>
          (a.title + " " + a.body + " " + (ticketCategories[a.category] ?? ""))
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .map((a) => (
          <details key={a.id} className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {a.title}{" "}
              {isStaff && !a.published && (
                <span className="text-xs text-amber-700">(alleen intern)</span>
              )}
            </summary>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm">
              {a.body}
            </p>
            {isStaff && (
              <Button variant="ghost" size="sm" onClick={() => setEdit(a)}>
                Bewerken
              </Button>
            )}
          </details>
        ))}
      {!items.length && !error && (
        <p className="text-sm text-muted-foreground">
          Er zijn nog geen kennisartikelen beschikbaar.
        </p>
      )}
    </section>
  );
}
