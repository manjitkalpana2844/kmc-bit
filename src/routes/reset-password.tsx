import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setRecovery(true);
    }
  }, []);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Reset link sent. Check your inbox.");
  };

  const updatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Password updated. You can sign in now.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-bold mb-1">{recovery ? "Set new password" : "Reset password"}</h1>
        <p className="text-xs text-muted-foreground mb-4">
          {recovery ? "Enter your new password below." : "Enter your email and we'll send you a reset link."}
        </p>
        {recovery ? (
          <form onSubmit={updatePass} className="space-y-3">
            <div>
              <Label htmlFor="np">New password</Label>
              <Input id="np" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Password
            </Button>
          </form>
        ) : (
          <form onSubmit={sendReset} className="space-y-3">
            <div>
              <Label htmlFor="re">Email</Label>
              <Input id="re" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Reset Link
            </Button>
          </form>
        )}
        <Link to="/login" className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-4 hover:text-primary">
          <ArrowLeft className="h-3 w-3" /> Back to login
        </Link>
      </Card>
    </div>
  );
}