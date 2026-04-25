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
import { Upload, Loader2 } from "lucide-react";

const MAX = 50 * 1024 * 1024;

export function AdminUpload() {
  const { user } = useAuth();
  const [semester, setSemester] = useState<string>("1");
  const [subject, setSubject] = useState<string>("");
  const [examType, setExamType] = useState<string>("final");
  const [year, setYear] = useState<string>("2081");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const subjects = SEMESTER_SUBJECTS[Number(semester)] ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user || !subject) return;
    if (file.type !== "application/pdf") return toast.error("Only PDF files allowed");
    if (file.size > MAX) return toast.error("File exceeds 50MB");
    setBusy(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${semester}/${encodeURIComponent(subject)}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("pdfs").upload(path, file, {
      contentType: "application/pdf",
    });
    if (upErr) {
      setBusy(false);
      return toast.error(upErr.message);
    }
    const { error: insErr } = await supabase.from("pdf_files").insert({
      semester: Number(semester),
      subject,
      exam_type: examType as any,
      year: Number(year),
      title: title || file.name.replace(/\.pdf$/i, ""),
      file_path: path,
      file_size: file.size,
      uploaded_by: user.id,
    });
    setBusy(false);
    if (insErr) return toast.error(insErr.message);
    toast.success("PDF uploaded");
    setTitle("");
    setFile(null);
    (document.getElementById("pdf-file-input") as HTMLInputElement | null)?.value && ((document.getElementById("pdf-file-input") as HTMLInputElement).value = "");
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
          <Label htmlFor="title">Title (optional)</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Java Final 2081" />
        </div>
        <div>
          <Label htmlFor="pdf-file-input">PDF file (max 50MB)</Label>
          <Input id="pdf-file-input" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <Button type="submit" disabled={busy || !file || !subject}>
          {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Upload
        </Button>
      </form>
      <p className="text-[10px] text-muted-foreground mt-3">
        Tip: after upload, send a notification ({notifTypeLabel("new_paper")}) so students see it.
      </p>
    </Card>
  );
}