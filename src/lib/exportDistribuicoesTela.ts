import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo2m from '@/assets/logo-2m.png';
import { formatCurrency, formatCNPJ, formatDate, formatCompetencia } from '@/lib/format';

export interface LinhaExport {
  recibo: string;
  socio: string;
  data: string;
  valor: number;
  status: string;
  tipo: 'dist' | 'naohouve';
  competencia: string;
}

interface ExportParams {
  razaoSocial: string;
  cnpj: string;
  linhas: LinhaExport[];
  total: number;
  qtdDistribuicoes: number;
  filtrosLabel?: string;
}

async function loadLogoDataUrl(): Promise<string> {
  const res = await fetch(logo2m);
  const blob = await res.blob();
  return await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function nomeArquivo(razaoSocial: string, ext: string) {
  const slug = razaoSocial.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
  const hoje = new Date().toISOString().slice(0, 10);
  return `distribuicoes_${slug}_${hoje}.${ext}`;
}

function linhaTexto(l: LinhaExport) {
  if (l.tipo === 'naohouve') {
    return [
      '—',
      `Não houve distribuição (${formatCompetencia(l.competencia)})`,
      formatDate(l.data),
      '—',
      l.status,
    ];
  }
  return [l.recibo || '—', l.socio || '—', formatDate(l.data), formatCurrency(l.valor), l.status];
}

export async function exportDistribuicoesTelaPDF(params: ExportParams) {
  const { razaoSocial, cnpj, linhas, total, qtdDistribuicoes, filtrosLabel } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  try {
    const logoData = await loadLogoDataUrl();
    doc.addImage(logoData, 'PNG', 40, 30, 90, 45);
  } catch {
    // ignore
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Distribuições de Lucros', pageWidth - 40, 45, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Emitido em ${formatDate(new Date().toISOString())}`, pageWidth - 40, 62, { align: 'right' });

  doc.setTextColor(30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(razaoSocial, 40, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`CNPJ: ${formatCNPJ(cnpj)}`, 40, 114);
  if (filtrosLabel) doc.text(filtrosLabel, 40, 128);

  autoTable(doc, {
    startY: filtrosLabel ? 145 : 132,
    head: [['Recibo', 'Sócio', 'Data', 'Valor', 'Situação']],
    body: linhas.map(linhaTexto),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [16, 44, 74], textColor: 255 },
    columnStyles: { 3: { halign: 'right' } },
    theme: 'striped',
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? 160;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text(
    `Total distribuído: ${formatCurrency(total)}  •  ${qtdDistribuicoes} distribuição(ões) (não considera canceladas)`,
    40,
    finalY + 24
  );

  doc.save(nomeArquivo(razaoSocial, 'pdf'));
}

export async function exportDistribuicoesTelaExcel(params: ExportParams) {
  const { razaoSocial, cnpj, linhas, total, qtdDistribuicoes, filtrosLabel } = params;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Distribuições');

  ws.addRow([razaoSocial]).font = { bold: true, size: 13 };
  ws.addRow([`CNPJ: ${formatCNPJ(cnpj)}`]);
  if (filtrosLabel) ws.addRow([filtrosLabel]);
  ws.addRow([`Emitido em ${formatDate(new Date().toISOString())}`]);
  ws.addRow([]);

  const header = ws.addRow(['Recibo', 'Sócio', 'Data', 'Valor', 'Situação']);
  header.font = { bold: true };

  linhas.forEach((l) => {
    ws.addRow([
      l.tipo === 'naohouve' ? '—' : l.recibo || '',
      l.tipo === 'naohouve' ? `Não houve distribuição (${formatCompetencia(l.competencia)})` : l.socio,
      formatDate(l.data),
      l.tipo === 'naohouve' ? '' : Number(l.valor),
      l.status,
    ]);
  });

  ws.addRow([]);
  const totalRow = ws.addRow(['', `Total (${qtdDistribuicoes} distribuição(ões))`, '', total, '']);
  totalRow.font = { bold: true };

  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 45;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 22;
  ws.getColumn(4).numFmt = '#,##0.00';

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo(razaoSocial, 'xlsx');
  a.click();
  URL.revokeObjectURL(url);
}
