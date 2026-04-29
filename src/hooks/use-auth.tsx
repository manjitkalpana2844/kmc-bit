import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasActiveAccess, setHasActiveAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string) => {
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
    setHasActiveAccess(
      (access ?? []).some(
        (a: { is_active: boolean; expires_at: string | null }) =>
          a.is_active && (!a.expires_at || new Date(a.expires_at).getTime() > now),
      ),
    );
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadUserData(sess.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setHasActiveAccess(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadUserData(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
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
  };

  const refreshRole = async () => {
    if (user) await loadUserData(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, isAdmin, hasActiveAccess, loading, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}