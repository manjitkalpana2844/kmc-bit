import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Bookmark, Clock, Download, FileText } from "lucide-react";
import { SEMESTER_ORDINAL, examTypeLabel } from "@/lib/curriculum";

export const Route = createFileRoute("/library")({ component: LibraryPage });

interface PdfMeta {
  id: string;
  title: string;
  semester: number;
  subject: string;
  exam_type: string;
  year: number;
}

function LibraryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<PdfMeta[]>([]);
  const [recent, setRecent] = useState<PdfMeta[]>([]);
  const [downloads, setDownloads] = useState<(PdfMeta & { downloaded_at: string })[]>([]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: b }, { data: r }, { data: d }] = await Promise.all([
        supabase.from("bookmarks").select("pdf_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("recently_viewed").select("pdf_id, viewed_at").eq("user_id", user.id).order("viewed_at", { ascending: false }).limit(20),
        supabase.from("pdf_downloads").select("pdf_id, downloaded_at").eq("user_id", user.id).order("downloaded_at", { ascending: false }).limit(50),
      ]);
      const allIds = Array.from(new Set([
        ...(b ?? []).map((x: any) => x.pdf_id),
        ...(r ?? []).map((x: any) => x.pdf_id),
        ...(d ?? []).map((x: any) => x.pdf_id),
      ]));
      if (allIds.length === 0) { setBookmarks([]); setRecent([]); setDownloads([]); return; }
      const { data: pdfs } = await supabase.from("pdf_files").select("id,title,semester,subject,exam_type,year").in("id", allIds);
      const map = new Map<string, PdfMeta>();
      (pdfs ?? []).forEach((p: any) => map.set(p.id, p));
      setBookmarks((b ?? []).map((x: any) => map.get(x.pdf_id)).filter(Boolean) as PdfMeta[]);
      setRecent((r ?? []).map((x: any) => map.get(x.pdf_id)).filter(Boolean) as PdfMeta[]);
      setDownloads((d ?? []).map((x: any) => {
        const m = map.get(x.pdf_id);
        return m ? { ...m, downloaded_at: x.downloaded_at } : null;
      }).filter(Boolean) as any);
    })();
  }, [user?.id]);

  if (!user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold mb-4">My Library</h1>

        <Tabs defaultValue="bookmarks">
          <TabsList>
            <TabsTrigger value="bookmarks"><Bookmark className="h-4 w-4 mr-1" />Bookmarks ({bookmarks.length})</TabsTrigger>
            <TabsTrigger value="recent"><Clock className="h-4 w-4 mr-1" />Recent ({recent.length})</TabsTrigger>
            <TabsTrigger value="downloads"><Download className="h-4 w-4 mr-1" />Downloads ({downloads.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="bookmarks" className="mt-4 space-y-2">
            {bookmarks.length === 0 && <Empty msg="No bookmarks yet. Open any PDF and tap Save." />}
            {bookmarks.map((p) => <PdfRow key={p.id} pdf={p} />)}
          </TabsContent>
          <TabsContent value="recent" className="mt-4 space-y-2">
            {recent.length === 0 && <Empty msg="No recently viewed PDFs." />}
            {recent.map((p) => <PdfRow key={p.id} pdf={p} />)}
          </TabsContent>
          <TabsContent value="downloads" className="mt-4 space-y-2">
            {downloads.length === 0 && <Empty msg="No downloads yet." />}
            {downloads.map((p) => <PdfRow key={`${p.id}-${p.downloaded_at}`} pdf={p} stamp={p.downloaded_at} />)}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PdfRow({ pdf, stamp }: { pdf: PdfMeta; stamp?: string }) {
  return (
    <Link to="/pdf/$pdfId" params={{ pdfId: pdf.id }}>
      <Card className="p-3 flex items-center gap-3 hover:shadow-md transition">
        <FileText className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{pdf.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {SEMESTER_ORDINAL(pdf.semester)} Sem · {pdf.subject} · {examTypeLabel(pdf.exam_type)} · {pdf.year}
          </div>
          {stamp && <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(stamp).toLocaleString()}</div>}
        </div>
      </Card>
    </Link>
  );
}

function Empty({ msg }: { msg: string }) {
  return <Card className="p-6 text-center text-sm text-muted-foreground">{msg}</Card>;
}