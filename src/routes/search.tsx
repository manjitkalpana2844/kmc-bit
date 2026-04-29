import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, FileText, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { examTypeLabel, SEMESTER_ORDINAL } from "@/lib/curriculum";

export const Route = createFileRoute("/search")({
  component: SearchPage,
});

interface PdfRow {
  id: string; title: string; subject: string; semester: number; exam_type: string; year: number;
}

function SearchPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PdfRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const term = q.trim();
      if (!term) { setResults([]); return; }
      setBusy(true);
      const { data } = await supabase
        .from("pdf_files")
        .select("id,title,subject,semester,exam_type,year")
        .or(`title.ilike.%${term}%,subject.ilike.%${term}%`)
        .order("year", { ascending: false })
        .limit(50);
      setResults((data as PdfRow[]) ?? []);
      setBusy(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-3"><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        <h1 className="text-xl font-bold mb-3">Search papers</h1>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title or subject…"
            className="pl-9"
          />
        </div>
        {busy && <p className="text-sm text-muted-foreground">Searching…</p>}
        {!busy && q && results.length === 0 && (
          <p className="text-sm text-muted-foreground">No results for "{q}".</p>
        )}
        <div className="space-y-2">
          {results.map((r) => (
            <Card key={r.id} className="p-3">
              <Link
                to="/pdf/$pdfId"
                params={{ pdfId: r.id }}
                className="flex items-center gap-3"
              >
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {SEMESTER_ORDINAL(r.semester)} Sem · {r.subject} · {examTypeLabel(r.exam_type)} · {r.year}
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}