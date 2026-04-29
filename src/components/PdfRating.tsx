import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { unlockBadge } from "@/lib/tracking";
import { toast } from "sonner";

export function PdfRating({ pdfId }: { pdfId: string }) {
  const { user } = useAuth();
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState<number>(0);
  const [hover, setHover] = useState(0);

  const load = async () => {
    const { data } = await supabase.from("pdf_ratings").select("rating, user_id").eq("pdf_id", pdfId);
    const rows = data ?? [];
    setCount(rows.length);
    setAvg(rows.length ? rows.reduce((s, r: any) => s + r.rating, 0) / rows.length : 0);
    if (user) {
      const m = rows.find((r: any) => r.user_id === user.id);
      setMine(m ? (m as any).rating : 0);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`pdf_ratings:${pdfId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pdf_ratings", filter: `pdf_id=eq.${pdfId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [pdfId, user?.id]);

  const rate = async (n: number) => {
    if (!user) return;
    const { error } = await supabase
      .from("pdf_ratings")
      .upsert({ pdf_id: pdfId, user_id: user.id, rating: n }, { onConflict: "pdf_id,user_id" });
    if (error) return toast.error(error.message);
    if (!mine) unlockBadge(user.id, "first_rating");
    setMine(n);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hover || mine || Math.round(avg)) >= n;
          return (
            <button
              key={n}
              onClick={() => rate(n)}
              onMouseEnter={() => setHover(n)}
              aria-label={`Rate ${n}`}
              className="p-0.5"
              disabled={!user}
            >
              <Star className={`h-4 w-4 ${filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
            </button>
          );
        })}
      </div>
      <span className="text-xs text-muted-foreground">
        {count > 0 ? `${avg.toFixed(1)} (${count})` : "No ratings yet"}
      </span>
    </div>
  );
}