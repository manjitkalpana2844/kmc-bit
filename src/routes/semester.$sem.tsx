import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, BookMarked, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEMESTER_SUBJECTS, SEMESTER_ORDINAL } from "@/lib/curriculum";
import { useState } from "react";

export const Route = createFileRoute("/semester/$sem")({
  component: SemesterPage,
});

function SemesterPage() {
  const { sem } = Route.useParams();
  const semNum = Number(sem);
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    supabase
      .from("semester_status")
      .select("is_locked")
      .eq("semester", semNum)
      .maybeSingle()
      .then(({ data }) => setLocked(data?.is_locked ?? true));
  }, [semNum]);

  const subjects = SEMESTER_SUBJECTS[semNum] ?? [];

  if (!user || locked === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>
    );
  }

  if (locked && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-12 max-w-md text-center">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Semester locked</h1>
          <p className="text-muted-foreground mb-6">
            {SEMESTER_ORDINAL(semNum)} Semester is currently locked by the admin.
          </p>
          <Button asChild><Link to="/">Back to dashboard</Link></Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center text-primary-foreground font-bold"
            style={{ background: "var(--gradient-primary)" }}
          >
            {semNum}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{SEMESTER_ORDINAL(semNum)} Semester</h1>
            <p className="text-xs text-muted-foreground">Select a subject to view papers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <Link
              key={subject}
              to="/subject/$sem/$subject"
              params={{ sem: String(semNum), subject: encodeURIComponent(subject) }}
            >
              <Card
                className="p-5 hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer h-full"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <BookMarked className="h-7 w-7 text-primary mb-3" />
                <div className="font-semibold">{subject}</div>
                <div className="text-xs text-muted-foreground mt-1">View papers & notes</div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}