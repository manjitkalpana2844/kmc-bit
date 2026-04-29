import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Save, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export function PdfNotes({ pdfId }: { pdfId: string }) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("pdf_notes")
        .select("body")
        .eq("pdf_id", pdfId)
        .eq("user_id", user.id)
        .maybeSingle();
      setBody(data?.body ?? "");
    })();
  }, [pdfId, user?.id]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("pdf_notes")
      .upsert({ pdf_id: pdfId, user_id: user.id, body }, { onConflict: "pdf_id,user_id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!user) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <StickyNote className="h-4 w-4" />My notes
        </h3>
        <span className="text-[10px] text-muted-foreground">Private to you</span>
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        placeholder="Jot down key points, formulas, things to revise…"
      />
      <div className="flex justify-end mt-2">
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
           : saved ? <Check className="h-4 w-4 mr-1" />
           : <Save className="h-4 w-4 mr-1" />}
          {saved ? "Saved" : "Save"}
        </Button>
      </div>
    </Card>
  );
}