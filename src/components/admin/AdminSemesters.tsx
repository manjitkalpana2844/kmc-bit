import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock } from "lucide-react";
import { SEMESTER_ORDINAL } from "@/lib/curriculum";
import { toast } from "sonner";

export function AdminSemesters() {
  const [rows, setRows] = useState<{ semester: number; is_locked: boolean }[]>([]);

  const load = async () => {
    const { data } = await supabase.from("semester_status").select("*").order("semester");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (sem: number, locked: boolean) => {
    const { error } = await supabase.from("semester_status").update({ is_locked: locked, updated_at: new Date().toISOString() }).eq("semester", sem);
    if (error) toast.error(error.message);
    else { toast.success(`${SEMESTER_ORDINAL(sem)} Sem ${locked ? "locked" : "unlocked"}`); load(); }
  };

  return (
    <Card className="p-6 max-w-2xl">
      <h2 className="font-semibold text-lg mb-4">Semester Lock Control</h2>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.semester} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {r.is_locked ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Unlock className="h-4 w-4 text-primary" />}
              <span className="font-medium">{SEMESTER_ORDINAL(r.semester)} Semester</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{r.is_locked ? "Locked" : "Unlocked"}</span>
              <Switch checked={!r.is_locked} onCheckedChange={(v) => toggle(r.semester, !v)} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}