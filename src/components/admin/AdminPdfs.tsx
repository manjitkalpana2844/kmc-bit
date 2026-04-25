import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, FileText, Loader2 } from "lucide-react";
import { examTypeLabel, SEMESTER_ORDINAL } from "@/lib/curriculum";
import { toast } from "sonner";

interface Row {
  id: string; semester: number; subject: string; exam_type: string;
  year: number; title: string; file_path: string;
}

export function AdminPdfs() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("pdf_files").select("*").order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (r: Row) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    setBusy(r.id);
    await supabase.storage.from("pdfs").remove([r.file_path]);
    const { error } = await supabase.from("pdf_files").delete().eq("id", r.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  const updateTitle = async (id: string, title: string) => {
    const { error } = await supabase.from("pdf_files").update({ title }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Updated");
  };

  const filtered = rows.filter((r) =>
    !q || `${r.title} ${r.subject}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="font-semibold text-lg flex items-center gap-2"><FileText className="h-5 w-5" />Manage PDFs ({rows.length})</h2>
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No PDFs yet.</p>}
        {filtered.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3 border rounded-lg">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <Input
                defaultValue={r.title}
                onBlur={(e) => e.target.value !== r.title && updateTitle(r.id, e.target.value)}
                className="h-8 text-sm font-medium border-0 px-0 focus-visible:ring-0"
              />
              <div className="text-xs text-muted-foreground truncate">
                {SEMESTER_ORDINAL(r.semester)} · {r.subject} · {examTypeLabel(r.exam_type)} · {r.year}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(r)} disabled={busy === r.id}>
              {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}