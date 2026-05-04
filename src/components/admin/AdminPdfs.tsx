import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, FileText, Loader2, Pencil, Save, X } from "lucide-react";
import { examTypeLabel, SEMESTER_ORDINAL, SEMESTER_SUBJECTS, EXAM_TYPES, YEARS } from "@/lib/curriculum";
import { toast } from "sonner";

interface Row {
  id: string; semester: number; subject: string; exam_type: string;
  year: number; title: string; file_path: string;
}

export function AdminPdfs() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Row>>({});

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

  const startEdit = (r: Row) => {
    setEditing(r.id);
    setDraft({ title: r.title, semester: r.semester, subject: r.subject, exam_type: r.exam_type, year: r.year });
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft({});
  };

  const saveEdit = async (r: Row) => {
    const subjects = SEMESTER_SUBJECTS[draft.semester ?? r.semester] ?? [];
    const subject = subjects.includes(draft.subject ?? "") ? draft.subject : subjects[0] ?? r.subject;
    const payload: any = {
      title: (draft.title ?? r.title).trim() || r.title,
      semester: draft.semester ?? r.semester,
      subject: subject ?? r.subject,
      exam_type: draft.exam_type ?? r.exam_type,
      year: draft.year ?? r.year,
    };
    setBusy(r.id);
    const { error } = await supabase.from("pdf_files").update(payload).eq("id", r.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    cancelEdit();
    load();
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
        {filtered.map((r) => {
          const isEditing = editing === r.id;
          const sem = (draft.semester ?? r.semester) as number;
          const subjects = SEMESTER_SUBJECTS[sem] ?? [];
          return (
            <div key={r.id} className="p-3 border rounded-lg">
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={draft.title ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Title"
                    className="h-9 text-sm font-medium"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Select
                      value={String(sem)}
                      onValueChange={(v) => {
                        const next = Number(v);
                        const subs = SEMESTER_SUBJECTS[next] ?? [];
                        setDraft((d) => ({ ...d, semester: next, subject: subs[0] ?? "" }));
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(SEMESTER_SUBJECTS).map((s) => (
                          <SelectItem key={s} value={s}>{SEMESTER_ORDINAL(Number(s))} sem</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={draft.subject ?? ""}
                      onValueChange={(v) => setDraft((d) => ({ ...d, subject: v }))}
                    >
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select
                      value={draft.exam_type ?? r.exam_type}
                      onValueChange={(v) => setDraft((d) => ({ ...d, exam_type: v }))}
                    >
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXAM_TYPES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(draft.year ?? r.year)}
                      onValueChange={(v) => setDraft((d) => ({ ...d, year: Number(v) }))}
                    >
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={busy === r.id}>
                      <X className="h-4 w-4 mr-1" />Cancel
                    </Button>
                    <Button size="sm" onClick={() => saveEdit(r)} disabled={busy === r.id}>
                      {busy === r.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {SEMESTER_ORDINAL(r.semester)} · {r.subject} · {examTypeLabel(r.exam_type)} · {r.year}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(r)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r)} disabled={busy === r.id} aria-label="Delete">
                    {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
