import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Receipt, Check, X, Eye, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export function AdminPaymentRequests() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [settings, setSettings] = useState<any>(null);

  const load = async () => {
    const [{ data: r }, { data: p }, { data: s }] = await Promise.all([
      supabase.from("payment_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,name,email,avatar_url"),
      supabase.from("app_settings").select("value").eq("key", "payment").maybeSingle(),
    ]);
    setRows(r ?? []);
    const map: Record<string, any> = {};
    (p ?? []).forEach((x: any) => { map[x.id] = x; });
    setProfiles(map);
    if (s?.value) setSettings(s.value);
  };

  useEffect(() => { load(); }, []);

  const approve = async (req: any) => {
    if (!me) return;
    const { error: aErr } = await supabase.from("user_access").insert({
      user_id: req.user_id,
      access_type: req.plan,
      semester: req.plan === "semester_pass" ? req.semester : null,
      is_active: true,
      granted_by: me.id,
      notes: `Auto-granted from payment request ${req.id}`,
    });
    if (aErr) return toast.error(aErr.message);
    const { error } = await supabase.from("payment_requests").update({
      status: "approved", reviewed_by: me.id, reviewed_at: new Date().toISOString(),
    }).eq("id", req.id);
    if (error) return toast.error(error.message);
    toast.success("Approved & access granted");
    load();
  };

  const reject = async (req: any) => {
    if (!me) return;
    const reason = prompt("Reason (optional)") ?? "";
    const { error } = await supabase.from("payment_requests").update({
      status: "rejected", reviewed_by: me.id, reviewed_at: new Date().toISOString(), review_note: reason || null,
    }).eq("id", req.id);
    if (error) return toast.error(error.message);
    toast.success("Rejected");
    load();
  };

  const viewProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const groups = {
    pending: rows.filter((r) => r.status === "pending"),
    approved: rows.filter((r) => r.status === "approved"),
    rejected: rows.filter((r) => r.status === "rejected"),
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5" />Payment Requests
        </h2>
        {settings && <SettingsDialog settings={settings} onSaved={load} />}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({groups.pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({groups.approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({groups.rejected.length})</TabsTrigger>
        </TabsList>
        {(["pending", "approved", "rejected"] as const).map((k) => (
          <TabsContent key={k} value={k} className="mt-4 space-y-2">
            {groups[k].length === 0 && <p className="text-sm text-muted-foreground">No requests</p>}
            {groups[k].map((r) => {
              const p = profiles[r.user_id];
              return (
                <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{p?.name ?? "Unknown"} <span className="text-muted-foreground text-xs">· {p?.email}</span></div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.plan === "monthly_all_access" ? "Monthly All Access" : `Sem ${r.semester} Pass`} · Rs {r.amount}
                      {r.transaction_id && <> · TXN: <span className="font-mono">{r.transaction_id}</span></>}
                    </div>
                    {r.note && <div className="text-xs italic mt-0.5">"{r.note}"</div>}
                    <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => viewProof(r.proof_path)}>
                    <Eye className="h-4 w-4 mr-1" />Proof
                  </Button>
                  {k === "pending" && (
                    <>
                      <Button size="sm" onClick={() => approve(r)}><Check className="h-4 w-4 mr-1" />Approve</Button>
                      <Button variant="destructive" size="sm" onClick={() => reject(r)}><X className="h-4 w-4 mr-1" />Reject</Button>
                    </>
                  )}
                  {k !== "pending" && <Badge variant={k === "approved" ? "default" : "destructive"}>{k}</Badge>}
                </div>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}

function SettingsDialog({ settings, onSaved }: { settings: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(settings);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setV(settings); }, [settings]);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("app_settings").update({ value: v, updated_at: new Date().toISOString() }).eq("key", "payment");
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Payment settings</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Payment account & pricing</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Method (e.g. JazzCash)</Label><Input value={v.account_label} onChange={(e) => setV({ ...v, account_label: e.target.value })} /></div>
          <div><Label>Number</Label><Input value={v.account_number} onChange={(e) => setV({ ...v, account_number: e.target.value })} /></div>
          <div><Label>Account name</Label><Input value={v.account_name} onChange={(e) => setV({ ...v, account_name: e.target.value })} /></div>
          <div><Label>Instructions</Label><Input value={v.instructions} onChange={(e) => setV({ ...v, instructions: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Semester Pass (Rs)</Label><Input type="number" value={v.semester_pass_price} onChange={(e) => setV({ ...v, semester_pass_price: Number(e.target.value) })} /></div>
            <div><Label>Monthly (Rs)</Label><Input type="number" value={v.monthly_price} onChange={(e) => setV({ ...v, monthly_price: Number(e.target.value) })} /></div>
          </div>
          <Button onClick={save} disabled={busy} className="w-full"><Save className="h-4 w-4 mr-1" />Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
