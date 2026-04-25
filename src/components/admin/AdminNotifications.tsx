import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NOTIFICATION_TYPES, notifTypeLabel } from "@/lib/curriculum";
import { Bell, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PdfOpt { id: string; title: string; }
interface Notif { id: string; title: string; message: string; type: string; created_at: string; }

export function AdminNotifications() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("announcement");
  const [pdfId, setPdfId] = useState<string>("none");
  const [pdfs, setPdfs] = useState<PdfOpt[]>([]);
  const [items, setItems] = useState<Notif[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: ns }, { data: ps }] = await Promise.all([
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("pdf_files").select("id,title").order("created_at", { ascending: false }).limit(100),
    ]);
    setItems((ns as Notif[]) ?? []);
    setPdfs((ps as PdfOpt[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("notifications").insert({
      title, message, type: type as any,
      pdf_id: pdfId === "none" ? null : pdfId,
      created_by: user.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Notification sent");
    setTitle(""); setMessage(""); setPdfId("none");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete notification?")) return;
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><Bell className="h-5 w-5" />Send Notification</h2>
        <form onSubmit={send} className="space-y-3">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea required value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} />
          </div>
          <div>
            <Label>Link a PDF (optional)</Label>
            <Select value={pdfId} onValueChange={setPdfId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No PDF</SelectItem>
                {pdfs.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Send
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-4">Recent ({items.length})</h2>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {items.map((n) => (
            <div key={n.id} className="p-3 border rounded-lg flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase text-primary font-medium">{notifTypeLabel(n.type)}</div>
                <div className="font-medium text-sm">{n.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(n.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No notifications yet.</p>}
        </div>
      </Card>
    </div>
  );
}