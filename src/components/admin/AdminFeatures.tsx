import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ToggleRight, Loader2, MessageSquare, Star, Bookmark, WifiOff, Bell, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Features {
  comments_enabled: boolean;
  ratings_enabled: boolean;
  bookmarks_enabled: boolean;
  offline_enabled: boolean;
  notifications_enabled: boolean;
  feedback_enabled: boolean;
}

const DEFAULT: Features = {
  comments_enabled: true,
  ratings_enabled: true,
  bookmarks_enabled: true,
  offline_enabled: true,
  notifications_enabled: true,
  feedback_enabled: true,
};

const ITEMS: { key: keyof Features; label: string; desc: string; icon: any }[] = [
  { key: "comments_enabled", label: "PDF comments", desc: "Allow students to discuss on each paper.", icon: MessageSquare },
  { key: "ratings_enabled", label: "PDF ratings", desc: "Show 1–5 star rating on papers.", icon: Star },
  { key: "bookmarks_enabled", label: "Bookmarks", desc: "Let students save papers to their library.", icon: Bookmark },
  { key: "offline_enabled", label: "Offline mode", desc: "Allow downloading papers for offline use.", icon: WifiOff },
  { key: "notifications_enabled", label: "Notifications", desc: "Show the in-app notification bell.", icon: Bell },
  { key: "feedback_enabled", label: "Contact admin", desc: "Show the feedback / contact admin page.", icon: MessageCircle },
];

export function AdminFeatures() {
  const [v, setV] = useState<Features>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<keyof Features | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "features").maybeSingle();
      if (data?.value) setV({ ...DEFAULT, ...(data.value as Partial<Features>) });
      setLoading(false);
    })();
  }, []);

  const toggle = async (key: keyof Features, next: boolean) => {
    const updated = { ...v, [key]: next };
    setBusy(key);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "features", value: updated as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setBusy(null);
    if (error) return toast.error(error.message);
    setV(updated);
    toast.success(`${key.replace(/_/g, " ")} ${next ? "enabled" : "disabled"}`);
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading feature flags…
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-lg flex items-center gap-2 mb-1">
        <ToggleRight className="h-5 w-5" /> Feature flags
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Turn features on or off for the entire app. Changes take effect immediately for all users.
      </p>
      <div className="space-y-2">
        {ITEMS.map(({ key, label, desc, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {busy === key && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch
                checked={v[key]}
                onCheckedChange={(next) => toggle(key, next)}
                disabled={busy === key}
                aria-label={`Toggle ${label}`}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}