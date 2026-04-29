import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, Crown, Check, Clock, X, Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { SEMESTER_SUBJECTS, SEMESTER_ORDINAL } from "@/lib/curriculum";
import { downloadReceiptPdf } from "@/lib/receipt";

export const Route = createFileRoute("/get-access")({ component: GetAccessPage });

interface PaymentSettings {
  account_label: string;
  account_number: string;
  account_name: string;
  instructions: string;
  semester_pass_price: number;
  monthly_price: number;
}

function GetAccessPage() {
  const { user, loading, hasActiveAccess, profile } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [plan, setPlan] = useState<"semester_pass" | "monthly_all_access">("semester_pass");
  const [semester, setSemester] = useState("1");
  const [txn, setTxn] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const loadAll = async () => {
    if (!user) return;
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "payment").maybeSingle(),
      supabase.from("payment_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (s?.value) setSettings(s.value as unknown as PaymentSettings);
    setRequests(r ?? []);
  };

  useEffect(() => { loadAll(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`pr:${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "payment_requests", filter: `user_id=eq.${user.id}` },
        () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // Live payment settings (price / account info) for everyone
  useEffect(() => {
    const ch = supabase
      .channel("app_settings:payment")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.payment" },
        () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const submit = async () => {
    if (!user || !file || !settings) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("File must be under 5MB");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("payment-proofs").upload(path, file);
      if (up.error) throw up.error;
      const amount = plan === "semester_pass" ? settings.semester_pass_price : settings.monthly_price;
      const { error } = await supabase.from("payment_requests").insert({
        user_id: user.id, plan, semester: plan === "semester_pass" ? Number(semester) : null,
        amount, transaction_id: txn || null, note: note || null, proof_path: path,
      });
      if (error) throw error;
      toast.success("Submitted! Admin will review shortly.");
      setFile(null); setTxn(""); setNote("");
      loadAll();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit");
    } finally { setBusy(false); }
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Crown className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Get Access</h1>
            <p className="text-xs text-muted-foreground">Unlock semesters with a one-time or monthly plan</p>
          </div>
          {hasActiveAccess && <Badge className="gap-1"><BadgeCheck className="h-3 w-3" />Active</Badge>}
        </div>

        {settings && (
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <PlanCard
              title="Semester Pass"
              price={settings.semester_pass_price}
              tagline="One-time · lifetime access to chosen semester"
              features={["All PDFs of one semester", "No expiry", "Verified badge"]}
              active={plan === "semester_pass"}
              onSelect={() => setPlan("semester_pass")}
            />
            <PlanCard
              title="Monthly All Access"
              price={settings.monthly_price}
              tagline="All semesters · auto-expires after 1 month"
              features={["Every semester unlocked", "1 month duration", "Verified badge"]}
              active={plan === "monthly_all_access"}
              onSelect={() => setPlan("monthly_all_access")}
              highlight
            />
          </div>
        )}

        {settings && (
          <Card className="p-5 mb-6 space-y-3">
            <div className="font-semibold">Step 1 · Send payment</div>
            <div className="text-sm bg-muted/50 rounded-lg p-3 space-y-1">
              <div><span className="text-muted-foreground">Method:</span> <span className="font-medium">{settings.account_label}</span></div>
              <div><span className="text-muted-foreground">Number:</span> <span className="font-mono font-semibold">{settings.account_number}</span></div>
              <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{settings.account_name}</span></div>
              <div className="pt-2"><span className="text-muted-foreground">Amount:</span> <span className="font-bold text-primary">Rs {plan === "semester_pass" ? settings.semester_pass_price : settings.monthly_price}</span></div>
            </div>
            <p className="text-xs text-muted-foreground">{settings.instructions}</p>
          </Card>
        )}

        <Card className="p-5 space-y-4">
          <div className="font-semibold">Step 2 · Submit proof</div>
          {plan === "semester_pass" && (
            <div>
              <Label>Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(SEMESTER_SUBJECTS).map((s) => (
                    <SelectItem key={s} value={s}>{SEMESTER_ORDINAL(Number(s))} Semester</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Transaction ID (optional)</Label>
            <Input value={txn} onChange={(e) => setTxn(e.target.value.slice(0, 100))} placeholder="e.g. TXN123456" />
          </div>
          <div>
            <Label>Payment screenshot *</Label>
            <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && <p className="text-xs text-muted-foreground mt-1">{file.name}</p>}
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={2} />
          </div>
          <Button onClick={submit} disabled={busy || !file} className="w-full">
            <Upload className="h-4 w-4 mr-1" />{busy ? "Submitting…" : "Submit for review"}
          </Button>
        </Card>

        {requests.length > 0 && (
          <Card className="p-5 mt-6">
            <div className="font-semibold mb-3">Your requests</div>
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 border rounded-lg text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {r.plan === "monthly_all_access" ? "Monthly All Access" : `Sem ${r.semester} Pass`} · Rs {r.amount}
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                    {r.review_note && <div className="text-xs text-muted-foreground mt-1">Note: {r.review_note}</div>}
                  </div>
                  {r.status === "approved" && (
                    <Button variant="outline" size="sm" onClick={() => downloadReceiptPdf({
                      requestId: r.id,
                      userName: profile?.name ?? "Student",
                      userEmail: profile?.email ?? user?.email ?? "",
                      plan: r.plan,
                      semester: r.semester,
                      amount: r.amount,
                      transactionId: r.transaction_id,
                      approvedAt: r.reviewed_at ?? r.updated_at ?? r.created_at,
                      expiresAt: null,
                    })}>
                      <Download className="h-4 w-4 mr-1" />Receipt
                    </Button>
                  )}
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="text-center mt-6">
          <Button variant="ghost" asChild><Link to="/">Back to dashboard</Link></Button>
        </div>
      </main>
    </div>
  );
}

function PlanCard({ title, price, tagline, features, active, onSelect, highlight }: any) {
  return (
    <button type="button" onClick={onSelect}
      className={`text-left rounded-xl border-2 p-5 transition ${active ? "border-primary shadow-md" : "border-border hover:border-primary/50"}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold">{title}</span>
        {highlight && <Badge variant="secondary" className="text-[10px]">Popular</Badge>}
      </div>
      <div className="text-2xl font-bold text-primary">Rs {price}</div>
      <div className="text-xs text-muted-foreground mb-3">{tagline}</div>
      <ul className="text-xs space-y-1">
        {features.map((f: string) => (
          <li key={f} className="flex items-center gap-1"><Check className="h-3 w-3 text-primary" />{f}</li>
        ))}
      </ul>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="gap-1"><Check className="h-3 w-3" />Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" />Rejected</Badge>;
  return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
}
