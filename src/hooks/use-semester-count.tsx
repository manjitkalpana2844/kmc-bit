import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_SEMESTER_COUNT = 8;

export function useSemesterCount() {
  const [count, setCount] = useState<number>(DEFAULT_SEMESTER_COUNT);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "curriculum")
        .maybeSingle();
      const v = (data?.value as { total_semesters?: number } | null)?.total_semesters;
      if (active && typeof v === "number" && v > 0 && v <= 16) setCount(v);
    };
    load();
    const ch = supabase
      .channel("app_settings:curriculum")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.curriculum" },
        load,
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return count;
}