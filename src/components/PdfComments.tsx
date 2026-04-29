import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Trash2, Loader2 } from "lucide-react";
import { unlockBadge } from "@/lib/tracking";
import { toast } from "sonner";

interface Comment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile?: { name: string | null; avatar_url: string | null } | null;
}

export function PdfComments({ pdfId }: { pdfId: string }) {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: c } = await supabase
      .from("pdf_comments")
      .select("*")
      .eq("pdf_id", pdfId)
      .order("created_at", { ascending: false });
    const rows = (c as Comment[]) ?? [];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,name,avatar_url")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      rows.forEach((r) => { r.profile = map.get(r.user_id) ?? null; });
    }
    setComments(rows);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`pdf_comments:${pdfId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pdf_comments", filter: `pdf_id=eq.${pdfId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [pdfId]);

  const post = async () => {
    if (!user || !body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("pdf_comments").insert({
      pdf_id: pdfId, user_id: user.id, body: body.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setBody("");
    unlockBadge(user.id, "first_comment");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("pdf_comments").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <Card className="p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-3">
        <MessageCircle className="h-4 w-4" /> Discussion ({comments.length})
      </h3>
      {user && (
        <div className="space-y-2 mb-4">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Share your thoughts on this paper…"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={post} disabled={busy || !body.trim()}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Post
            </Button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Be the first to comment.</p>
        )}
        {comments.map((c) => {
          const initials = (c.profile?.name ?? "U").slice(0, 2).toUpperCase();
          const canDelete = user && (c.user_id === user.id || isAdmin);
          return (
            <div key={c.id} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{c.profile?.name ?? "Student"}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                  {canDelete && (
                    <button onClick={() => remove(c.id)} className="ml-auto text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap break-words mt-0.5">{c.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}