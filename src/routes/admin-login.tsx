import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    setLoading(false);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      await supabase.auth.signOut();
      toast.error("This account is not an admin");
      return;
    }
    toast.success("Welcome, admin");
    navigate({ to: "/admin" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="p-6" style={{ boxShadow: "var(--shadow-elegant)" }}>
          <div className="flex flex-col items-center mb-4">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Shield className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">Admin Login</h1>
            <p className="text-xs text-muted-foreground mt-1">Restricted access · BIT KMC</p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label htmlFor="ae">Admin email</Label>
              <Input id="ae" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ap">Password</Label>
              <Input id="ap" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sign In as Admin
            </Button>
          </form>
          <Link to="/login" className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-4 hover:text-primary">
            <ArrowLeft className="h-3 w-3" /> Back to student login
          </Link>
        </Card>
      </div>
    </div>
  );
}