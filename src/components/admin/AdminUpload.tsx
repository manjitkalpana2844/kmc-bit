import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEMESTER_SUBJECTS, SEMESTER_ORDINAL, EXAM_TYPES, YEARS, notifTypeLabel } from "@/lib/curriculum";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";

const MAX = 50 * 1024 * 1024;

export function AdminUpload() {
  const { user } = useAuth();
  const [semester, setSemester] = useState<string>("1");
  const [subject, setSubject] = useState<string>("");
  const [examType, setExamType] = useState<string>("final");
  const [year, setYear] = useState<string>("2081");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const subjects = SEMESTER_SUBJECTS[Number(semester)] ?? [];

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of list) {
      if (f.type !== "application/pdf") { toast.error(`${f.name}: only PDFs allowed`); continue; }
      if (f.size > MAX) { toast.error(`${f.name}: exceeds 50MB`); continue; }
      valid.push(f);
    }
    setFiles(valid);
  };

  const removeAt = (i: number) => setFiles((f) => f.filter((_, idx) => idx !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0 || !user || !subject) return;
    setBusy(true);
    setProgress({ done: 0, total: files.length });
    let okCount = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${semester}/${encodeURIComponent(subject)}/${Date.now()}-${i}-${safe}`;
      const { error: upErr } = await supabase.storage.from("pdfs").upload(path, f, { contentType: "application/pdf" });
      if (upErr) { toast.error(`${f.name}: ${upErr.message}`); setProgress({ done: i + 1, total: files.length }); continue; }
      const baseTitle = title.trim();
      const fallback = f.name.replace(/\.pdf$/i, "");
      const finalTitle = files.length === 1 ? (baseTitle || fallback) : (baseTitle ? `${baseTitle} ${i + 1}` : fallback);
      const { error: insErr } = await supabase.from("pdf_files").insert({
        semester: Number(semester), subject,
        exam_type: examType as any, year: Number(year),
        title: finalTitle, file_path: path, file_size: f.size, uploaded_by: user.id,
      });
      if (insErr) toast.error(`${f.name}: ${insErr.message}`); else okCount++;
      setProgress({ done: i + 1, total: files.length });
    }
    setBusy(false);
    setProgress(null);
    if (okCount > 0) toast.success(`${okCount}/${files.length} PDF${okCount === 1 ? "" : "s"} uploaded`);
    setTitle(""); setFiles([]);
    const input = document.getElementById("pdf-file-input") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  return (
    <Card className="p-6 max-w-2xl">
      <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <Upload className="h-5 w-5" /> Upload PDF
      </h2>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Semester</Label>
            <Select value={semester} onValueChange={(v) => { setSemester(v); setSubject(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8].map((n) => (
                  <SelectItem key={n} value={String(n)}>{SEMESTER_ORDINAL(n)} Semester</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subject</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Exam type</Label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXAM_TYPES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="title">Title prefix (optional)</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Java Final 2081 (auto-numbered for multiple files)" />
        </div>
        <div>
          <Label htmlFor="pdf-file-input">PDF files (max 50MB each, select multiple)</Label>
          <Input id="pdf-file-input" type="file" accept="application/pdf" multiple onChange={onPick} />
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 border rounded bg-muted/30">
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                  <button type="button" onClick={() => removeAt(i)} disabled={busy} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button type="submit" disabled={busy || files.length === 0 || !subject}>
          {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {progress ? `Uploading ${progress.done}/${progress.total}…` : files.length > 1 ? `Upload ${files.length} files` : "Upload"}
        </Button>
      </form>
      <p className="text-[10px] text-muted-foreground mt-3">
        Tip: after upload, send a notification ({notifTypeLabel("new_paper")}) so students see it.
      </p>
    </Card>
  );
}