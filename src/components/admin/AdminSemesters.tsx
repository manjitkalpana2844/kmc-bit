import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock, GraduationCap, Loader2 } from "lucide-react";
import { SEMESTER_ORDINAL } from "@/lib/curriculum";
import { toast } from "sonner";

interface Row { semester: number; is_locked: boolean }

export function AdminSemesters() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("semester_status").select("semester,is_locked").order("semester");
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (semester: number, next: boolean) => {
    setBusy(semester);
    const { error } = await supabase
      .from("semester_status")
      .upsert({ semester, is_locked: next, updated_at: new Date().toISOString() }, { onConflict: "semester" });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${SEMESTER_ORDINAL(semester)} semester ${next ? "locked" : "unlocked"}`);
    setRows((prev) => {
      const exists = prev.some((r) => r.semester === semester);
      if (exists) return prev.map((r) => (r.semester === semester ? { ...r, is_locked: next } : r));
      return [...prev, { semester, is_locked: next }].sort((a, b) => a.semester - b.semester);
    });
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading semesters…
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-lg flex items-center gap-2 mb-1">
        <GraduationCap className="h-5 w-5" /> Semester access
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Lock a semester to hide its PDFs from all students (admins always retain access).
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {Array.from({ length: 8 }, (_, i) => i + 1).map((sem) => {
          const row = rows.find((r) => r.semester === sem);
          const locked = row?.is_locked ?? false;
          return (
            <div key={sem} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                {locked ? <Lock className="h-4 w-4 text-destructive" /> : <Unlock className="h-4 w-4 text-primary" />}
                <div className="min-w-0">
                  <div className="font-medium text-sm">{SEMESTER_ORDINAL(sem)} semester</div>
                  <div className="text-xs text-muted-foreground">{locked ? "Locked for students" : "Open to paid students"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {busy === sem && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <Switch
                  checked={!locked}
                  onCheckedChange={(open) => toggle(sem, !open)}
                  disabled={busy === sem}
                  aria-label={`Toggle ${SEMESTER_ORDINAL(sem)} semester`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}