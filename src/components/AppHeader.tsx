import { Link, useNavigate } from "@tanstack/react-router";
import { Moon, Sun, LogOut, Shield, BookOpen, User as UserIcon, BadgeCheck, Crown, Library, MessageSquare, UserCog, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { AppLogo } from "./AppLogo";
import { NotificationBell } from "./NotificationBell";

export function AppHeader() {
  const { user, profile, isAdmin, hasActiveAccess, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const initials = (profile?.name ?? profile?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 min-w-0">
          <AppLogo size="sm" />
          <div className="hidden sm:block min-w-0">
            <div className="font-bold text-sm leading-tight truncate">BIT KMC Question Bank</div>
            <div className="text-[10px] text-muted-foreground truncate">Kailali Multiple Campus</div>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {isAdmin && (
            <Button asChild variant="outline" size="sm" className="hidden sm:flex">
              <Link to="/admin">
                <Shield className="h-4 w-4 mr-1" />
                Admin
              </Link>
            </Button>
          )}
          {user && <NotificationBell />}
          {user && (
            <Button asChild variant="ghost" size="icon" aria-label="Search">
              <Link to="/search"><Search className="h-5 w-5" /></Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  {hasActiveAccess && (
                    <BadgeCheck
                      className="h-4 w-4 absolute -bottom-0.5 -right-0.5 text-primary fill-background"
                      aria-label="Verified paid member"
                    />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium flex items-center gap-1">
                    {profile?.name ?? "Student"}
                    {hasActiveAccess && (
                      <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-normal truncate">{profile?.email}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-[10px] inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {isAdmin ? "Admin" : "Student"}
                    </span>
                    {hasActiveAccess && (
                      <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        <BadgeCheck className="h-3 w-3" />Verified
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/"><BookOpen className="h-4 w-4 mr-2" />Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/library"><Library className="h-4 w-4 mr-2" />My Library</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile"><UserCog className="h-4 w-4 mr-2" />Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/feedback"><MessageSquare className="h-4 w-4 mr-2" />Contact admin</Link>
                </DropdownMenuItem>
                {!hasActiveAccess && (
                  <DropdownMenuItem asChild>
                    <Link to="/get-access"><Crown className="h-4 w-4 mr-2" />Get Access</Link>
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem asChild className="sm:hidden">
                    <Link to="/admin"><Shield className="h-4 w-4 mr-2" />Admin Panel</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link to="/login"><UserIcon className="h-4 w-4 mr-1" />Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}