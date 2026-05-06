import { Link, useLocation } from "@tanstack/react-router";
import { Home, BookOpen, Library, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const items = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/books", label: "Books", icon: BookOpen, exact: false },
  { to: "/library", label: "Library", icon: Library, exact: false },
  { to: "/profile", label: "Profile", icon: UserIcon, exact: false },
] as const;

export function MobileBottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) return null;
  // Hide on login / admin-login
  if (pathname === "/login" || pathname === "/admin-login") return null;

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur-md"
      aria-label="Bottom navigation"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}