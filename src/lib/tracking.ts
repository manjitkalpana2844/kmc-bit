import { supabase } from "@/integrations/supabase/client";

export async function trackPdfView(pdfId: string) {
  try {
    await supabase.rpc("increment_pdf_view", { _pdf_id: pdfId });
  } catch {
    /* non-fatal */
  }
}

export async function logDownload(pdfId: string, userId: string) {
  try {
    await supabase.from("pdf_downloads").insert({ pdf_id: pdfId, user_id: userId });
  } catch {
    /* non-fatal */
  }
}

export function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}