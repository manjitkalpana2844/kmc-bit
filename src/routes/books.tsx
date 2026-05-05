import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Library, Search, BookOpen, ArrowLeft } from "lucide-react";
import { SEMESTER_ORDINAL } from "@/lib/curriculum";

export const Route = createFileRoute("/books")({ component: BooksPage });

interface Book {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  semester: number | null;
  subject: string | null;
  cover_url: string | null;
}

function BooksPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  useEffect(() => {
    supabase.from("books").select("id,title,author,description,semester,subject,cover_url").order("created_at", { ascending: false }).then(({ data }) => {
      setBooks((data ?? []) as Book[]);
    });
  }, []);

  const filtered = books.filter((b) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (b.title + " " + (b.author ?? "") + " " + (b.subject ?? "")).toLowerCase().includes(s);
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-3">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-2 mb-4">
          <Library className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Reference Books</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Read curated reference books online. Reading-only — downloads are disabled.</p>
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search books, authors, subjects" className="pl-9" />
        </div>

        {filtered.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            No books found.
          </Card>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((b) => (
            <Link key={b.id} to="/books/$bookId" params={{ bookId: b.id }}>
              <Card className="overflow-hidden hover:shadow-md transition cursor-pointer h-full">
                <div className="aspect-[3/4] bg-muted flex items-center justify-center overflow-hidden">
                  {b.cover_url ? (
                    <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="p-3">
                  <div className="font-semibold text-sm line-clamp-2">{b.title}</div>
                  {b.author && <div className="text-xs text-muted-foreground mt-0.5 truncate">{b.author}</div>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {b.semester && <Badge variant="secondary" className="text-[10px]">{SEMESTER_ORDINAL(b.semester)} Sem</Badge>}
                    {b.subject && <Badge variant="outline" className="text-[10px]">{b.subject}</Badge>}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}