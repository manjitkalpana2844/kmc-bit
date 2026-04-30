import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Upload, BadgeCheck, Clock, BookMarked, Library, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { daysLeft } from "@/lib/tracking";
import { useMotion } from "@/hooks/use-motion";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, profile, loading, hasActiveAccess, accessExpiresAt, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const { pref, setPref, reduced } = useMotion();

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user]);
  useEffect(() => { setName(profile?.name ?? ""); }, [profile?.name]);

  const save = async () => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) return toast.error("Name must be 1–60 characters");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ name: trimmed }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    refreshProfile();
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Avatar must be under 2MB");
    setAvatarBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw error;
      toast.success("Avatar updated");
      refreshProfile();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally { setAvatarBusy(false); }
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  const initials = (profile?.name ?? profile?.email ?? "U").slice(0, 2).toUpperCase();
  const left = daysLeft(accessExpiresAt);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-lg flex items-center gap-1">
                {profile?.name ?? "Student"}
                {hasActiveAccess && <BadgeCheck className="h-4 w-4 text-primary" />}
              </div>
              <div className="text-sm text-muted-foreground truncate">{profile?.email}</div>
              <label className="inline-flex items-center gap-1 mt-2 text-xs text-primary cursor-pointer hover:underline">
                <Upload className="h-3 w-3" />
                {avatarBusy ? "Uploading…" : "Change photo"}
                <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} disabled={avatarBusy} />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            </div>
            <Button onClick={save} disabled={busy}><Save className="h-4 w-4 mr-1" />Save</Button>
          </div>
        </Card>

        {hasActiveAccess && (
          <Card className="p-5 mb-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="font-semibold text-sm">Access status</div>
                <div className="text-xs text-muted-foreground">
                  {left === null ? "Lifetime access" : left === 0 ? "Expires today" : `${left} days remaining`}
                </div>
              </div>
              {left !== null && left <= 7 && <Badge variant="destructive">Renew soon</Badge>}
              {accessExpiresAt && left !== null && left <= 7 && (
                <Button asChild size="sm"><Link to="/get-access">Renew</Link></Button>
              )}
            </div>
          </Card>
        )}

        {/* Motion preferences */}
        <Card className="p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="font-semibold text-sm">Motion & animations</div>
              <div className="text-xs text-muted-foreground">
                Reduce motion if animations feel distracting or you prefer a calmer experience.
              </div>
            </div>
            <Switch
              checked={!reduced}
              onCheckedChange={(checked) => setPref(checked ? "on" : "off")}
              aria-label="Toggle animations"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "auto", label: "System", hint: "Follow device" },
              { value: "on", label: "On", hint: "Full animations" },
              { value: "off", label: "Off", hint: "Minimal motion" },
            ] as const).map((opt) => {
              const active = pref === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPref(opt.value)}
                  className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-[11px] text-muted-foreground">{opt.hint}</div>
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-3">
            Currently: <span className="font-medium">{reduced ? "Reduced motion" : "Full motion"}</span>
            {pref === "auto" ? " (from your system settings)" : ""}
          </div>
        </Card>

        <div className="grid sm:grid-cols-3 gap-3">
          <Link to="/library"><Card className="p-4 hover:shadow-md transition cursor-pointer">
            <Library className="h-5 w-5 text-primary mb-2" />
            <div className="font-semibold text-sm">My Library</div>
            <div className="text-xs text-muted-foreground">Bookmarks, recents, downloads</div>
          </Card></Link>
          <Link to="/feedback"><Card className="p-4 hover:shadow-md transition cursor-pointer">
            <MessageSquare className="h-5 w-5 text-primary mb-2" />
            <div className="font-semibold text-sm">Contact admin</div>
            <div className="text-xs text-muted-foreground">Send feedback or report</div>
          </Card></Link>
          <Link to="/get-access"><Card className="p-4 hover:shadow-md transition cursor-pointer">
            <BookMarked className="h-5 w-5 text-primary mb-2" />
            <div className="font-semibold text-sm">Plans</div>
            <div className="text-xs text-muted-foreground">View or upgrade access</div>
          </Card></Link>
        </div>
      </main>
    </div>
  );
}