import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Lock, Search, BookOpen, Crown, Clock, FileText, ChevronRight, GraduationCap, Sparkles, Library, BookMarked, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SEMESTER_SUBJECTS, SEMESTER_ORDINAL } from "@/lib/curriculum";
import { daysLeft } from "@/lib/tracking";
import { StreakBadge } from "@/components/StreakBadge";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, profile, loading, hasActiveAccess, accessExpiresAt, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [locked, setLocked] = useState<Record<number, boolean>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [showSuggest, setShowSuggest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const suppressBlurRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("semester_status").select("*");
      const m: Record<number, boolean> = {};
      (data ?? []).forEach((r: { semester: number; is_locked: boolean }) => {
        m[r.semester] = r.is_locked;
      });
      setLocked(m);
    };
    load();
    const ch = supabase
      .channel("semester_status:all")
      .on("postgres_changes", { event: "*", schema: "public", table: "semester_status" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const allSemesters = useMemo(
    () => Object.keys(SEMESTER_SUBJECTS).map(Number).sort((a, b) => a - b),
    [],
  );

  const rawQuery = search.trim().toLowerCase();
  const [debouncedQuery, setDebouncedQuery] = useState(rawQuery);
  const isComputing = rawQuery !== debouncedQuery;

  useEffect(() => {
    if (rawQuery === "") {
      setDebouncedQuery("");
      return;
    }
    const t = window.setTimeout(() => setDebouncedQuery(rawQuery), 120);
    return () => window.clearTimeout(t);
  }, [rawQuery]);

  const query = debouncedQuery;

  const filtered = useMemo(() => {
    if (!query) return allSemesters;
    return allSemesters.filter((sem) =>
      SEMESTER_SUBJECTS[sem].some((s) => s.toLowerCase().includes(query)),
    );
  }, [query, allSemesters]);

  // Flat search results: every subject matching the query, with its semester
  const subjectMatches = useMemo(() => {
    if (!query) return [] as { sem: number; subject: string }[];
    const out: { sem: number; subject: string }[] = [];
    for (const sem of allSemesters) {
      for (const subject of SEMESTER_SUBJECTS[sem]) {
        if (subject.toLowerCase().includes(query)) out.push({ sem, subject });
      }
    }
    return out.slice(0, 12);
  }, [query, allSemesters]);

  // Reset highlighted suggestion as the query changes
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Keep the active suggestion scrolled into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, subjectMatches.length]);

  function openSubject(sem: number, subject: string) {
    const isLocked = locked[sem] ?? true;
    if (isLocked) {
      toast.error(`${SEMESTER_ORDINAL(sem)} Semester is locked`, {
        description: `"${subject}" isn't available yet. Please check back later or contact admin.`,
      });
      return;
    }
    setShowSuggest(false);
    navigate({
      to: "/subject/$sem/$subject",
      params: { sem: String(sem), subject },
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!query || subjectMatches.length === 0) {
      if (e.key === "Escape") {
        setSearch("");
        setShowSuggest(false);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggest(true);
      setActiveIdx((i) => (i + 1) % subjectMatches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setShowSuggest(true);
      setActiveIdx((i) => (i - 1 + subjectMatches.length) % subjectMatches.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(subjectMatches.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const m = subjectMatches[activeIdx];
      if (m) openSubject(m.sem, m.subject);
    } else if (e.key === "Escape") {
      setShowSuggest(false);
    }
  }

  // Highlight matching substring inside a subject label
  function Highlight({ text }: { text: string }) {
    if (!query) return <>{text}</>;
    const lower = text.toLowerCase();
    const parts: React.ReactNode[] = [];
    let i = 0;
    while (i < text.length) {
      const idx = lower.indexOf(query, i);
      if (idx === -1) {
        parts.push(text.slice(i));
        break;
      }
      if (idx > i) parts.push(text.slice(i, idx));
      parts.push(
        <mark
          key={idx}
          className="bg-primary/20 text-foreground rounded px-0.5"
        >
          {text.slice(idx, idx + query.length)}
        </mark>,
      );
      i = idx + query.length;
    }
    return <>{parts}</>;
  }

  const unlockedCount = allSemesters.filter((s) => !(locked[s] ?? true)).length;
  const totalSubjects = allSemesters.reduce((n, s) => n + SEMESTER_SUBJECTS[s].length, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <AppHeader />
          <h1 className="mt-8 text-2xl font-bold text-foreground">Sign in to continue</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Access your BIT question bank dashboard and saved study tools.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link to="/login">Open login</Link>
          </Button>
        </div>
      </div>
    );
  }

  const initials = (profile?.name ?? user.email ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        {/* Hero / profile card */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 sm:p-8 mb-6 text-primary-foreground"
          style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-elegant)" }}
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute -left-8 -bottom-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />

          <div className="relative flex items-start gap-4">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 ring-2 ring-white/40 shrink-0">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-white/20 text-primary-foreground font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                  Welcome, {profile?.name?.split(" ")[0] ?? "Student"} 👋
                </h1>
                {hasActiveAccess && (
                  <Badge className="bg-white/20 text-primary-foreground border-0 hover:bg-white/30">
                    <Sparkles className="h-3 w-3 mr-1" />Active
                  </Badge>
                )}
                {isAdmin && (
                  <Badge className="bg-accent text-accent-foreground border-0">Admin</Badge>
                )}
              </div>
              <p className="opacity-90 text-sm sm:text-base mt-1 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" />
                BIT — Far Western University
              </p>
              <p className="opacity-75 text-xs mt-0.5 truncate">{profile?.email ?? user.email}</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="relative grid grid-cols-3 gap-3 mt-5">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wide opacity-75">Semesters</div>
              <div className="font-bold text-lg leading-tight">{unlockedCount}<span className="opacity-60 text-sm">/{allSemesters.length}</span></div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wide opacity-75">Subjects</div>
              <div className="font-bold text-lg leading-tight">{totalSubjects}</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wide opacity-75">Status</div>
              <div className="font-bold text-lg leading-tight">
                {hasActiveAccess ? "Pro" : "Free"}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6"><StreakBadge /></div>

        {/* Search */}
        <div className="relative mb-6 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowSuggest(true); }}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => {
              // If the user is tapping/clicking inside the suggestion list,
              // don't close — the click handler will close it after firing.
              setTimeout(() => {
                if (suppressBlurRef.current) {
                  suppressBlurRef.current = false;
                  return;
                }
                setShowSuggest(false);
              }, 150);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search subjects (e.g. Java, DBMS, AI…)"
            className="pl-9 h-11"
            role="combobox"
            aria-expanded={showSuggest && query.length > 0}
            aria-controls="subject-suggest-list"
            aria-activedescendant={
              showSuggest && subjectMatches[activeIdx]
                ? `suggest-${activeIdx}`
                : undefined
            }
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setSearch(""); setShowSuggest(false); inputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded"
            >
              Clear
            </button>
          )}

          {/* Auto-suggest dropdown */}
          {showSuggest && rawQuery && (
            <Card
              className="absolute z-30 left-0 right-0 mt-2 p-1 max-h-80 overflow-auto shadow-lg animate-fade-in"
              onPointerDown={() => { suppressBlurRef.current = true; }}
            >
              {isComputing ? (
                <ul
                  className="text-sm"
                  aria-busy="true"
                  aria-live="polite"
                  aria-label="Loading suggestions"
                >
                  {[0, 1, 2, 3].map((i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 px-2 py-2 rounded-md"
                    >
                      <Skeleton className="h-7 w-7 rounded-md shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/5" />
                        <Skeleton className="h-2.5 w-1/3" />
                      </div>
                      <Skeleton className="h-4 w-4 rounded-sm" />
                    </li>
                  ))}
                </ul>
              ) : subjectMatches.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">
                  No matches for "<span className="text-foreground font-medium">{query}</span>"
                </div>
              ) : (
                <ul
                  id="subject-suggest-list"
                  ref={listRef}
                  role="listbox"
                  className="text-sm"
                >
                  {subjectMatches.map(({ sem, subject }, idx) => {
                    const isLocked = locked[sem] ?? true;
                    const isActive = idx === activeIdx;
                    return (
                      <li
                        key={`${sem}-${subject}`}
                        id={`suggest-${idx}`}
                        data-idx={idx}
                        role="option"
                        aria-selected={isActive}
                        tabIndex={-1}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => openSubject(sem, subject)}
                        className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer touch-manipulation select-none ${
                          isActive ? "bg-muted" : ""
                        } ${isLocked ? "opacity-60" : ""}`}
                      >
                        <div
                          className="h-7 w-7 rounded-md flex items-center justify-center text-[11px] font-bold text-primary-foreground shrink-0"
                          style={{ background: isLocked ? "var(--muted)" : "var(--gradient-primary)" }}
                        >
                          {sem}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate"><Highlight text={subject} /></span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {SEMESTER_ORDINAL(sem)} Semester
                          </div>
                        </div>
                        {isLocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="px-2 py-1.5 text-[10px] text-muted-foreground border-t mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                <span><kbd className="px-1 rounded bg-muted">↑</kbd> <kbd className="px-1 rounded bg-muted">↓</kbd> navigate</span>
                <span><kbd className="px-1 rounded bg-muted">Enter</kbd> open</span>
                <span><kbd className="px-1 rounded bg-muted">Esc</kbd> close</span>
              </div>
            </Card>
          )}
        </div>

        {/* Live subject matches */}
        {query && (
          <Card className="p-3 mb-6 animate-fade-in">
            <div className="text-xs text-muted-foreground px-2 pb-2">
              {subjectMatches.length} subject{subjectMatches.length === 1 ? "" : "s"} matching "{query}"
            </div>
            {subjectMatches.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">No subjects found. Try a different keyword.</div>
            ) : (
              <ul className="divide-y">
                {subjectMatches.map(({ sem, subject }) => {
                  const isLocked = locked[sem] ?? true;
                  const row = (
                    <div className="flex items-center gap-3 px-2 py-2.5">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
                        style={{ background: isLocked ? "var(--muted)" : "var(--gradient-primary)" }}
                      >
                        {sem}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <Highlight text={subject} />
                        </div>
                        <div className="text-[11px] text-muted-foreground">{SEMESTER_ORDINAL(sem)} Semester</div>
                      </div>
                      {isLocked ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                  return (
                    <li key={`${sem}-${subject}`}>
                      {isLocked ? (
                        <button
                          type="button"
                          onClick={() => openSubject(sem, subject)}
                          className="block w-full text-left opacity-60 hover:bg-muted/50 rounded-md transition-colors touch-manipulation"
                          aria-label={`${subject} (locked)`}
                        >
                          {row}
                        </button>
                      ) : (
                        <Link
                          to="/subject/$sem/$subject"
                          params={{ sem: String(sem), subject }}
                          className="block hover:bg-muted/50 rounded-md transition-colors"
                        >
                          {row}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Semesters
          </h2>
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {allSemesters.length}
          </span>
        </div>
        {!hasActiveAccess && (
          <Card className="p-4 mb-4 flex flex-wrap items-center gap-3" style={{ background: "var(--gradient-primary)" }}>
            <Crown className="h-5 w-5 text-primary-foreground" />
            <div className="flex-1 min-w-0 text-primary-foreground">
              <div className="font-semibold text-sm">Unlock all PDFs</div>
              <div className="text-xs opacity-90">Semester Pass Rs 599 · Monthly All Access Rs 199</div>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link to="/get-access">Get Access</Link>
            </Button>
          </Card>
        )}
        {hasActiveAccess && accessExpiresAt && (() => {
          const left = daysLeft(accessExpiresAt);
          if (left === null || left > 7) return null;
          return (
            <Card className="p-4 mb-4 flex flex-wrap items-center gap-3 border-destructive/40">
              <Clock className="h-5 w-5 text-destructive" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {left === 0 ? "Access expires today" : `Access expires in ${left} day${left === 1 ? "" : "s"}`}
                </div>
                <div className="text-xs text-muted-foreground">Renew now to keep your access uninterrupted.</div>
              </div>
              <Button asChild size="sm"><Link to="/get-access">Renew</Link></Button>
            </Card>
          );
        })()}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
          {filtered.map((sem) => {
            const isLocked = locked[sem] ?? true;
            const subjects = SEMESTER_SUBJECTS[sem];
            const card = (
              <Card
                className={`group relative overflow-hidden p-5 h-full ${
                  isLocked
                    ? "opacity-75 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {!isLocked && (
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1 opacity-80"
                    style={{ background: "var(--gradient-primary)" }}
                  />
                )}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-sm"
                    style={{ background: isLocked ? "var(--muted)" : "var(--gradient-primary)" }}
                  >
                    {sem}
                  </div>
                  {isLocked ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Open</Badge>
                  )}
                </div>
                <div className="font-semibold">{SEMESTER_ORDINAL(sem)} Semester</div>
                <div className="text-xs text-muted-foreground mt-1">{subjects.length} subjects</div>
                {query && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {subjects
                      .filter((s) => s.toLowerCase().includes(query))
                      .slice(0, 2)
                      .map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px] font-normal">
                          {s}
                        </Badge>
                      ))}
                  </div>
                )}
                {isLocked && !query && (
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
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-8">
              No semesters match your search.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}