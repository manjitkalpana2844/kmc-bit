import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, Send, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export function AdminFeedback() {
  const { user: me } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [replies, setReplies] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
    const ids = Array.from(new Set((data ?? []).map((f: any) => f.user_id)));
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id,name,email,avatar_url").in("id", ids);
      const map: Record<string, any> = {};
      (p ?? []).forEach((x: any) => { map[x.id] = x; });
      setProfiles(map);
    }
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const ch = supabase.channel("feedback:admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const reply = async (f: any) => {
    if (!me) return;
    const text = (replies[f.id] ?? "").trim();
    if (!text) return toast.error("Reply cannot be empty");
    const { error } = await supabase.from("feedback").update({
      admin_reply: text, replied_by: me.id,
      replied_at: new Date().toISOString(), status: "resolved",
    }).eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success("Reply sent");
    setReplies((r) => ({ ...r, [f.id]: "" }));
    load();
  };

  const reopen = async (f: any) => {
    const { error } = await supabase.from("feedback").update({ status: "open" }).eq("id", f.id);
    if (error) return toast.error(error.message);
    load();
  };

  const groups = {
    open: items.filter((x) => x.status === "open"),
    resolved: items.filter((x) => x.status === "resolved"),
  };

  return (
    <Card className="p-6">
      <h2 className="font-semibold text-lg mb-4 flex items-center gap-2"><MessageSquare className="h-5 w-5" />Feedback</h2>
      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({groups.open.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({groups.resolved.length})</TabsTrigger>
        </TabsList>
        {(["open", "resolved"] as const).map((k) => (
          <TabsContent key={k} value={k} className="mt-4 space-y-3">
            {groups[k].length === 0 && <p className="text-sm text-muted-foreground">No messages</p>}
            {groups[k].map((f) => {
              const p = profiles[f.user_id];
              return (
                <div key={f.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{f.subject}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p?.name ?? "Unknown"} · {p?.email} · {new Date(f.created_at).toLocaleString()}
                      </div>
                    </div>
                    {f.status === "resolved"
                      ? <Badge className="gap-1"><Check className="h-3 w-3" />Resolved</Badge>
                      : <Badge variant="secondary">Open</Badge>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap mt-2">{f.message}</p>
                  {f.admin_reply && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/50 border-l-4 border-primary">
                      <div className="text-xs font-semibold text-primary mb-1">Your reply</div>
                      <p className="text-sm whitespace-pre-wrap">{f.admin_reply}</p>
                    </div>
                  )}
                  {k === "open" && (
                    <div className="mt-3 space-y-2">
                      <Textarea placeholder="Write a reply…" rows={2}
                        value={replies[f.id] ?? ""}
                        onChange={(e) => setReplies((r) => ({ ...r, [f.id]: e.target.value }))}
                        maxLength={2000} />
                      <Button size="sm" onClick={() => reply(f)}><Send className="h-4 w-4 mr-1" />Reply & resolve</Button>
                    </div>
                  )}
                  {k === "resolved" && (
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => reopen(f)}>Reopen</Button>
                  )}
                </div>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}