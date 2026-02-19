import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatCPF(cpf: string): string {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11) return cpf;
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatCNPJ(cnpj: string): string {
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14) return cnpj;
  return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function formatDate(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

function formatCompetencia(comp: string): string {
  const [year, month] = comp.split("-");
  const months = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];
  return `${months[parseInt(month) - 1]}/${year}`;
}

function numberToWords(n: number): string {
  // simplified - just return the formatted value
  return formatCurrency(n);
}

function buildHtml(dist: any, cliente: any, itens: any[]): string {
  const itensRows = itens
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${item.socio?.nome || "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${formatCPF(item.socio?.cpf || "")}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${formatCurrency(Number(item.valor))}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; color:#1a1a1a; padding:40px; background:#fff; }
  .container { max-width:700px; margin:0 auto; }
  .header { text-align:center; border-bottom:3px solid #2563eb; padding-bottom:20px; margin-bottom:30px; }
  .header h1 { font-size:22px; color:#2563eb; margin-bottom:4px; }
  .header p { font-size:13px; color:#666; }
  .recibo-num { font-size:16px; font-weight:700; color:#2563eb; margin-top:8px; }
  .section { margin-bottom:24px; }
  .section-title { font-size:13px; font-weight:700; text-transform:uppercase; color:#2563eb; letter-spacing:0.5px; margin-bottom:10px; border-bottom:1px solid #dbeafe; padding-bottom:4px; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; }
  .info-label { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.3px; }
  .info-value { font-size:14px; font-weight:500; margin-bottom:8px; }
  table { width:100%; border-collapse:collapse; margin-top:8px; }
  th { background:#f0f5ff; padding:10px 12px; text-align:left; font-size:12px; font-weight:700; text-transform:uppercase; color:#2563eb; letter-spacing:0.3px; }
  th:last-child { text-align:right; }
  .total-row { background:#2563eb; color:#fff; }
  .total-row td { padding:12px; font-size:16px; font-weight:700; }
  .footer { margin-top:40px; text-align:center; font-size:11px; color:#999; border-top:1px solid #e5e7eb; padding-top:16px; }
  .signatures { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:50px; }
  .sig-line { border-top:1px solid #333; padding-top:8px; text-align:center; font-size:12px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>RECIBO DE DISTRIBUIÇÃO DE LUCROS</h1>
    <p>${cliente.razao_social}</p>
    <p>CNPJ: ${formatCNPJ(cliente.cnpj)}</p>
    <div class="recibo-num">Nº ${dist.recibo_numero || "—"}</div>
  </div>

  <div class="section">
    <div class="section-title">Dados da Distribuição</div>
    <div class="info-grid">
      <div><div class="info-label">Competência</div><div class="info-value">${formatCompetencia(dist.competencia)}</div></div>
      <div><div class="info-label">Data da Distribuição</div><div class="info-value">${formatDate(dist.data_distribuicao)}</div></div>
      <div><div class="info-label">Forma de Pagamento</div><div class="info-value">${dist.forma_pagamento}</div></div>
      <div><div class="info-label">Status</div><div class="info-value">${dist.status}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Rateio por Sócio</div>
    <table>
      <thead><tr><th>Sócio</th><th>CPF</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>
        ${itensRows}
        <tr class="total-row">
          <td colspan="2">TOTAL</td>
          <td style="text-align:right">${formatCurrency(Number(dist.valor_total))}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="signatures">
    <div class="sig-line">Responsável pela Empresa</div>
    <div class="sig-line">Contador Responsável</div>
  </div>

  <div class="footer">
    Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}.
  </div>
</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { distribuicao_id } = await req.json();

    if (!distribuicao_id) {
      return new Response(JSON.stringify({ error: "distribuicao_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch distribution with client info
    const { data: dist, error: distError } = await supabase
      .from("distribuicoes")
      .select("*, cliente:clientes(razao_social, cnpj)")
      .eq("id", distribuicao_id)
      .single();

    if (distError || !dist) {
      return new Response(JSON.stringify({ error: "Distribuição não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch items with partner info
    const { data: itens, error: itensError } = await supabase
      .from("distribuicao_itens")
      .select("*, socio:socios(nome, cpf)")
      .eq("distribuicao_id", distribuicao_id);

    if (itensError) {
      return new Response(JSON.stringify({ error: "Erro ao buscar itens" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = buildHtml(dist, dist.cliente, itens || []);

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
