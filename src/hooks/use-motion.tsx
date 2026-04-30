import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type MotionPref = "auto" | "on" | "off";
const KEY = "motion-pref";

interface MotionCtx {
  pref: MotionPref;
  setPref: (p: MotionPref) => void;
  reduced: boolean; // true if motion should be reduced right now
  syncing: boolean;
}

const Ctx = createContext<MotionCtx | undefined>(undefined);

function readPref(): MotionPref {
  if (typeof window === "undefined") return "auto";
  const v = window.localStorage.getItem(KEY);
  return v === "on" || v === "off" ? v : "auto";
}

function systemPrefersReduced(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function computeReduced(p: MotionPref): boolean {
  if (p === "off") return true;
  if (p === "on") return false;
  return systemPrefersReduced();
}

function apply(reduced: boolean) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (reduced) html.setAttribute("data-reduce-motion", "true");
  else html.removeAttribute("data-reduce-motion");
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<MotionPref>("auto");
  const [reduced, setReduced] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Initial sync (client only)
  useEffect(() => {
    const p = readPref();
    const r = computeReduced(p);
    setPrefState(p);
    setReduced(r);
    apply(r);
  }, []);

  // Track auth + pull remote preference whenever the user changes
  useEffect(() => {
    let cancelled = false;

    const pullRemote = async (uid: string | null) => {
      setUserId(uid);
      if (!uid) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("motion_pref")
        .eq("id", uid)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const remote = (data as { motion_pref?: string }).motion_pref;
      const valid: MotionPref =
        remote === "on" || remote === "off" || remote === "auto" ? remote : "auto";
      // Remote wins on login so the choice follows the user across devices
      if (typeof window !== "undefined") {
        if (valid === "auto") window.localStorage.removeItem(KEY);
        else window.localStorage.setItem(KEY, valid);
      }
      const r = computeReduced(valid);
      setPrefState(valid);
      setReduced(r);
      apply(r);
    };

    supabase.auth.getUser().then(({ data }) => pullRemote(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      pullRemote(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Watch system preference when on auto
  useEffect(() => {
    if (pref !== "auto" || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => {
      const r = mq.matches;
      setReduced(r);
      apply(r);
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [pref]);

  const setPref = useCallback((p: MotionPref) => {
    if (typeof window !== "undefined") {
      if (p === "auto") window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, p);
    }
    const r = computeReduced(p);
    setPrefState(p);
    setReduced(r);
    apply(r);
    if (userId) {
      setSyncing(true);
      supabase
        .from("profiles")
        .update({ motion_pref: p })
        .eq("id", userId)
        .then(() => setSyncing(false));
    }
  }, [userId]);

  return <Ctx.Provider value={{ pref, setPref, reduced, syncing }}>{children}</Ctx.Provider>;
}

export function useMotion() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMotion must be used within MotionProvider");
  return ctx;
}