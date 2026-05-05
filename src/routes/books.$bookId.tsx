import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, BookOpen } from "lucide-react";
import { SEMESTER_ORDINAL } from "@/lib/curriculum";

export const Route = createFileRoute("/books/$bookId")({ component: BookReader });

function BookReader() {
  const { bookId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  useEffect(() => {
    (async () => {
      const { data, error: e } = await supabase.from("books").select("*").eq("id", bookId).maybeSingle();
      if (e || !data) { setError("Book not found."); return; }
      setBook(data);
      const { data: s } = await supabase.storage.from("books").createSignedUrl(data.file_path, 3600);
      setSignedUrl(s?.signedUrl ?? null);
    })();
  }, [bookId]);

  if (!user) return null;
  if (error) return (
    <div className="min-h-screen bg-background"><AppHeader />
      <main className="container mx-auto px-4 py-12 text-center max-w-md">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Not available</h1>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button asChild><Link to="/books">Back to books</Link></Button>
      </main>
    </div>
  );

  // Append toolbar/download disable hints to the URL fragment for built-in viewers
  const viewerUrl = signedUrl ? `${signedUrl}#toolbar=0&navpanes=0` : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 flex-1 flex flex-col">
        <Link to="/books" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to books
        </Link>
        {book && (
          <div className="mb-4">
            <h1 className="text-xl sm:text-2xl font-bold">{book.title}</h1>
            <p className="text-xs text-muted-foreground">
              {book.author && <>by {book.author} · </>}
              {book.semester && <>{SEMESTER_ORDINAL(book.semester)} Sem · </>}
              {book.subject}
            </p>
            {book.description && <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{book.description}</p>}
            <p className="text-[11px] text-muted-foreground mt-2">📖 Read-only · Downloading is disabled.</p>
          </div>
        )}
        <Card
          className="flex-1 overflow-hidden p-0 min-h-[70vh] relative"
          onContextMenu={(e) => e.preventDefault()}
        >
          {viewerUrl ? (
            <iframe
              src={viewerUrl}
              title={book?.title}
              className="w-full h-[80vh] bg-white"
              style={{ border: "none" }}
            />
          ) : (
            <div className="flex items-center justify-center h-[70vh]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {/* Overlay layer to mute right-click; iframe-internal toolbar may still allow saving — not bulletproof */}
        </Card>
      </main>
    </div>
  );
}