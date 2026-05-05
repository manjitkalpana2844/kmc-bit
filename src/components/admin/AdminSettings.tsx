import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Sliders, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Branding {
  campus_name: string;
  campus_subtitle: string;
  logo_url: string;
  contact_email: string;
  contact_phone: string;
  footer_text: string;
}

const DEFAULT: Branding = {
  campus_name: "FWU BIT",
  campus_subtitle: "Far Western University",
  logo_url: "",
  contact_email: "",
  contact_phone: "",
  footer_text: "Made for BIT students of Far Western University",
};

export function AdminSettings() {
  const [v, setV] = useState<Branding>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "branding").maybeSingle();
      if (data?.value) setV({ ...DEFAULT, ...(data.value as Partial<Branding>) });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "branding", value: v as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Branding updated");
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-lg flex items-center gap-2 mb-1">
        <Sliders className="h-5 w-5" /> Site branding & contact
      </h2>
      <p className="text-xs text-muted-foreground mb-5">
        These values appear in the header, login screens, and footer across the app.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Site name</Label>
          <Input value={v.campus_name} onChange={(e) => setV({ ...v, campus_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Subtitle</Label>
          <Input value={v.campus_subtitle} onChange={(e) => setV({ ...v, campus_subtitle: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Logo URL (optional)</Label>
          <Input placeholder="https://…/logo.png" value={v.logo_url} onChange={(e) => setV({ ...v, logo_url: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Contact email</Label>
          <Input type="email" value={v.contact_email} onChange={(e) => setV({ ...v, contact_email: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Contact phone</Label>
          <Input value={v.contact_phone} onChange={(e) => setV({ ...v, contact_phone: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Footer text</Label>
          <Textarea rows={2} value={v.footer_text} onChange={(e) => setV({ ...v, footer_text: e.target.value })} />
        </div>
      </div>
      <Button onClick={save} disabled={busy} className="mt-5">
        {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
        Save branding
      </Button>
    </Card>
  );
}