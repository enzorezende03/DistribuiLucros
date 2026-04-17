import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Lang = "pt" | "en" | "es";

const labels: Record<Lang, Record<string, string>> = {
  pt: {
    title: "RECIBO DE DISTRIBUIÇÃO DE LUCROS",
    receiptNum: "Nº",
    sectionData: "Dados da Distribuição",
    competencia: "Competência",
    dataDistribuicao: "Data da Distribuição",
    formaPagamento: "Forma de Pagamento",
    status: "Status",
    sectionRateio: "Rateio por Sócio",
    socio: "Sócio",
    cpf: "CPF",
    valor: "Valor",
    total: "TOTAL",
    responsavel: "Responsável pela Empresa",
    geradoEm: "Documento gerado em",
    as: "às",
    // status values
    ENVIADA_AO_CONTADOR: "Enviada ao Contador",
    APROVADA: "Aprovada",
    AJUSTE_SOLICITADO: "Ajuste Solicitado",
    CANCELADA: "Cancelada",
    // payment
    transferencia: "Transferência Bancária",
    pix: "PIX",
    cheque: "Cheque",
    dinheiro: "Dinheiro",
    // months
    m1: "Janeiro", m2: "Fevereiro", m3: "Março", m4: "Abril",
    m5: "Maio", m6: "Junho", m7: "Julho", m8: "Agosto",
    m9: "Setembro", m10: "Outubro", m11: "Novembro", m12: "Dezembro",
  },
  en: {
    title: "PROFIT DISTRIBUTION RECEIPT",
    receiptNum: "No.",
    sectionData: "Distribution Details",
    competencia: "Period",
    dataDistribuicao: "Distribution Date",
    formaPagamento: "Payment Method",
    status: "Status",
    sectionRateio: "Breakdown by Partner",
    socio: "Partner",
    cpf: "CPF",
    valor: "Amount",
    total: "TOTAL",
    responsavel: "Company Representative",
    geradoEm: "Document generated on",
    as: "at",
    ENVIADA_AO_CONTADOR: "Sent to Accountant",
    APROVADA: "Approved",
    AJUSTE_SOLICITADO: "Adjustment Requested",
    CANCELADA: "Cancelled",
    transferencia: "Bank Transfer",
    pix: "PIX",
    cheque: "Check",
    dinheiro: "Cash",
    m1: "January", m2: "February", m3: "March", m4: "April",
    m5: "May", m6: "June", m7: "July", m8: "August",
    m9: "September", m10: "October", m11: "November", m12: "December",
  },
  es: {
    title: "RECIBO DE DISTRIBUCIÓN DE GANANCIAS",
    receiptNum: "Nº",
    sectionData: "Datos de la Distribución",
    competencia: "Período",
    dataDistribuicao: "Fecha de Distribución",
    formaPagamento: "Forma de Pago",
    status: "Estado",
    sectionRateio: "Desglose por Socio",
    socio: "Socio",
    cpf: "CPF",
    valor: "Valor",
    total: "TOTAL",
    responsavel: "Responsable de la Empresa",
    geradoEm: "Documento generado el",
    as: "a las",
    ENVIADA_AO_CONTADOR: "Enviada al Contador",
    APROVADA: "Aprobada",
    AJUSTE_SOLICITADO: "Ajuste Solicitado",
    CANCELADA: "Cancelada",
    transferencia: "Transferencia Bancaria",
    pix: "PIX",
    cheque: "Cheque",
    dinheiro: "Efectivo",
    m1: "Enero", m2: "Febrero", m3: "Marzo", m4: "Abril",
    m5: "Mayo", m6: "Junio", m7: "Julio", m8: "Agosto",
    m9: "Septiembre", m10: "Octubre", m11: "Noviembre", m12: "Diciembre",
  },
};

function getLabels(lang: string): Record<string, string> {
  return labels[(lang as Lang)] || labels.pt;
}

function formatCurrency(value: number, lang: Lang): string {
  const locale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR";
  const currency = lang === "en" ? "USD" : "BRL";
  if (lang === "en") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
      .replace("$", "R$");
  }
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(value);
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

function formatDate(d: string, lang: Lang): string {
  const locale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR";
  return new Date(d + "T12:00:00").toLocaleDateString(locale);
}

function formatCompetencia(comp: string, l: Record<string, string>): string {
  const [year, month] = comp.split("-");
  const key = `m${parseInt(month)}`;
  return `${l[key]}/${year}`;
}

function translateStatus(status: string, l: Record<string, string>): string {
  return l[status] || status;
}

function translatePayment(forma: string, l: Record<string, string>): string {
  const map: Record<string, string> = {
    "Transferência Bancária": "transferencia",
    "transferencia": "transferencia",
    "PIX": "pix",
    "Cheque": "cheque",
    "Dinheiro": "dinheiro",
  };
  const key = map[forma];
  return key ? l[key] : forma;
}

function buildSinglePartnerSection(item: any, lang: Lang, mobile: boolean, l: Record<string, string>): string {
  return `
      <tr>
        <td style="padding:${mobile ? '6px 8px' : '8px 12px'};border-bottom:1px solid #e5e7eb;font-size:${mobile ? '12px' : '14px'};">${item.socio?.nome || "—"}</td>
        <td style="padding:${mobile ? '6px 8px' : '8px 12px'};border-bottom:1px solid #e5e7eb;font-size:${mobile ? '12px' : '14px'};">${formatCPF(item.socio?.cpf || "")}</td>
        <td style="padding:${mobile ? '6px 8px' : '8px 12px'};border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;font-size:${mobile ? '12px' : '14px'};">${formatCurrency(Number(item.valor), lang)}</td>
      </tr>`;
}

function buildReceiptPage(dist: any, cliente: any, itens: any[], lang: Lang, mobile: boolean, isLast: boolean, suffix: string, totalValue: number): string {
  const l = getLabels(lang);
  const locale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR";

  const itensRows = itens.map((item) => buildSinglePartnerSection(item, lang, mobile, l)).join("");

  const now = new Date();
  const dateStr = now.toLocaleDateString(locale);
  const timeStr = now.toLocaleTimeString(locale);
  const reciboNum = `${dist.recibo_numero || "—"}${suffix}`;
  const pageBreak = isLast ? "" : 'style="page-break-after:always;"';

  return `
<div class="container" ${pageBreak}>
  <div class="header">
    <h1>${l.title}</h1>
    <p>${cliente.razao_social}</p>
    <p>CNPJ: ${formatCNPJ(cliente.cnpj)}</p>
    <div class="recibo-num">${l.receiptNum} ${reciboNum}</div>
  </div>

  <div class="section">
    <div class="section-title">${l.sectionData}</div>
     <div class="info-grid">
       <div><div class="info-label">${l.competencia}</div><div class="info-value">${formatCompetencia(dist.competencia, l)}</div></div>
       <div><div class="info-label">${l.dataDistribuicao}</div><div class="info-value">${formatDate(dist.data_distribuicao, lang)}</div></div>
     </div>
  </div>

  <div class="section">
    <div class="section-title">${l.sectionRateio}</div>
    <table>
      <thead><tr><th>${l.socio}</th><th>${l.cpf}</th><th style="text-align:right">${l.valor}</th></tr></thead>
      <tbody>
        ${itensRows}
        <tr class="total-row">
          <td colspan="2">${l.total}</td>
          <td style="text-align:right">${formatCurrency(totalValue, lang)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="margin-top:50px;max-width:300px;margin-left:auto;margin-right:auto;">
    <div class="sig-line">${l.responsavel}</div>
  </div>

  <div class="footer">
    ${l.geradoEm} ${dateStr} ${l.as} ${timeStr}.
  </div>
</div>`;
}

function buildHtml(dist: any, cliente: any, itens: any[], lang: Lang, mobile: boolean): string {
  const l = getLabels(lang);

  // Generate one receipt page per partner so each partner has their own receipt
  const pages = itens.length > 0
    ? itens.map((item, idx) => {
        const suffix = itens.length > 1 ? `-${String.fromCharCode(65 + idx)}` : "";
        return buildReceiptPage(dist, cliente, [item], lang, mobile, idx === itens.length - 1, suffix, Number(item.valor));
      }).join("")
    : buildReceiptPage(dist, cliente, [], lang, mobile, true, "", Number(dist.valor_total));

  const mobileStyles = mobile ? `
    body { padding:16px 12px; }
    .container { max-width:100%; }
    .header h1 { font-size:16px; }
    .header p { font-size:11px; }
    .recibo-num { font-size:13px; }
    .section-title { font-size:11px; }
    .info-grid { grid-template-columns:1fr 1fr; gap:4px 12px; }
    .info-label { font-size:10px; }
    .info-value { font-size:12px; margin-bottom:6px; }
    th { padding:6px 8px; font-size:10px; }
    .total-row td { padding:8px; font-size:13px; }
    .sig-line { font-size:11px; }
    .footer { font-size:10px; }
  ` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
  .sig-line { border-top:1px solid #333; padding-top:8px; text-align:center; font-size:12px; }
  ${mobileStyles}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${l.title}</h1>
    <p>${cliente.razao_social}</p>
    <p>CNPJ: ${formatCNPJ(cliente.cnpj)}</p>
    <div class="recibo-num">${l.receiptNum} ${dist.recibo_numero || "—"}</div>
  </div>

  <div class="section">
    <div class="section-title">${l.sectionData}</div>
     <div class="info-grid">
       <div><div class="info-label">${l.competencia}</div><div class="info-value">${formatCompetencia(dist.competencia, l)}</div></div>
       <div><div class="info-label">${l.dataDistribuicao}</div><div class="info-value">${formatDate(dist.data_distribuicao, lang)}</div></div>
     </div>
  </div>

  <div class="section">
    <div class="section-title">${l.sectionRateio}</div>
    <table>
      <thead><tr><th>${l.socio}</th><th>${l.cpf}</th><th style="text-align:right">${l.valor}</th></tr></thead>
      <tbody>
        ${itensRows}
        <tr class="total-row">
          <td colspan="2">${l.total}</td>
          <td style="text-align:right">${formatCurrency(Number(dist.valor_total), lang)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="margin-top:50px;max-width:300px;margin-left:auto;margin-right:auto;">
    <div class="sig-line">${l.responsavel}</div>
  </div>

  <div class="footer">
    ${l.geradoEm} ${dateStr} ${l.as} ${timeStr}.
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
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create an RLS-aware client using the caller's token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { distribuicao_id, lang, mobile } = await req.json();
    const language: Lang = (["pt", "en", "es"].includes(lang) ? lang : "pt") as Lang;

    if (!distribuicao_id) {
      return new Response(JSON.stringify({ error: "distribuicao_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use RLS-aware client so only authorized distributions are returned
    const { data: dist, error: distError } = await supabaseAuth
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

    const { data: itens, error: itensError } = await supabaseAuth
      .from("distribuicao_itens")
      .select("*, socio:socios(nome, cpf)")
      .eq("distribuicao_id", distribuicao_id);

    if (itensError) {
      return new Response(JSON.stringify({ error: "Erro ao buscar itens" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = buildHtml(dist, dist.cliente, itens || [], language, !!mobile);

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
