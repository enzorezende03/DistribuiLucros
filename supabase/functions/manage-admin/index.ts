import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await supabaseAuth.auth.getUser();
    if (!caller) {
      return jsonResponse({ error: "Não autorizado" }, 401);
    }

    const { data: isAdmin } = await supabaseAuth.rpc("is_admin");
    if (!isAdmin) {
      return jsonResponse({ error: "Apenas administradores podem gerenciar admins" }, 403);
    }

    const body = await req.json();
    const { action, email, password, nome, sobrenome, user_id: targetUserId } = body;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // === CREATE ===
    if (action === "create") {
      if (!email || !password) {
        return jsonResponse({ error: "E-mail e senha são obrigatórios" }, 400);
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nome: nome || "",
          sobrenome: sobrenome || "",
          full_name: [nome, sobrenome].filter(Boolean).join(" "),
        },
      });

      if (createError) {
        return jsonResponse({ error: createError.message }, 400);
      }

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role: "admin" });

      if (roleError) {
        return jsonResponse({ error: "Usuário criado mas erro ao atribuir role: " + roleError.message }, 500);
      }

      return jsonResponse({ success: true, user_id: newUser.user.id });
    }

    // === LIST ===
    if (action === "list") {
      const { data: adminRoles, error } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "admin");

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      const admins = await Promise.all(
        (adminRoles || []).map(async (r) => {
          const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
          const meta = user?.user_metadata || {};
          const userEmail = user?.email || "unknown";
          const fallbackName = userEmail === "unknown"
            ? ""
            : userEmail
                .split("@")[0]
                .split(/[._-]+/)
                .filter(Boolean)
                .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(" ");

          return {
            user_id: r.user_id,
            email: userEmail,
            nome: meta.full_name || [meta.nome, meta.sobrenome].filter(Boolean).join(" ") || fallbackName,
            created_at: r.created_at,
          };
        })
      );

      return jsonResponse({ admins });
    }

    // === UPDATE ===
    if (action === "update") {
      if (!targetUserId) {
        return jsonResponse({ error: "user_id obrigatório" }, 400);
      }

      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          nome: nome || "",
          sobrenome: sobrenome || "",
          full_name: [nome, sobrenome].filter(Boolean).join(" "),
        },
      });

      if (updErr) {
        return jsonResponse({ error: updErr.message }, 500);
      }

      return jsonResponse({ success: true });
    }

    // === DELETE ===
    if (action === "delete") {
      if (!targetUserId) {
        return jsonResponse({ error: "user_id obrigatório" }, 400);
      }

      if (targetUserId === caller.id) {
        return jsonResponse({ error: "Não é possível excluir a si mesmo" }, 400);
      }

      // Remove admin role
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .eq("role", "admin");

      if (roleErr) {
        return jsonResponse({ error: roleErr.message }, 500);
      }

      // Delete user from auth
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (delErr) {
        return jsonResponse({ error: delErr.message }, 500);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Ação inválida" }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
});
