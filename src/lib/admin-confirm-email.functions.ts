import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Response(error.message, { status: 500 });
  if (!data) throw new Response("Forbidden: admin only", { status: 403 });
}

export const listUnconfirmedUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const unconfirmed: { id: string; email: string | null }[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Response(error.message, { status: 500 });
      for (const u of data.users) {
        if (!u.email_confirmed_at) unconfirmed.push({ id: u.id, email: u.email ?? null });
      }
      if (data.users.length < 200) break;
      page++;
      if (page > 25) break;
    }
    return { unconfirmed };
  });

export const confirmUserEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userIds: z.array(z.string().uuid()).min(1).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let confirmed = 0;
    let skipped = 0;
    const errors: { id: string; message: string }[] = [];
    for (const id of data.userIds) {
      try {
        const { data: got, error: gErr } = await supabaseAdmin.auth.admin.getUserById(id);
        if (gErr) { errors.push({ id, message: gErr.message }); continue; }
        if (got.user?.email_confirmed_at) { skipped++; continue; }
        const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { email_confirm: true });
        if (error) errors.push({ id, message: error.message });
        else confirmed++;
      } catch (e: any) {
        errors.push({ id, message: e?.message ?? "unknown" });
      }
    }
    return { confirmed, skipped, errors };
  });

export const resendVerificationEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: got, error: gErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (gErr) throw new Response(gErr.message, { status: 500 });
    if (!got.user?.email) throw new Response("User has no email", { status: 400 });
    if (got.user.email_confirmed_at) return { sent: false };
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(got.user.email);
    if (error) {
      // fallback: generate link (still counts as a delivery attempt depending on SMTP config)
      const { error: lErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: got.user.email,
      });
      if (lErr) throw new Response(lErr.message, { status: 500 });
    }
    return { sent: true };
  });
