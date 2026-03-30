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
      return jsonResponse({ error: "Apenas administradores podem gerenciar usuários" }, 403);
    }

    const body = await req.json();
    const { action, email, password, nome, sobrenome, user_id: targetUserId, role, cliente_ids } = body;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // === CREATE ===
    if (action === "create") {
      if (!email || !password) {
        return jsonResponse({ error: "E-mail e senha são obrigatórios" }, 400);
      }

      const userRole = role || "admin";
      if (userRole !== "admin" && userRole !== "cliente") {
        return jsonResponse({ error: "Perfil inválido" }, 400);
      }

      if (userRole === "cliente" && (!cliente_ids || cliente_ids.length === 0)) {
        return jsonResponse({ error: "Selecione pelo menos uma empresa para o usuário cliente" }, 400);
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
        .insert({ user_id: newUser.user.id, role: userRole });

      if (roleError) {
        return jsonResponse({ error: "Usuário criado mas erro ao atribuir perfil: " + roleError.message }, 500);
      }

      // If cliente role, link to empresas
      if (userRole === "cliente" && cliente_ids && cliente_ids.length > 0) {
        const links = cliente_ids.map((cid: string) => ({
          user_id: newUser.user.id,
          cliente_id: cid,
        }));
        const { error: linkError } = await supabaseAdmin
          .from("user_clientes")
          .insert(links);

        if (linkError) {
          return jsonResponse({ error: "Usuário criado mas erro ao vincular empresas: " + linkError.message }, 500);
        }
      }

      return jsonResponse({ success: true, user_id: newUser.user.id });
    }

    // === LIST ===
    if (action === "list") {
      const roleFilter = body.role_filter; // optional: 'admin' | 'cliente' | undefined (all)
      
      let query = supabaseAdmin.from("user_roles").select("user_id, role, created_at");
      if (roleFilter) {
        query = query.eq("role", roleFilter);
      }

      const { data: userRoles, error } = await query;

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      const users = await Promise.all(
        (userRoles || []).map(async (r) => {
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

          // Get linked empresas for cliente users
          let empresas: { cliente_id: string; razao_social: string }[] = [];
          if (r.role === "cliente") {
            const { data: links } = await supabaseAdmin
              .from("user_clientes")
              .select("cliente_id, clientes:clientes(razao_social)")
              .eq("user_id", r.user_id);
            empresas = (links || []).map((l: any) => ({
              cliente_id: l.cliente_id,
              razao_social: l.clientes?.razao_social || "",
            }));
          }

          return {
            user_id: r.user_id,
            email: userEmail,
            nome: meta.full_name || [meta.nome, meta.sobrenome].filter(Boolean).join(" ") || fallbackName,
            role: r.role,
            created_at: r.created_at,
            empresas,
          };
        })
      );

      return jsonResponse({ users });
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

      // Remove all roles
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId);

      if (roleErr) {
        return jsonResponse({ error: roleErr.message }, 500);
      }

      // Remove user_clientes links
      await supabaseAdmin
        .from("user_clientes")
        .delete()
        .eq("user_id", targetUserId);

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
