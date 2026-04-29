import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { pingStreak } from "@/lib/tracking";

interface Streak { current_streak: number; longest_streak: number; total_active_days: number; }
interface Badge { badge_code: string; unlocked_at: string; badges: { name: string; icon: string; description: string } | null }

export function StreakBadge() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<Streak | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await pingStreak(user.id);
      const [{ data: s }, { data: b }] = await Promise.all([
        supabase.from("user_streaks").select("current_streak,longest_streak,total_active_days").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_badges").select("badge_code, unlocked_at, badges(name,icon,description)").eq("user_id", user.id).order("unlocked_at", { ascending: false }),
      ]);
      setStreak(s as Streak | null);
      setBadges((b as any) ?? []);
    })();
  }, [user?.id]);

  if (!user || !streak) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Flame className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold leading-none">{streak.current_streak}</div>
            <div className="text-[10px] text-muted-foreground">day streak</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Longest: {streak.longest_streak} · Total: {streak.total_active_days}
        </div>
        {badges.length > 0 && (
          <div className="flex items-center gap-1 ml-auto flex-wrap">
            {badges.slice(0, 6).map((b) => (
              <div
                key={b.badge_code}
                title={b.badges?.description ?? b.badge_code}
                className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"
              >
                {b.badges?.name ?? b.badge_code}
              </div>
            ))}
            {badges.length > 6 && <span className="text-[10px] text-muted-foreground">+{badges.length - 6}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}