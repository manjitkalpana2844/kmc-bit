import { useEffect, useState, type ReactNode } from "react";
import { SplashScreen } from "./SplashScreen";

const SESSION_KEY = "bitkmc_splash_shown";
const MIN_DURATION = 1400;

export function SplashGate({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(SESSION_KEY) !== "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {}
      setShow(false);
    }, MIN_DURATION);
    return () => window.clearTimeout(t);
  }, [show]);

  return (
    <>
      {children}
      {show && <SplashScreen />}
    </>
  );
}