import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { examTypeLabel } from "@/lib/curriculum";

interface Row { id: string; title: string; year: number; exam_type: string; subject: string; }

export function RelatedPdfs({ pdfId, semester, subject }: { pdfId: string; semester: number; subject: string }) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pdf_files")
        .select("id,title,year,exam_type,subject")
        .eq("semester", semester)
        .eq("subject", subject)
        .neq("id", pdfId)
        .order("year", { ascending: false })
        .limit(8);
      setRows((data as Row[]) ?? []);
    })();
  }, [pdfId, semester, subject]);

  if (rows.length === 0) return null;

  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4" />Related papers · {subject}</h3>
      <div className="space-y-1">
        {rows.map((r) => (
          <Link
            key={r.id}
            to="/pdf/$pdfId"
            params={{ pdfId: r.id }}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted text-sm"
          >
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1 truncate">{r.title}</span>
            <span className="text-xs text-muted-foreground">{examTypeLabel(r.exam_type)} · {r.year}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}