import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface Props {
  pdfId: string;
  size?: "sm" | "icon";
  variant?: "outline" | "ghost";
}

export function BookmarkButton({ pdfId, size = "sm", variant = "outline" }: Props) {
  const { user } = useAuth();
  const [marked, setMarked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("pdf_id", pdfId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancel) setMarked(!!data);
      });
    return () => { cancel = true; };
  }, [user?.id, pdfId]);

  const toggle = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!user || busy) return;
    setBusy(true);
    if (marked) {
      const { error } = await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("pdf_id", pdfId);
      if (!error) { setMarked(false); toast.success("Removed bookmark"); }
    } else {
      const { error } = await supabase.from("bookmarks").insert({ user_id: user.id, pdf_id: pdfId });
      if (!error) { setMarked(true); toast.success("Bookmarked"); }
    }
    setBusy(false);
  };

  return (
    <Button variant={variant} size={size} onClick={toggle} disabled={busy} aria-pressed={marked}>
      <Bookmark className={`h-4 w-4 ${marked ? "fill-current" : ""}`} />
      {size === "sm" && <span className="ml-1">{marked ? "Saved" : "Save"}</span>}
    </Button>
  );
}