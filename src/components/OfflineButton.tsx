import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudDownload, CloudOff, Loader2, Check } from "lucide-react";
import { savePdfOffline, deleteOfflinePdf, isPdfOffline } from "@/lib/offline";
import { toast } from "sonner";

interface Props {
  pdfId: string;
  title: string;
  signedUrl: string | null;
  meta?: { subject?: string; semester?: number; year?: number; exam_type?: string };
}

export function OfflineButton({ pdfId, title, signedUrl, meta }: Props) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { isPdfOffline(pdfId).then(setSaved); }, [pdfId]);

  const toggle = async () => {
    setBusy(true);
    try {
      if (saved) {
        await deleteOfflinePdf(pdfId);
        setSaved(false);
        toast.success("Removed from offline");
      } else {
        if (!signedUrl) { toast.error("PDF not loaded yet"); return; }
        const res = await fetch(signedUrl);
        const blob = await res.blob();
        await savePdfOffline({ id: pdfId, title, blob, savedAt: Date.now(), meta });
        setSaved(true);
        toast.success("Saved for offline");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
        : saved ? <Check className="h-4 w-4 mr-1" />
        : <CloudDownload className="h-4 w-4 mr-1" />}
      {saved ? "Offline" : "Save offline"}
    </Button>
  );
}

export function OfflineRemoveButton({ pdfId, onRemoved }: { pdfId: string; onRemoved?: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={async () => { await deleteOfflinePdf(pdfId); onRemoved?.(); }}>
      <CloudOff className="h-4 w-4 mr-1" />Remove
    </Button>
  );
}