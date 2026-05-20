// Edge function SSO: recebe ?token=...&redirect=... (HMAC-SHA256),
// localiza/cria usuário por CNPJ e devolve um magic link que loga o usuário no DL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SSO_SECRET = Deno.env.get("SSO_SHARED_SECRET")!;

function b64urlToBytes(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function bytesToStr(b: Uint8Array) {
  return new TextDecoder().decode(b);
}
function onlyDigits(s: string) {
  return (s ?? "").replace(/\D/g, "");
}

async function verify(token: string) {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) throw new Error("token mal formado");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SSO_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlToBytes(sigB64),
    new TextEncoder().encode(payloadB64),
  );
  if (!ok) throw new Error("assinatura inválida");
  const payload = JSON.parse(bytesToStr(b64urlToBytes(payloadB64)));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("token expirado");
  return payload as { email?: string; name?: string; cnpj?: string };
}

function redirectHtml(target: string) {
  const safe = target.replace(/"/g, "&quot;");
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Entrando…</title>
<script>location.replace(${JSON.stringify(target)})</script>
<noscript><a href="${safe}">Continuar</a></noscript>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function errorPage(msg: string) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Falha no login</title>
<body style="font-family:system-ui;padding:2rem;max-width:600px;margin:auto">
<h1>Falha no login automático</h1>
<p>${msg}</p>
<p><a href="/login">Ir para o login</a></p>
</body>`,
    { status: 401, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const redirect = url.searchParams.get("redirect") || "/";
    if (!token) return errorPage("Token ausente");

    const payload = await verify(token);
    const cnpjDigits = onlyDigits(payload.cnpj ?? "");
    if (cnpjDigits.length !== 14) return errorPage("Token sem CNPJ válido");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1) Procura o cliente pelo CNPJ (compara apenas dígitos)
    const { data: clientes, error: cErr } = await admin
      .from("clientes")
      .select("id, cnpj, email_responsavel");
    if (cErr) return errorPage("Erro ao consultar clientes: " + cErr.message);

    const cliente = (clientes ?? []).find(
      (c: any) => onlyDigits(c.cnpj) === cnpjDigits,
    );
    if (!cliente) return errorPage("CNPJ não cadastrado no DistribuiLucros");

    // 2) Tenta achar usuário já vinculado a esse cliente
    let userId: string | null = null;
    const { data: links } = await admin
      .from("user_clientes")
      .select("user_id")
      .eq("cliente_id", cliente.id)
      .limit(1);
    if (links && links.length > 0) userId = links[0].user_id;

    // E-mail a usar: real do responsável se existir, senão sintético determinístico por CNPJ
    const syntheticEmail =
      cliente.email_responsavel && cliente.email_responsavel.includes("@")
        ? cliente.email_responsavel
        : `cnpj-${cnpjDigits}@distribuilucros.local`;

    if (!userId) {
      // tenta achar por email
      const { data: list } = await admin.auth.admin.listUsers();
      const found = list?.users?.find(
        (u) => u.email?.toLowerCase() === syntheticEmail.toLowerCase(),
      );
      if (found) userId = found.id;
    }

    if (!userId) {
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email: syntheticEmail,
          email_confirm: true,
          user_metadata: { cnpj: cnpjDigits, nome: payload.name ?? null },
        });
      if (createErr) return errorPage("Falha ao criar usuário: " + createErr.message);
      userId = created.user!.id;
    }

    // 3) Garante vínculo aprovado + role cliente
    await admin
      .from("user_clientes")
      .upsert(
        { user_id: userId, cliente_id: cliente.id, aprovado: true, ativo: true },
        { onConflict: "user_id,cliente_id" },
      );
    await admin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "cliente", cliente_id: cliente.id },
        { onConflict: "user_id,role" },
      );

    // 4) Gera magic link e devolve a URL com tokens no hash
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: syntheticEmail,
      options: { redirectTo: new URL(redirect, url.origin).toString() },
    });
    if (linkErr || !link?.properties?.action_link)
      return errorPage("Falha ao gerar sessão: " + (linkErr?.message ?? ""));

    return redirectHtml(link.properties.action_link);
  } catch (e) {
    return errorPage((e as Error).message);
  }
});
