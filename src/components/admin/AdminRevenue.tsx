import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, Download, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { downloadCsv } from "@/lib/csv";

interface PR {
  id: string; amount: number; plan: string; semester: number | null;
  reviewed_at: string | null; created_at: string; user_id: string; status: string;
  transaction_id: string | null;
}

export function AdminRevenue() {
  const [rows, setRows] = useState<PR[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("status", "approved")
        .order("reviewed_at", { ascending: false });
      setRows((data as PR[]) ?? []);
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,name,email").in("id", ids);
        const map: Record<string, any> = {};
        (profs ?? []).forEach((p: any) => { map[p.id] = p; });
        setProfiles(map);
      }
    })();
  }, []);

  // Build last 6 months bucket
  const months: { key: string; label: string; revenue: number; count: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: d.toLocaleDateString(undefined, { month: "short" }), revenue: 0, count: 0 });
  }
  rows.forEach((r) => {
    const d = r.reviewed_at ? new Date(r.reviewed_at) : null;
    if (!d) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const m = months.find((x) => x.key === key);
    if (m) { m.revenue += r.amount; m.count += 1; }
  });

  const total = rows.reduce((s, r) => s + r.amount, 0);

  const exportCsv = () => {
    downloadCsv(`payments-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((r) => {
      const p = profiles[r.user_id];
      return {
        id: r.id,
        date: r.reviewed_at ?? r.created_at,
        user: p?.name ?? "",
        email: p?.email ?? "",
        plan: r.plan,
        semester: r.semester ?? "",
        amount: r.amount,
        transaction_id: r.transaction_id ?? "",
      };
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Receipt className="h-4 w-4" />Total revenue
          </div>
          <div className="text-2xl font-bold">Rs {total.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp className="h-4 w-4" />Approved payments
          </div>
          <div className="text-2xl font-bold">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">This month</div>
          <div className="text-2xl font-bold">Rs {months[months.length - 1].revenue.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Last month</div>
          <div className="text-2xl font-bold">Rs {months[months.length - 2].revenue.toLocaleString()}</div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" />Revenue (last 6 months)</h3>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={months}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">All approved payments ({rows.length})</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
          {rows.map((r) => {
            const p = profiles[r.user_id];
            return (
              <div key={r.id} className="flex items-center gap-3 p-2 border rounded text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p?.name ?? "Unknown"} <span className="text-xs text-muted-foreground">· {p?.email}</span></div>
                  <div className="text-xs text-muted-foreground">
                    {r.plan === "monthly_all_access" ? "Monthly" : `Sem ${r.semester} Pass`}
                    {r.reviewed_at && ` · ${new Date(r.reviewed_at).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="font-bold tabular-nums">Rs {r.amount}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}