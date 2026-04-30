import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

type MotionPref = "auto" | "on" | "off";
const KEY = "motion-pref";

interface MotionCtx {
  pref: MotionPref;
  setPref: (p: MotionPref) => void;
  reduced: boolean; // true if motion should be reduced right now
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

  // Initial sync (client only)
  useEffect(() => {
    const p = readPref();
    const r = computeReduced(p);
    setPrefState(p);
    setReduced(r);
    apply(r);
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
  }, []);

  return <Ctx.Provider value={{ pref, setPref, reduced }}>{children}</Ctx.Provider>;
}

export function useMotion() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMotion must be used within MotionProvider");
  return ctx;
}