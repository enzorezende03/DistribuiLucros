import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders as baseCorsHeaders } from "npm:@supabase/supabase-js@2/cors";

const corsHeaders = {
  ...baseCorsHeaders,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatCnpj(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { cnpj } = await req.json().catch(() => ({}));
    const cnpjDigits = String(cnpj || "").replace(/\D/g, "");
    if (cnpjDigits.length !== 14) {
      return json({ success: false, error: "CNPJ inválido" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Find cliente by CNPJ
    const formattedCnpj = formatCnpj(cnpjDigits);
    const { data: cliente, error: cliErr } = await admin
      .from("clientes")
      .select("id, razao_social")
      .in("cnpj", [cnpjDigits, formattedCnpj])
      .maybeSingle();

    if (cliErr) return json({ success: false, error: "Erro ao consultar CNPJ" }, 500);
    if (!cliente) return json({ success: false, error: "CNPJ não encontrado em nossa base" });

    // Find linked user
    const { data: link } = await admin
      .from("user_clientes")
      .select("user_id")
      .eq("cliente_id", cliente.id)
      .limit(1)
      .maybeSingle();

    if (!link?.user_id) {
      return json({ success: false, error: "Nenhum usuário vinculado a este CNPJ. Entre em contato com o suporte." });
    }

    // Reset password to default and force change on next login
    const { error: updErr } = await admin.auth.admin.updateUserById(link.user_id, {
      password: "2mCliente",
      user_metadata: { must_change_password: true },
    });

    if (updErr) return json({ success: false, error: "Não foi possível redefinir a senha. Tente novamente em instantes." }, 500);

    return json({
      success: true,
      razao_social: cliente.razao_social,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
