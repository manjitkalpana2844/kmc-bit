import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  login_provider: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  hasActiveAccess: boolean;
  accessExpiresAt: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasActiveAccess, setHasActiveAccess] = useState(false);
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const authReadyRef = useRef(false);

  const resetUserData = () => {
    setProfile(null);
    setIsAdmin(false);
    setHasActiveAccess(false);
    setAccessExpiresAt(null);
  };

  const loadUserData = async (uid: string) => {
    try {
      const [{ data: prof }, { data: roles }, { data: access }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase
          .from("user_access")
          .select("is_active, expires_at")
          .eq("user_id", uid)
          .eq("is_active", true),
      ]);
      setProfile(prof as Profile | null);
      setIsAdmin((roles ?? []).some((r: { role: string }) => r.role === "admin"));
      const now = Date.now();
      const activeRows = (access ?? []).filter(
        (a: { is_active: boolean; expires_at: string | null }) =>
          a.is_active && (!a.expires_at || new Date(a.expires_at).getTime() > now),
      );
      setHasActiveAccess(activeRows.length > 0);
      // Earliest upcoming expiry among active rows (null = lifetime)
      const expiries = activeRows
        .map((a: any) => a.expires_at)
        .filter((e: string | null): e is string => !!e)
        .sort();
      setAccessExpiresAt(activeRows.some((a: any) => !a.expires_at) ? null : expiries[0] ?? null);
    } catch (error) {
      console.error("Unable to load user data", error);
      resetUserData();
    }
  };

  useEffect(() => {
    const markReady = () => {
      authReadyRef.current = true;
      setLoading(false);
    };

    const fallback = window.setTimeout(() => {
      if (!authReadyRef.current) {
        console.warn("Auth session check timed out; continuing without blocking the UI.");
        markReady();
      }
    }, 3000);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      markReady();
      if (sess?.user) {
        setTimeout(() => loadUserData(sess.user.id), 0);
      } else {
        resetUserData();
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: sess } }) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        markReady();
        if (sess?.user) loadUserData(sess.user.id);
        else resetUserData();
      })
      .catch((error) => {
        console.error("Unable to restore session", error);
        setSession(null);
        setUser(null);
        resetUserData();
        markReady();
      });

    return () => {
      window.clearTimeout(fallback);
      sub.subscription.unsubscribe();
    };
  }, []);

  // Live-sync access changes (admin lock/unlock/grant) to the user's session
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user_access:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_access", filter: `user_id=eq.${user.id}` },
        () => loadUserData(user.id),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    setHasActiveAccess(false);
    setAccessExpiresAt(null);
  };

  const refreshRole = async () => {
    if (user) await loadUserData(user.id);
  };

  const refreshProfile = async () => {
    if (user) await loadUserData(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, hasActiveAccess, accessExpiresAt, loading, signOut, refreshRole, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}