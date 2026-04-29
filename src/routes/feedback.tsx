import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, MessageSquare, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/feedback")({ component: FeedbackPage });

function FeedbackPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("feedback").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`fb:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const submit = async () => {
    if (!user) return;
    const s = subject.trim(), m = message.trim();
    if (!s || s.length > 120) return toast.error("Subject 1–120 characters");
    if (!m || m.length > 2000) return toast.error("Message 1–2000 characters");
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({ user_id: user.id, subject: s, message: m });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Sent! Admin will reply soon.");
    setSubject(""); setMessage("");
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><MessageSquare className="h-6 w-6 text-primary" />Contact admin</h1>
        <p className="text-sm text-muted-foreground mb-6">Send a question, suggestion, or report an issue.</p>

        <Card className="p-5 space-y-3 mb-6">
          <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="e.g. Missing 5th sem AI paper" /></div>
          <div><Label>Message</Label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={5} /></div>
          <Button onClick={submit} disabled={busy} className="w-full"><Send className="h-4 w-4 mr-1" />{busy ? "Sending…" : "Send"}</Button>
        </Card>

        {items.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2">Your messages</h2>
            <div className="space-y-2">
              {items.map((f) => (
                <Card key={f.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-sm">{f.subject}</div>
                    {f.status === "resolved"
                      ? <Badge className="gap-1"><Check className="h-3 w-3" />Resolved</Badge>
                      : <Badge variant="secondary">Open</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{new Date(f.created_at).toLocaleString()}</div>
                  <p className="text-sm whitespace-pre-wrap">{f.message}</p>
                  {f.admin_reply && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/50 border-l-4 border-primary">
                      <div className="text-xs font-semibold text-primary mb-1">Admin reply</div>
                      <p className="text-sm whitespace-pre-wrap">{f.admin_reply}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}