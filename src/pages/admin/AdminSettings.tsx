import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Upload, Loader2, Image as ImageIcon } from "lucide-react";

interface Settings {
  id?: string;
  company_name: string;
  address: string;
  email: string;
  kvk: string;
  vat_number: string;
  iban: string;
  payment_terms: number;
  logo_url: string;
  invoice_footer_text: string;
}

const defaultSettings: Settings = {
  company_name: "Harkas IT",
  address: "Burgemeester de Manstraat 45",
  email: "info@harkasit.nl",
  kvk: "84795085",
  vat_number: "NL004014438B12",
  iban: "NL22KNAB0413717895",
  payment_terms: 14,
  logo_url: "",
  invoice_footer_text: "",
};

const AdminSettings = () => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from("settings").select("*").limit(1).maybeSingle();
    if (data) {
      setSettings({
        id: data.id,
        company_name: data.company_name || defaultSettings.company_name,
        address: data.address || defaultSettings.address,
        email: data.email || defaultSettings.email,
        kvk: data.kvk || defaultSettings.kvk,
        vat_number: data.vat_number || defaultSettings.vat_number,
        iban: data.iban || defaultSettings.iban,
        payment_terms: data.payment_terms ?? defaultSettings.payment_terms,
        logo_url: data.logo_url || "",
        invoice_footer_text: data.invoice_footer_text || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        company_name: settings.company_name,
        address: settings.address,
        email: settings.email,
        kvk: settings.kvk,
        vat_number: settings.vat_number,
        iban: settings.iban,
        payment_terms: settings.payment_terms,
        logo_url: settings.logo_url || null,
        invoice_footer_text: settings.invoice_footer_text || null,
      };

      if (settings.id) {
        const { error } = await supabase.from("settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("settings").insert(payload).select().single();
        if (error) throw error;
        setSettings((s) => ({ ...s, id: data.id }));
      }
      toast.success("Instellingen opgeslagen");
    } catch (err: any) {
      toast.error("Opslaan mislukt: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Alleen afbeeldingen zijn toegestaan");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logo.${ext}`;

      // Remove old logo
      await supabase.storage.from("branding").remove([path]);

      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      const logoUrl = urlData.publicUrl + "?t=" + Date.now();

      setSettings((s) => ({ ...s, logo_url: logoUrl }));

      // Save immediately
      const payload = { logo_url: logoUrl };
      if (settings.id) {
        await supabase.from("settings").update(payload).eq("id", settings.id);
      }
      toast.success("Logo geüpload");
    } catch (err: any) {
      toast.error("Upload mislukt: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const update = (field: keyof Settings, value: string | number) => {
    setSettings((s) => ({ ...s, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold">Instellingen</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Opslaan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Bedrijfsgegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bedrijfsnaam</Label>
                <Input value={settings.company_name} onChange={(e) => update("company_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={settings.email} onChange={(e) => update("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input value={settings.address} onChange={(e) => update("address", e.target.value)} placeholder="Straat + huisnummer" />
              </div>
              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input value={settings.iban} onChange={(e) => update("iban", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>KVK-nummer</Label>
                <Input value={settings.kvk} onChange={(e) => update("kvk", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>BTW-nummer</Label>
                <Input value={settings.vat_number} onChange={(e) => update("vat_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Betalingstermijn (dagen)</Label>
                <Input
                  type="number"
                  value={settings.payment_terms}
                  onChange={(e) => update("payment_terms", parseInt(e.target.value) || 14)}
                />
              </div>
              <div className="space-y-2">
                <Label>Factuur footer tekst</Label>
                <Input
                  value={settings.invoice_footer_text}
                  onChange={(e) => update("invoice_footer_text", e.target.value)}
                  placeholder="Optionele tekst onderaan factuur"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-4 flex items-center justify-center min-h-[160px] bg-muted/30">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  className="max-w-full max-h-32 object-contain"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="mx-auto h-10 w-10 mb-2" />
                  <p className="text-sm">Nog geen logo</p>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <Button variant="outline" className="w-full" disabled={uploading} asChild>
                  <span>
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {uploading ? "Uploaden..." : "Logo uploaden"}
                  </span>
                </Button>
              </Label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              PNG of JPG. Wordt getoond op facturen.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
