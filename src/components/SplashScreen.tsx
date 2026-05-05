import { GraduationCap } from "lucide-react";

export function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
      role="status"
      aria-label="Loading FWU BIT"
    >
      <div
        className="h-20 w-20 rounded-3xl flex items-center justify-center animate-in fade-in zoom-in duration-500"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
      >
        <GraduationCap className="h-10 w-10 text-primary-foreground" />
      </div>
      <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
        <h1 className="text-lg font-bold">FWU BIT</h1>
        <p className="text-xs text-muted-foreground mt-1">Far Western University</p>
      </div>
      <div className="mt-8 flex gap-1.5">
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}