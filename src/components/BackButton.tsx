import { useEffect, useState } from "react";
import { useLocation, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  fallbackTo?: string;
  className?: string;
}

/** Floating top-left back arrow. Hidden on home and login. */
export function BackButton({ fallbackTo = "/", className = "" }: Props) {
  const router = useRouter();
  const { pathname } = useLocation();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  const hide = pathname === "/" || pathname === "/login" || pathname === "/admin-login";
  if (hide) return null;

  const onBack = () => {
    if (canGoBack) {
      router.history.back();
    } else {
      router.navigate({ to: fallbackTo });
    }
  };

  return (
    <div className={`fixed top-20 left-3 z-30 sm:hidden ${className}`}>
      <Button variant="secondary" size="icon" onClick={onBack} aria-label="Go back" className="rounded-full shadow-md h-9 w-9">
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </div>
  );
}