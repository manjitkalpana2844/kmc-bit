import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { GraduationCap } from "lucide-react";

interface Props {
  onLongPress?: () => void;
  size?: "sm" | "md" | "lg";
}

export function AppLogo({ onLongPress, size = "md" }: Props) {
  const navigate = useNavigate();
  const timer = useRef<number | null>(null);
  const triggered = useRef(false);

  const start = () => {
    triggered.current = false;
    timer.current = window.setTimeout(() => {
      triggered.current = true;
      if (onLongPress) onLongPress();
      else navigate({ to: "/admin-login" });
    }, 900);
  };
  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
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
      onContextMenu={(e) => e.preventDefault()}
      className={`${sizes[size]} rounded-2xl flex items-center justify-center select-none cursor-pointer transition-transform active:scale-95`}
      style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
      aria-label="BIT KMC logo"
    >
      <GraduationCap className="text-primary-foreground" />
    </button>
  );
}