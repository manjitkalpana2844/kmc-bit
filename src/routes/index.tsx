import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Lock, Search, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SEMESTER_SUBJECTS, SEMESTER_ORDINAL } from "@/lib/curriculum";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [locked, setLocked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("semester_status").select("*").then(({ data }) => {
      const m: Record<number, boolean> = {};
      (data ?? []).forEach((r: { semester: number; is_locked: boolean }) => {
        m[r.semester] = r.is_locked;
      });
      setLocked(m);
    });
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = Object.keys(SEMESTER_SUBJECTS).map(Number).sort((a, b) => a - b);
    if (!q) return all;
    return all.filter((sem) =>
      SEMESTER_SUBJECTS[sem].some((s) => s.toLowerCase().includes(q))
    );
  }, [search]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <div
          className="rounded-2xl p-6 sm:p-8 mb-8 text-primary-foreground"
          style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-elegant)" }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold">
            Welcome, {profile?.name?.split(" ")[0] ?? "Student"} 👋
          </h1>
          <p className="opacity-90 text-sm sm:text-base mt-1">
            Bachelor in Information Technology — Kailali Multiple Campus
          </p>
          <p className="opacity-75 text-xs mt-1">Owner: Manjit Rana</p>
        </div>

        <div className="relative mb-6 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects (e.g. Java, DBMS, AI…)"
            className="pl-9"
          />
        </div>

        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Semesters
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((sem) => {
            const isLocked = locked[sem] ?? true;
            const subjects = SEMESTER_SUBJECTS[sem];
            const card = (
              <Card
                className={`group relative overflow-hidden p-5 transition-all h-full ${
                  isLocked
                    ? "opacity-70 cursor-not-allowed"
                    : "cursor-pointer hover:-translate-y-1 hover:shadow-lg"
                }`}
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-sm"
                    style={{ background: isLocked ? "var(--muted)" : "var(--gradient-primary)" }}
                  >
                    {sem}
                  </div>
                  {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="font-semibold">{SEMESTER_ORDINAL(sem)} Semester</div>
                <div className="text-xs text-muted-foreground mt-1">{subjects.length} subjects</div>
                {isLocked && (
                  <div className="text-[10px] mt-2 text-muted-foreground italic">Locked by admin</div>
                )}
              </Card>
            );
            return isLocked ? (
              <div key={sem}>{card}</div>
            ) : (
              <Link key={sem} to="/semester/$sem" params={{ sem: String(sem) }}>
                {card}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}