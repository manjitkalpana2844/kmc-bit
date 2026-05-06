import { Link, useLocation, useRouter } from "@tanstack/react-router";
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
  const hide = pathname === "/" || pathname === "/login" || pathname === "/admin-login";
  if (hide) return null;

  const onBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    }
  };

  return (
    <div className={`fixed top-20 left-3 z-30 sm:hidden ${className}`}>
      {typeof window !== "undefined" && window.history.length > 1 ? (
        <Button variant="secondary" size="icon" onClick={onBack} aria-label="Go back" className="rounded-full shadow-md h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      ) : (
        <Button asChild variant="secondary" size="icon" aria-label="Home" className="rounded-full shadow-md h-9 w-9">
          <Link to={fallbackTo}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
      )}
    </div>
  );
}