import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, Loader2, User, Sparkles, ShieldCheck, BookOpen, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppLogo } from "@/components/AppLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUnconfirmedEmail(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("not confirmed") || msg.includes("email not confirmed")) {
        setUnconfirmedEmail(email);
        toast.error("Please verify your email before signing in.");
      } else {
        toast.error(error.message);
      }
    } else navigate({ to: "/" });
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Enforce verification: if a session was returned (auto-confirm enabled), sign out.
    if (data.session) {
      await supabase.auth.signOut();
    }
    setPendingEmail(email);
    toast.success("Account created. Check your email to verify.");
  };

  const resendConfirmation = async (target: string) => {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: target,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email sent.");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-background overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gradient-primary)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--gradient-primary)" }}
      />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-6">
          <AppLogo size="lg" />
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">FWU BIT</h1>
            <p className="text-xs text-muted-foreground mt-1">Far Western University · BIT Program</p>
            <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3 text-primary" />Past papers</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" />Notes</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-primary" />Secure</span>
            </div>
          </div>
        </div>

        <Card className="p-6 border-border/60 backdrop-blur-sm bg-card/95" style={{ boxShadow: "var(--shadow-elegant)" }}>
          {pendingEmail ? (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MailCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Verify your email</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We sent a verification link to{" "}
                  <span className="font-medium text-foreground">{pendingEmail}</span>. Click it to
                  activate your account, then sign in.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => resendConfirmation(pendingEmail)} disabled={resending}>
                  {resending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Resend verification email
                </Button>
                <Button variant="ghost" onClick={() => setPendingEmail(null)}>
                  Back to sign in
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={onSignIn} className="space-y-3">
                  <div>
                    <Label htmlFor="si-email">Email</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="si-pass">Password</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="si-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Sign In
                  </Button>
                  {unconfirmedEmail && (
                    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-2">
                      <p className="text-muted-foreground">
                        Your email{" "}
                        <span className="font-medium text-foreground">{unconfirmedEmail}</span>{" "}
                        isn't verified yet.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => resendConfirmation(unconfirmedEmail)}
                        disabled={resending}
                      >
                        {resending && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                        Resend verification email
                      </Button>
                    </div>
                  )}
                  <Link to="/reset-password" className="block text-xs text-center text-primary hover:underline">
                    Forgot password?
                  </Link>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={onSignUp} className="space-y-3">
                  <div>
                    <Label htmlFor="su-name">Full name</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="su-name" required value={name} onChange={(e) => setName(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="su-email">Email</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="su-pass">Password</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="su-pass" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">At least 6 characters</p>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </Card>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          By continuing, you agree to use this platform for academic purposes.
        </p>
      </div>
    </div>
  );
}
