import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BadgeCheck, Crown, Search, Download, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";
import { SEMESTER_ORDINAL } from "@/lib/curriculum";

interface Profile { id: string; name: string | null; email: string | null; avatar_url: string | null; }
interface AccessRow {
  id: string; user_id: string;
  access_type: "semester_pass" | "monthly_all_access";
  semester: number | null; is_active: boolean;
  granted_at: string; expires_at: string | null;
}

export function AdminSubscribers() {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [access, setAccess] = useState<AccessRow[]>([]);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "semester_pass" | "monthly_all_access">("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "expired" | "locked" | "all">("active");

  const load = async () => {
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from("profiles").select("id,name,email,avatar_url"),
      supabase.from("user_access").select("*").order("granted_at", { ascending: false }),
    ]);
    const map: Record<string, Profile> = {};
    (p ?? []).forEach((x: any) => { map[x.id] = x; });
    setProfiles(map);
    setAccess((a ?? []) as AccessRow[]);
  };

  useEffect(() => { load(); }, []);

  const isExpired = (a: AccessRow) => !!a.expires_at && new Date(a.expires_at) < new Date();
  const statusOf = (a: AccessRow) => !a.is_active ? "locked" : isExpired(a) ? "expired" : "active";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return access.filter((a) => {
      if (planFilter !== "all" && a.access_type !== planFilter) return false;
      if (statusFilter !== "all" && statusOf(a) !== statusFilter) return false;
      if (q) {
        const p = profiles[a.user_id];
        const hay = `${p?.name ?? ""} ${p?.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [access, profiles, search, planFilter, statusFilter]);

  const toggleLock = async (a: AccessRow) => {
    const { error } = await supabase.from("user_access").update({ is_active: !a.is_active }).eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success(a.is_active ? "Locked" : "Unlocked");
    load();
  };

  const exportCsv = () => {
    downloadCsv(`subscribers-${new Date().toISOString().slice(0, 10)}.csv`, filtered.map((a) => {
      const p = profiles[a.user_id];
      return {
        name: p?.name ?? "",
        email: p?.email ?? "",
        plan: a.access_type === "monthly_all_access" ? "Monthly All Access" : `Semester ${a.semester} Pass`,
        semester: a.semester ?? "",
        status: statusOf(a),
        granted_at: a.granted_at,
        expires_at: a.expires_at ?? "",
      };
    }));
  };

  const counts = {
    active: access.filter((a) => statusOf(a) === "active").length,
    monthly: access.filter((a) => a.access_type === "monthly_all_access" && statusOf(a) === "active").length,
    semester: access.filter((a) => a.access_type === "semester_pass" && statusOf(a) === "active").length,
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />Subscribers
        </h2>
        <Badge variant="secondary">{counts.active} active</Badge>
        <Badge variant="outline">{counts.monthly} monthly</Badge>
        <Badge variant="outline">{counts.semester} semester</Badge>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1" />Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="pl-9" />
        </div>
        <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="semester_pass">Semester Pass</SelectItem>
            <SelectItem value="monthly_all_access">Monthly All Access</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No subscribers match your filters</p>}
        {filtered.map((a) => {
          const p = profiles[a.user_id];
          const initials = (p?.name ?? p?.email ?? "U").slice(0, 2).toUpperCase();
          const status = statusOf(a);
          return (
            <div key={a.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <Avatar className="h-9 w-9">
                <AvatarImage src={p?.avatar_url ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate flex items-center gap-1">
                  <span className="truncate">{p?.name ?? "Unnamed"}</span>
                  <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                </div>
                <div className="text-xs text-muted-foreground truncate">{p?.email}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {a.access_type === "monthly_all_access"
                      ? "Monthly All Access"
                      : `${SEMESTER_ORDINAL(a.semester ?? 0)} Semester Pass`}
                  </Badge>
                  <Badge
                    variant={status === "active" ? "default" : status === "expired" ? "destructive" : "outline"}
                    className="text-[10px] capitalize"
                  >
                    {status}
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Granted {new Date(a.granted_at).toLocaleDateString()}
                  {a.expires_at && <> · Expires {new Date(a.expires_at).toLocaleDateString()}</>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => toggleLock(a)}>
                {a.is_active ? <><Lock className="h-4 w-4 mr-1" />Lock</> : <><Unlock className="h-4 w-4 mr-1" />Unlock</>}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}