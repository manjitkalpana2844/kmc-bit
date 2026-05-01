import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const confirmUserEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userIds: string[] }) => {
    if (!input || !Array.isArray(input.userIds)) throw new Error("userIds required");
    const ids = input.userIds.filter((x) => typeof x === "string").slice(0, 500);
    return { userIds: ids };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    let confirmed = 0;
    let skipped = 0;
    const errors: { id: string; error: string }[] = [];

    for (const id of data.userIds) {
      try {
        const { data: u, error: getErr } = await supabaseAdmin.auth.admin.getUserById(id);
        if (getErr) {
          errors.push({ id, error: getErr.message });
          continue;
        }
        if (u?.user?.email_confirmed_at) {
          skipped++;
          continue;
        }
        const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
          email_confirm: true,
        });
        if (error) {
          errors.push({ id, error: error.message });
          continue;
        }
        confirmed++;
      } catch (e: any) {
        errors.push({ id, error: e?.message ?? "unknown" });
      }
    }

    return { confirmed, skipped, errors };
  });

export const listUnconfirmedUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const unconfirmed: { id: string; email: string | null }[] = [];
    let page = 1;
    const perPage = 200;
    // Cap pages to avoid runaway loops
    while (page <= 25) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(`Failed to list users: ${error.message}`);
      const users = data?.users ?? [];
      for (const u of users) {
        if (!u.email_confirmed_at) unconfirmed.push({ id: u.id, email: u.email ?? null });
      }
      if (users.length < perPage) break;
      page++;
    }
    return { unconfirmed };
  });

export const resendVerificationEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId || typeof input.userId !== "string") throw new Error("userId required");
    return { userId: input.userId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const { data: u, error: getErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (getErr || !u?.user) throw new Error(getErr?.message ?? "User not found");
    if (u.user.email_confirmed_at) return { sent: false, reason: "already_confirmed" };
    if (!u.user.email) throw new Error("User has no email");

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(u.user.email);
    if (error) {
      // Fallback: generate a signup link (this also triggers an email in most setups)
      const { error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: u.user.email,
      });
      if (linkErr) throw new Error(`Failed to send verification: ${linkErr.message}`);
    }
    return { sent: true };
  });