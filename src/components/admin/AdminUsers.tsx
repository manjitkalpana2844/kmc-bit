import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, ShieldOff, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface UserRow {
  id: string; name: string | null; email: string | null; avatar_url: string | null;
  login_provider: string | null; isAdmin: boolean;
}

export function AdminUsers() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);

  const load = async () => {
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const adminSet = new Set((roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));
    setRows((profs ?? []).map((p: any) => ({ ...p, isAdmin: adminSet.has(p.id) })));
  };
  useEffect(() => { load(); }, []);

  const toggleAdmin = async (u: UserRow) => {
    if (u.isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin role removed");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: u.id, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Promoted to admin");
    }
    load();
  };

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Users className="h-5 w-5" />Users ({rows.length})</h2>
      <div className="space-y-2">
        {rows.map((u) => {
          const initials = (u.name ?? u.email ?? "U").slice(0, 2).toUpperCase();
          return (
            <div key={u.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <Avatar className="h-9 w-9">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{u.name ?? "Unnamed"}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.isAdmin ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {u.isAdmin ? "Admin" : "Student"}
              </span>
              {u.id !== me?.id && (
                <Button variant="outline" size="sm" onClick={() => toggleAdmin(u)}>
                  {u.isAdmin ? <><ShieldOff className="h-4 w-4 mr-1" />Demote</> : <><Shield className="h-4 w-4 mr-1" />Promote</>}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}