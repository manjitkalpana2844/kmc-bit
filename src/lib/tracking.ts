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

/** Update streak on app open and unlock badges. Safe to call repeatedly. */
export async function pingStreak(userId: string) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    let current = 1;
    let longest = 1;
    let total = 1;

    if (existing) {
      if (existing.last_active_date === today) return existing; // already pinged today
      const last = existing.last_active_date ? new Date(existing.last_active_date) : null;
      const diffDays = last
        ? Math.round((new Date(today).getTime() - last.getTime()) / 86400000)
        : null;
      current = diffDays === 1 ? existing.current_streak + 1 : 1;
      longest = Math.max(existing.longest_streak ?? 0, current);
      total = (existing.total_active_days ?? 0) + 1;
    }

    await supabase.from("user_streaks").upsert({
      user_id: userId,
      current_streak: current,
      longest_streak: longest,
      last_active_date: today,
      total_active_days: total,
      updated_at: new Date().toISOString(),
    });

    // Unlock streak badges
    const codes: string[] = [];
    if (current >= 3) codes.push("streak_3");
    if (current >= 7) codes.push("streak_7");
    if (current >= 30) codes.push("streak_30");
    if (codes.length) {
      await supabase
        .from("user_badges")
        .upsert(codes.map((c) => ({ user_id: userId, badge_code: c })), {
          onConflict: "user_id,badge_code",
          ignoreDuplicates: true,
        });
    }
    return { current_streak: current, longest_streak: longest, last_active_date: today, total_active_days: total };
  } catch {
    return null;
  }
}

export async function unlockBadge(userId: string, code: string) {
  try {
    await supabase
      .from("user_badges")
      .upsert({ user_id: userId, badge_code: code }, { onConflict: "user_id,badge_code", ignoreDuplicates: true });
  } catch {
    /* non-fatal */
  }
}

export async function checkViewBadges(userId: string) {
  try {
    const { count } = await supabase
      .from("recently_viewed")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((count ?? 0) >= 50) await unlockBadge(userId, "views_50");
    else if ((count ?? 0) >= 10) await unlockBadge(userId, "views_10");
  } catch {
    /* non-fatal */
  }
}

export async function checkDownloadBadges(userId: string) {
  try {
    const { count } = await supabase
      .from("pdf_downloads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((count ?? 0) >= 5) await unlockBadge(userId, "downloads_5");
  } catch {
    /* non-fatal */
  }
}