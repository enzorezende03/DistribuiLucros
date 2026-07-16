import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email } = await req.json().catch(() => ({}));
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      return json({ success: false, error: "E-mail inválido" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Find user by email (paginate through auth.users)
    let foundUserId: string | null = null;
    let page = 1;
    const perPage = 200;
    while (page <= 20 && !foundUserId) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) return json({ success: false, error: "Erro ao consultar usuários" }, 500);
      const match = data.users.find((u) => (u.email || "").toLowerCase() === normalized);
      if (match) { foundUserId = match.id; break; }
      if (data.users.length < perPage) break;
      page++;
    }

    if (!foundUserId) {
      return json({ success: false, error: "E-mail não encontrado em nossa base" });
    }

    // Verify user is admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", foundUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return json({ success: false, error: "Este e-mail não pertence a um administrador" });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(foundUserId, {
      password: "2mAdmin",
      user_metadata: { must_change_password: true },
    });

    if (updErr) return json({ success: false, error: "Não foi possível redefinir a senha. Tente novamente." }, 500);

    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
