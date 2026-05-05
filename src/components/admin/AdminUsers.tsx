import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, ShieldOff, Users, KeyRound, Lock, Unlock, Trash2, BadgeCheck, Search, Download, MailCheck, Send, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SEMESTER_SUBJECTS, SEMESTER_ORDINAL } from "@/lib/curriculum";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/csv";
import { Checkbox } from "@/components/ui/checkbox";
import { confirmUserEmails, listUnconfirmedUsers, resendVerificationEmail } from "@/server/admin-confirm-email.functions";

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
  const { user: me, isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [accessByUser, setAccessByUser] = useState<Record<string, AccessRow[]>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "admin">("all");
  const [unconfirmed, setUnconfirmed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

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

    if (isAdmin) {
      try {
        const res = await listUnconfirmedUsers();
        setUnconfirmed(new Set(res.unconfirmed.map((u) => u.id)));
      } catch (e) {
        // non-fatal; just hide unconfirmed badges
        const msg = e instanceof Response ? `${e.status} ${e.statusText}` : String(e);
        console.warn("listUnconfirmedUsers failed:", msg);
      }
    }
  };
  useEffect(() => {
    if (authLoading || !me) return;
    load();
  }, [authLoading, me?.id, isAdmin]);

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

  const filtered = rows.filter((u) => {
    const q = search.trim().toLowerCase();
    if (q && !((u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q))) return false;
    const hasActive = (accessByUser[u.id] ?? []).some((a) => a.is_active);
    if (filter === "active" && !hasActive) return false;
    if (filter === "inactive" && hasActive) return false;
    if (filter === "admin" && !u.isAdmin) return false;
    return true;
  });

  const exportCsv = () => {
    downloadCsv(`users-${new Date().toISOString().slice(0, 10)}.csv`, filtered.map((u) => ({
      id: u.id, name: u.name ?? "", email: u.email ?? "",
      role: u.isAdmin ? "admin" : "student",
      active_passes: (accessByUser[u.id] ?? []).filter((a) => a.is_active).length,
      provider: u.login_provider ?? "",
    })));
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const confirmIds = async (ids: string[], label: string) => {
    if (ids.length === 0) return toast.info("No users to confirm");
    setBusy(true);
    try {
      const res = await confirmUserEmails({ data: { userIds: ids } });
      toast.success(`${label}: ${res.confirmed} confirmed, ${res.skipped} already confirmed${res.errors.length ? `, ${res.errors.length} errors` : ""}`);
      if (res.errors.length) console.warn("Confirm errors:", res.errors);
      setSelected(new Set());
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to confirm emails");
    } finally {
      setBusy(false);
    }
  };

  const confirmAllUnconfirmed = () => confirmIds(Array.from(unconfirmed), "All unconfirmed");
  const confirmSelected = () => confirmIds(Array.from(selected), "Selected");
  const confirmFiltered = () => confirmIds(filtered.filter((u) => unconfirmed.has(u.id)).map((u) => u.id), "Filtered unconfirmed");

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2"><Users className="h-5 w-5" />Users ({filtered.length}/{rows.length})</h2>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={confirmSelected} disabled={busy || selected.size === 0}>
          <MailCheck className="h-4 w-4 mr-1" />Confirm selected ({selected.size})
        </Button>
        <Button variant="outline" size="sm" onClick={confirmFiltered} disabled={busy}>
          <MailCheck className="h-4 w-4 mr-1" />Confirm filtered unconfirmed
        </Button>
        <Button variant="default" size="sm" onClick={confirmAllUnconfirmed} disabled={busy || unconfirmed.size === 0}>
          <MailCheck className="h-4 w-4 mr-1" />Confirm all ({unconfirmed.size})
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            <SelectItem value="active">Active subscribers</SelectItem>
            <SelectItem value="inactive">No active access</SelectItem>
            <SelectItem value="admin">Admins only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No users match your filters</p>}
        {filtered.map((u) => {
          const initials = (u.name ?? u.email ?? "U").slice(0, 2).toUpperCase();
          const userAccess = accessByUser[u.id] ?? [];
          const activeAccess = userAccess.filter((a) => a.is_active);
          const isVerified = activeAccess.length > 0;
          const needsConfirm = unconfirmed.has(u.id);
          return (
            <div key={u.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox
                checked={selected.has(u.id)}
                onCheckedChange={() => toggleSelect(u.id)}
                aria-label="Select user"
              />
              <Avatar className="h-9 w-9">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate flex items-center gap-1">
                  <span className="truncate">{u.name ?? "Unnamed"}</span>
                  {isVerified && (
                    <BadgeCheck className="h-4 w-4 text-primary shrink-0" aria-label="Verified paid member" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                {needsConfirm && (
                  <Badge variant="destructive" className="text-[10px] mt-1">Email unconfirmed</Badge>
                )}
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
              {needsConfirm && (
                <Button variant="outline" size="sm" onClick={() => confirmIds([u.id], u.email ?? "User")} disabled={busy}>
                  <MailCheck className="h-4 w-4 mr-1" />Confirm
                </Button>
              )}
              {needsConfirm && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      const res = await resendVerificationEmail({ data: { userId: u.id } });
                      if (res.sent) toast.success(`Verification email sent to ${u.email}`);
                      else toast.info("User is already confirmed");
                      load();
                    } catch (e: any) {
                      toast.error(e?.message ?? "Failed to resend email");
                    }
                  }}
                >
                  <Send className="h-4 w-4 mr-1" />Resend
                </Button>
              )}
              <AccessDialog user={u} access={userAccess} onChange={load} />
              <QuickUnlock user={u} access={userAccess} onChange={load} />
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
              <SelectItem value="semester_pass">Semester Pass (Rs 599)</SelectItem>
              <SelectItem value="monthly_all_access">Monthly All Access (Rs 199 / month)</SelectItem>
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