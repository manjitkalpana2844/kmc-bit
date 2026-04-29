import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Share2, Lock, ZoomIn, ZoomOut, Loader2, Eye } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { examTypeLabel, SEMESTER_ORDINAL } from "@/lib/curriculum";
import { trackPdfView, logDownload } from "@/lib/tracking";
import { BookmarkButton } from "@/components/BookmarkButton";
import { PdfRating } from "@/components/PdfRating";
import { PdfComments } from "@/components/PdfComments";
import { PdfNotes } from "@/components/PdfNotes";
import { RelatedPdfs } from "@/components/RelatedPdfs";
import { checkViewBadges, checkDownloadBadges } from "@/lib/tracking";

export const Route = createFileRoute("/pdf/$pdfId")({
  component: PdfPage,
});

interface PdfRow {
  id: string;
  semester: number;
  subject: string;
  exam_type: string;
  year: number;
  title: string;
  file_path: string;
}

function PdfPage() {
  const { pdfId } = Route.useParams();
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pdf, setPdf] = useState<PdfRow | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [viewCount, setViewCount] = useState<number>(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    (async () => {
      const { data, error: e } = await supabase
        .from("pdf_files")
        .select("*")
        .eq("id", pdfId)
        .maybeSingle();
      if (e || !data) {
        setError("PDF not found or access denied.");
        return;
      }
      setPdf(data as PdfRow);
      const { data: sem } = await supabase
        .from("semester_status")
        .select("is_locked")
        .eq("semester", data.semester)
        .maybeSingle();
      const isLocked = sem?.is_locked ?? true;
      if (isLocked && !isAdmin) {
        setLocked(true);
        return;
      }
      const { data: signed } = await supabase.storage
        .from("pdfs")
        .createSignedUrl(data.file_path, 3600);
      setSignedUrl(signed?.signedUrl ?? null);
      // Track view + load count
      trackPdfView(pdfId);
      if (user) checkViewBadges(user.id);
      const { data: vc } = await supabase.from("pdf_views").select("view_count").eq("pdf_id", pdfId).maybeSingle();
      setViewCount(Number(vc?.view_count ?? 0) + 1);
    })();
  }, [pdfId, isAdmin]);

  const download = async () => {
    if (!pdf || !signedUrl || !user) return;
    const a = document.createElement("a");
    a.href = signedUrl;
    a.download = `${pdf.title}.pdf`;
    a.click();
    logDownload(pdf.id, user.id);
    checkDownloadBadges(user.id);
  };

  const share = async () => {
    if (!pdf) return;
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: pdf.title, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  if (!user) return null;

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-12 text-center max-w-md">
          <h1 className="text-xl font-bold mb-2">Not available</h1>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button asChild><Link to="/">Back to dashboard</Link></Button>
        </main>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-12 text-center max-w-md">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold mb-2">This PDF is locked</h1>
          <p className="text-sm text-muted-foreground mb-4">The semester is locked by the admin.</p>
          <Button asChild><Link to="/">Back to dashboard</Link></Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div className="min-w-0">
            <button
              onClick={() => navigate({ to: ".." as any })}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="text-xl sm:text-2xl font-bold truncate">{pdf?.title}</h1>
            {pdf && (
              <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>{SEMESTER_ORDINAL(pdf.semester)} Sem · {pdf.subject} · {examTypeLabel(pdf.exam_type)} · {pdf.year}</span>
                <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{viewCount} views</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(50, z - 10))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs w-10 text-center">{zoom}%</span>
            <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(200, z + 10))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            {pdf && <BookmarkButton pdfId={pdf.id} />}
            <Button variant="outline" size="sm" onClick={share}>
              <Share2 className="h-4 w-4 mr-1" />Share
            </Button>
            <Button size="sm" onClick={download}>
              <Download className="h-4 w-4 mr-1" />Download
            </Button>
          </div>
        </div>

        <Card className="flex-1 overflow-hidden p-0 min-h-[70vh]">
          {signedUrl ? (
            <div className="w-full h-full overflow-auto bg-muted flex justify-center">
              <iframe
                src={signedUrl}
                title={pdf?.title}
                className="bg-white"
                style={{
                  width: `${zoom}%`,
                  minWidth: "100%",
                  height: "80vh",
                  border: "none",
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-[70vh]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </Card>

        {pdf && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-5">
                <h3 className="font-semibold mb-2">Rate this paper</h3>
                <PdfRating pdfId={pdf.id} />
              </Card>
              <PdfComments pdfId={pdf.id} />
            </div>
            <div className="space-y-4">
              <PdfNotes pdfId={pdf.id} />
              <RelatedPdfs pdfId={pdf.id} semester={pdf.semester} subject={pdf.subject} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}