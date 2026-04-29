import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, FileText, Receipt, BadgeCheck, Eye, Download, MessageSquare } from "lucide-react";

interface Stats {
  users: number; activeSubs: number; pdfs: number; pendingPayments: number;
  approvedThisMonth: number; revenueThisMonth: number; totalViews: number;
  totalDownloads: number; openFeedback: number;
}

export function AdminStats() {
  const [s, setS] = useState<Stats | null>(null);
  const [topPdfs, setTopPdfs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const [users, pdfs, access, pendingPay, approvedPay, views, downloads, openFb, topViews] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("pdf_files").select("*", { count: "exact", head: true }),
        supabase.from("user_access").select("user_id, expires_at, is_active").eq("is_active", true),
        supabase.from("payment_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("payment_requests").select("amount").eq("status", "approved").gte("reviewed_at", monthStart.toISOString()),
        supabase.from("pdf_views").select("view_count"),
        supabase.from("pdf_downloads").select("*", { count: "exact", head: true }),
        supabase.from("feedback").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("pdf_views").select("pdf_id, view_count").order("view_count", { ascending: false }).limit(5),
      ]);
      const now = Date.now();
      const activeSubs = new Set(
        (access.data ?? []).filter((a: any) => !a.expires_at || new Date(a.expires_at).getTime() > now).map((a: any) => a.user_id),
      ).size;
      const revenue = (approvedPay.data ?? []).reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
      const totalViews = (views.data ?? []).reduce((sum: number, r: any) => sum + Number(r.view_count || 0), 0);
      setS({
        users: users.count ?? 0, activeSubs, pdfs: pdfs.count ?? 0,
        pendingPayments: pendingPay.count ?? 0,
        approvedThisMonth: (approvedPay.data ?? []).length, revenueThisMonth: revenue,
        totalViews, totalDownloads: downloads.count ?? 0, openFeedback: openFb.count ?? 0,
      });
      const ids = (topViews.data ?? []).map((v: any) => v.pdf_id);
      if (ids.length) {
        const { data: meta } = await supabase.from("pdf_files").select("id,title,semester,subject").in("id", ids);
        const map = new Map((meta ?? []).map((m: any) => [m.id, m]));
        setTopPdfs((topViews.data ?? []).map((v: any) => ({ ...v, ...(map.get(v.pdf_id) ?? {}) })).filter((x: any) => x.title));
      }
    })();
  }, []);

  if (!s) return <div className="text-sm text-muted-foreground">Loading stats…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Stat icon={<Users className="h-5 w-5" />} label="Total users" value={s.users} />
        <Stat icon={<BadgeCheck className="h-5 w-5" />} label="Active subscribers" value={s.activeSubs} />
        <Stat icon={<FileText className="h-5 w-5" />} label="PDFs" value={s.pdfs} />
        <Stat icon={<Receipt className="h-5 w-5" />} label="Pending payments" value={s.pendingPayments} highlight={s.pendingPayments > 0} />
        <Stat icon={<Receipt className="h-5 w-5" />} label="Approved this month" value={s.approvedThisMonth} />
        <Stat icon={<Receipt className="h-5 w-5" />} label="Revenue this month" value={`Rs ${s.revenueThisMonth}`} />
        <Stat icon={<Eye className="h-5 w-5" />} label="Total views" value={s.totalViews} />
        <Stat icon={<Download className="h-5 w-5" />} label="Total downloads" value={s.totalDownloads} />
        <Stat icon={<MessageSquare className="h-5 w-5" />} label="Open feedback" value={s.openFeedback} highlight={s.openFeedback > 0} />
      </div>
      {topPdfs.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Eye className="h-4 w-4" />Top viewed PDFs</h3>
          <div className="space-y-2">
            {topPdfs.map((p, i) => (
              <div key={p.pdf_id} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-muted-foreground text-xs">#{i + 1}</span>
                <span className="flex-1 truncate">{p.title}</span>
                <span className="text-xs text-muted-foreground">Sem {p.semester} · {p.subject}</span>
                <span className="font-bold tabular-nums">{p.view_count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "border-primary" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">{icon}<span>{label}</span></div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}