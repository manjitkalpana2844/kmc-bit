import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Library, Plus, Trash2, Pencil, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { SEMESTER_SUBJECTS, SEMESTER_ORDINAL } from "@/lib/curriculum";

const MAX_PDF = 50 * 1024 * 1024;
const MAX_COVER = 2 * 1024 * 1024;

interface Book {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  semester: number | null;
  subject: string | null;
  cover_url: string | null;
  file_path: string;
}

export function AdminBooks() {
  const [rows, setRows] = useState<Book[]>([]);

  const load = async () => {
    const { data } = await supabase.from("books").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Book[]);
  };
  useEffect(() => { load(); }, []);

  const remove = async (b: Book) => {
    if (!confirm(`Delete book "${b.title}"?`)) return;
    await supabase.storage.from("pdfs").remove([b.file_path]);
    const { error } = await supabase.from("books").delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Book deleted");
    load();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2"><Library className="h-5 w-5" />Books ({rows.length})</h2>
        <BookEditor onSaved={load} />
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No books yet. Click "Add book" to upload one.</p>}
        {rows.map((b) => (
          <div key={b.id} className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="h-14 w-10 bg-muted rounded shrink-0 overflow-hidden flex items-center justify-center">
              {b.cover_url ? <img src={b.cover_url} alt="" className="w-full h-full object-cover" /> : <Library className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{b.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {b.author && <>{b.author} · </>}
                {b.semester && <>{SEMESTER_ORDINAL(b.semester)} Sem · </>}
                {b.subject}
              </div>
            </div>
            <BookEditor book={b} onSaved={load} />
            <Button variant="outline" size="sm" onClick={() => remove(b)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BookEditor({ book, onSaved }: { book?: Book; onSaved: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [description, setDescription] = useState(book?.description ?? "");
  const [semester, setSemester] = useState<string>(book?.semester ? String(book.semester) : "");
  const [subject, setSubject] = useState<string>(book?.subject ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const subjects = semester ? (SEMESTER_SUBJECTS[Number(semester)] ?? []) : [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) return toast.error("Title required");
    if (!book && !pdfFile) return toast.error("Select a PDF file");
    if (pdfFile && pdfFile.size > MAX_PDF) return toast.error("PDF must be ≤ 50MB");
    if (coverFile && coverFile.size > MAX_COVER) return toast.error("Cover must be ≤ 2MB");
    setBusy(true);
    try {
      let file_path = book?.file_path;
      if (pdfFile) {
        const safe = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `books/${Date.now()}-${safe}`;
        const up = await supabase.storage.from("pdfs").upload(path, pdfFile, { contentType: "application/pdf", upsert: false });
        if (up.error) throw up.error;
        file_path = path;
      }
      let cover_url = book?.cover_url ?? null;
      if (coverFile) {
        const safe = coverFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `book-covers/${Date.now()}-${safe}`;
        const up = await supabase.storage.from("avatars").upload(path, coverFile, { contentType: coverFile.type, upsert: true });
        if (up.error) throw up.error;
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        cover_url = `${data.publicUrl}?v=${Date.now()}`;
      }
      const payload: any = {
        title: title.trim(),
        author: author.trim() || null,
        description: description.trim() || null,
        semester: semester ? Number(semester) : null,
        subject: subject.trim() || null,
        cover_url,
        file_path,
      };
      if (book) {
        const { error } = await supabase.from("books").update(payload).eq("id", book.id);
        if (error) throw error;
        toast.success("Book updated");
      } else {
        payload.uploaded_by = user.id;
        const { error } = await supabase.from("books").insert(payload);
        if (error) throw error;
        toast.success("Book added");
      }
      setOpen(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {book ? (
          <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add book</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{book ? "Edit book" : "Add new book"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div><Label>Author</Label><Input value={author} onChange={(e) => setAuthor(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Semester</Label>
              <Select value={semester} onValueChange={(v) => { setSemester(v); setSubject(""); }}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(SEMESTER_SUBJECTS).map((s) => (
                    <SelectItem key={s} value={s}>{SEMESTER_ORDINAL(Number(s))} Semester</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              {subjects.length > 0 ? (
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Optional" />
              )}
            </div>
          </div>
          <div>
            <Label>Cover image (optional, ≤ 2MB)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <Label>PDF file {book ? "(leave empty to keep current)" : "(≤ 50MB)"}</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-1" />}
            {book ? "Save changes" : "Upload book"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}