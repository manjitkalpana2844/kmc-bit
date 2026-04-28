import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, ShieldOff, Users, KeyRound, Lock, Unlock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SEMESTER_SUBJECTS, SEMESTER_ORDINAL } from "@/lib/curriculum";

interface UserRow {
  id: string; name: string | null; email: string | null; avatar_url: string | null;
  login_provider: string | null; isAdmin: boolean;
}

interface AccessRow {
  id: string;
  user_id: string;
  access_type: "semester_pass" | "monthly_all_access";
  semester: number | null;
  is_active: boolean;
  granted_at: string;
  expires_at: string | null;
  notes: string | null;
}

export function AdminUsers() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [accessByUser, setAccessByUser] = useState<Record<string, AccessRow[]>>({});

  const load = async () => {
    const [{ data: profs }, { data: roles }, { data: access }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_access").select("*").order("granted_at", { ascending: false }),
    ]);
    const adminSet = new Set((roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));
    setRows((profs ?? []).map((p: any) => ({ ...p, isAdmin: adminSet.has(p.id) })));
    const map: Record<string, AccessRow[]> = {};
    (access ?? []).forEach((a: any) => {
      (map[a.user_id] ??= []).push(a as AccessRow);
    });
    setAccessByUser(map);
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
          const userAccess = accessByUser[u.id] ?? [];
          const activeAccess = userAccess.filter((a) => a.is_active);
          return (
            <div key={u.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <Avatar className="h-9 w-9">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{u.name ?? "Unnamed"}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                {activeAccess.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activeAccess.map((a) => (
                      <Badge key={a.id} variant="secondary" className="text-[10px]">
                        {a.access_type === "monthly_all_access"
                          ? "Monthly All Access"
                          : `Sem ${a.semester} Pass`}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.isAdmin ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {u.isAdmin ? "Admin" : "Student"}
              </span>
              <AccessDialog user={u} access={userAccess} onChange={load} />
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

function AccessDialog({ user, access, onChange }: { user: UserRow; access: AccessRow[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"semester_pass" | "monthly_all_access">("semester_pass");
  const [semester, setSemester] = useState<string>("1");
  const [busy, setBusy] = useState(false);

  const grant = async () => {
    setBusy(true);
    const { error } = await supabase.from("user_access").insert({
      user_id: user.id,
      access_type: type,
      semester: type === "semester_pass" ? Number(semester) : null,
      is_active: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Access granted");
    onChange();
  };

  const toggle = async (a: AccessRow) => {
    const { error } = await supabase
      .from("user_access")
      .update({ is_active: !a.is_active })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success(a.is_active ? "Locked" : "Unlocked");
    onChange();
  };

  const remove = async (a: AccessRow) => {
    const { error } = await supabase.from("user_access").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    onChange();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="h-4 w-4 mr-1" />Access
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage access · {user.name ?? user.email}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 border rounded-lg p-3">
          <div className="text-sm font-medium">Grant new access</div>
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semester_pass">Semester Pass (Rs 999)</SelectItem>
              <SelectItem value="monthly_all_access">Monthly All Access (Rs 399)</SelectItem>
            </SelectContent>
          </Select>
          {type === "semester_pass" && (
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(SEMESTER_SUBJECTS).map((s) => (
                  <SelectItem key={s} value={s}>{SEMESTER_ORDINAL(Number(s))} Semester</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={grant} disabled={busy} className="w-full">Grant access</Button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          <div className="text-sm font-medium">Existing access ({access.length})</div>
          {access.length === 0 && <p className="text-xs text-muted-foreground">No access records</p>}
          {access.map((a) => (
            <div key={a.id} className="flex items-center gap-2 p-2 border rounded-lg text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {a.access_type === "monthly_all_access" ? "Monthly All Access" : `Semester ${a.semester} Pass`}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(a.granted_at).toLocaleDateString()} · {a.is_active ? "Active" : "Locked"}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => toggle(a)}>
                {a.is_active ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => remove(a)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}