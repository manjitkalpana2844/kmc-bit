import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { GraduationCap } from "lucide-react";

interface Props {
  onLongPress?: () => void;
  size?: "sm" | "md" | "lg";
}

export function AppLogo({ onLongPress, size = "md" }: Props) {
  const navigate = useNavigate();
  const timer = useRef<number | null>(null);
  const triggered = useRef(false);
  const [holding, setHolding] = useState(false);

  const start = () => {
    triggered.current = false;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      triggered.current = true;
      setHolding(false);
      try { navigator.vibrate?.(50); } catch {}
      if (onLongPress) onLongPress();
      else navigate({ to: "/admin-login" });
    }, 600);
  };
  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };

  const sizes = {
    sm: "h-9 w-9",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <button
      type="button"
      onMouseDown={start}
      onMouseUp={clear}
      onMouseLeave={clear}
      onTouchStart={start}
      onTouchEnd={clear}
      onTouchCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
      className={`${sizes[size]} rounded-2xl flex items-center justify-center select-none cursor-pointer transition-all ${holding ? "scale-110 ring-4 ring-primary/40" : "active:scale-95"}`}
      style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)", touchAction: "none" }}
      aria-label="FWU BIT logo"
    >
      <GraduationCap className="text-primary-foreground" />
    </button>
  );
}