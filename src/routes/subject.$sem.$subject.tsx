import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EXAM_TYPES, YEARS, examTypeLabel, SEMESTER_ORDINAL } from "@/lib/curriculum";

export const Route = createFileRoute("/subject/$sem/$subject")({
  component: SubjectPage,
});

interface PdfRow {
  id: string;
  semester: number;
  subject: string;
  exam_type: string;
  year: number;
  title: string;
  file_path: string;
  created_at: string;
}

function SubjectPage() {
  const { sem, subject } = Route.useParams();
  const semNum = Number(sem);
  const subjectName = decodeURIComponent(subject);
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pdfs, setPdfs] = useState<PdfRow[]>([]);
  const [examType, setExamType] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    supabase.from("semester_status").select("is_locked").eq("semester", semNum).maybeSingle()
      .then(({ data }) => setLocked(data?.is_locked ?? true));
  }, [semNum]);

  useEffect(() => {
    supabase
      .from("pdf_files")
      .select("*")
      .eq("semester", semNum)
      .eq("subject", subjectName)
      .order("year", { ascending: false })
      .then(({ data }) => setPdfs((data as PdfRow[]) ?? []));
  }, [semNum, subjectName]);

  const filtered = useMemo(() => {
    return pdfs.filter(
      (p) =>
        (examType === "all" || p.exam_type === examType) &&
        (year === "all" || String(p.year) === year)
    );
  }, [pdfs, examType, year]);

  if (!user || locked === null) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (locked && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-12 text-center max-w-md">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold mb-2">Semester locked</h1>
          <Button asChild><Link to="/">Back to dashboard</Link></Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <Link to="/semester/$sem" params={{ sem }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4" /> {SEMESTER_ORDINAL(semNum)} Semester
        </Link>
        <h1 className="text-2xl font-bold mb-1">{subjectName}</h1>
        <p className="text-sm text-muted-foreground mb-6">Filter by exam type and year</p>

        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={examType} onValueChange={setExamType}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Exam type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All exam types</SelectItem>
              {EXAM_TYPES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            No papers uploaded yet for this filter.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Link key={p.id} to="/pdf/$pdfId" params={{ pdfId: p.id }}>
                <Card className="p-5 hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer h-full"
                  style={{ boxShadow: "var(--shadow-card)" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground" style={{ background: "color-mix(in oklab, var(--accent) 20%, transparent)" }}>
                      {p.year}
                    </span>
                  </div>
                  <div className="font-semibold line-clamp-2">{p.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{examTypeLabel(p.exam_type)}</div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}