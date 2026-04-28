import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      GET: async () => {
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;
        if (!email || !password) {
          return new Response("Missing ADMIN_EMAIL or ADMIN_PASSWORD env", { status: 500 });
        }
        let userId: string | undefined;
        const created = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (created.error) {
          if (!/already|registered|exists/i.test(created.error.message)) {
            return new Response("Create error: " + created.error.message, { status: 500 });
          }
          let page = 1;
          while (!userId) {
            const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
            if (error) return new Response("List error: " + error.message, { status: 500 });
            const u = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
            if (u) { userId = u.id; break; }
            if (data.users.length < 200) break;
            page++;
          }
          if (!userId) return new Response("User not found after create-conflict", { status: 500 });
          await supabaseAdmin.auth.admin.updateUserById(userId, { password, email_confirm: true });
        } else {
          userId = created.data.user.id;
        }
        const { error: rerr } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
        if (rerr) return new Response("Role error: " + rerr.message, { status: 500 });
        return new Response(
          JSON.stringify({ ok: true, email, userId, message: "Admin ready. Delete this route now." }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});