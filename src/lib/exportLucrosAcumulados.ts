import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo2m from '@/assets/logo-2m.png';
import { formatCurrency, formatCNPJ, formatDate } from '@/lib/format';
import type { MovimentacaoLucro } from '@/hooks/useMovimentacoesLucros';

interface ExportParams {
  razaoSocial: string;
  cnpj: string;
  saldoAtual: number;
  movimentacoes: MovimentacaoLucro[];
  incluirProjecao?: boolean;
}

function getMovDate(mov: MovimentacaoLucro): string {
  return mov.distribuicao?.data_distribuicao || mov.created_at;
}

function computeProjecao(movimentacoes: MovimentacaoLucro[], saldoAtual: number) {
  const abatimentos = movimentacoes.filter((m) => m.tipo === 'SAIDA' && m.distribuicao_id);
  if (abatimentos.length === 0 || saldoAtual <= 0) return null;
  const porMes = new Map<string, number>();
  abatimentos.forEach((m) => {
    const key = m.competencia || (m.distribuicao?.data_distribuicao || m.created_at).slice(0, 7);
    porMes.set(key, (porMes.get(key) || 0) + Number(m.valor));
  });
  const valores = Array.from(porMes.values());
  const mediaMensal = valores.reduce((a, b) => a + b, 0) / valores.length;
  if (mediaMensal <= 0) return null;
  const mesesRestantes = saldoAtual / mediaMensal;
  const mesesInt = Math.floor(mesesRestantes);
  const dataEsgotamento = new Date();
  dataEsgotamento.setMonth(dataEsgotamento.getMonth() + Math.ceil(mesesRestantes));
  const mesAno = dataEsgotamento.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return { mediaMensal, mesesQtd: valores.length, mesesRestantes, mesesInt, mesAno };
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

export async function exportLucrosAcumuladosPDF(params: ExportParams) {
  const { razaoSocial, cnpj, saldoAtual, movimentacoes, incluirProjecao } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Logo
  try {
    const logoData = await loadLogoDataUrl();
    doc.addImage(logoData, 'PNG', 40, 30, 90, 45);
  } catch {
    // ignore
  }

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Lucros Acumulados', pageWidth - 40, 45, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Controle de saldo com Ata Registrada', pageWidth - 40, 62, { align: 'right' });
  doc.text(`Emitido em ${formatDate(new Date().toISOString())}`, pageWidth - 40, 76, { align: 'right' });

  // Company block
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(razaoSocial, 40, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`CNPJ: ${formatCNPJ(cnpj)}`, 40, 115);

  // Saldo box
  doc.setDrawColor(16, 185, 129);
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(40, 130, pageWidth - 80, 50, 6, 6, 'FD');
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text('Saldo Atual de Lucros Acumulados', 55, 150);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(formatCurrency(saldoAtual), 55, 172);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');

  let tableStartY = 200;

  // Projection box (optional)
  const projecao = incluirProjecao ? computeProjecao(movimentacoes, saldoAtual) : null;
  if (incluirProjecao) {
    const boxY = 195;
    const boxH = 80;
    doc.setDrawColor(245, 158, 11);
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(40, boxY, pageWidth - 80, boxH, 6, 6, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(120, 90, 10);
    doc.text('Projeção de Esgotamento do Saldo', 55, boxY + 18);
    doc.setTextColor(0);
    if (projecao) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(90);
      const col1 = 55;
      const col2 = 55 + (pageWidth - 80) / 3;
      const col3 = 55 + 2 * (pageWidth - 80) / 3;
      const labelY = boxY + 36;
      const valueY = boxY + 54;
      doc.text('Média mensal de abatimento', col1, labelY);
      doc.text('Meses estimados até esgotar', col2, labelY);
      doc.text('Previsão de esgotamento', col3, labelY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(180, 83, 9);
      doc.text(formatCurrency(projecao.mediaMensal), col1, valueY);
      const mesesLabel = `${projecao.mesesInt} ${projecao.mesesInt === 1 ? 'mês' : 'meses'}${projecao.mesesRestantes - projecao.mesesInt > 0.1 ? ' aprox.' : ''}`;
      doc.text(mesesLabel, col2, valueY);
      doc.text(projecao.mesAno.charAt(0).toUpperCase() + projecao.mesAno.slice(1), col3, valueY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Baseada em ${projecao.mesesQtd} ${projecao.mesesQtd === 1 ? 'mês' : 'meses'} com excedente. A partir do esgotamento, distribuições acima de R$ 50.000/sócio no mês passarão a ter 10% de IR sobre o excedente.`,
        55,
        boxY + boxH - 8,
        { maxWidth: pageWidth - 110 }
      );
    } else {
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        saldoAtual <= 0
          ? 'Saldo já esgotado. As próximas distribuições acima de R$ 50.000/sócio terão incidência de 10% de IR.'
          : 'Ainda não há histórico de abatimentos suficiente para projetar o esgotamento do saldo.',
        55,
        boxY + 40,
        { maxWidth: pageWidth - 110 }
      );
    }
    doc.setTextColor(0);
    tableStartY = boxY + boxH + 15;
  }

  // Table
  const rows = movimentacoes.map((mov) => [
    formatDate(getMovDate(mov)),
    mov.tipo === 'ENTRADA' ? 'Entrada' : 'Saída',
    mov.descricao,
    `${mov.tipo === 'ENTRADA' ? '+' : '-'}${formatCurrency(mov.valor)}`,
    formatCurrency(mov.saldo_anterior),
    formatCurrency(mov.saldo_posterior),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [['Data', 'Tipo', 'Descrição', 'Valor', 'Saldo Anterior', 'Saldo Posterior']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 60 },
      3: { halign: 'right', cellWidth: 100 },
      4: { halign: 'right', cellWidth: 100, textColor: [120, 120, 120] },
      5: { halign: 'right', cellWidth: 110, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const isEntrada = String(data.cell.raw).startsWith('+');
        data.cell.styles.textColor = isEntrada ? [5, 150, 105] : [220, 38, 38];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 40, right: 40 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      `2M Contabilidade • DistribuiLucros — Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' }
    );
  }

  doc.save(`lucros_acumulados_${razaoSocial.replace(/\s+/g, '_')}.pdf`);
}

export async function exportLucrosAcumuladosExcel(params: ExportParams) {
  const { razaoSocial, cnpj, saldoAtual, movimentacoes } = params;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Lucros Acumulados');

  // Logo
  try {
    const logoData = await loadLogoDataUrl();
    const base64 = logoData.split(',')[1];
    const imgId = wb.addImage({ base64, extension: 'png' });
    ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 60 } });
  } catch {
    // ignore
  }

  ws.mergeCells('C1:F1');
  ws.getCell('C1').value = 'Relatório de Lucros Acumulados';
  ws.getCell('C1').font = { bold: true, size: 16 };
  ws.getCell('C1').alignment = { horizontal: 'right', vertical: 'middle' };

  ws.mergeCells('C2:F2');
  ws.getCell('C2').value = `Emitido em ${formatDate(new Date().toISOString())}`;
  ws.getCell('C2').alignment = { horizontal: 'right' };
  ws.getCell('C2').font = { color: { argb: 'FF666666' } };

  ws.getRow(1).height = 30;
  ws.getRow(2).height = 20;

  ws.getCell('A4').value = 'Empresa:';
  ws.getCell('A4').font = { bold: true };
  ws.getCell('B4').value = razaoSocial;
  ws.getCell('A5').value = 'CNPJ:';
  ws.getCell('A5').font = { bold: true };
  ws.getCell('B5').value = formatCNPJ(cnpj);

  ws.getCell('A7').value = 'Saldo Atual de Lucros Acumulados:';
  ws.getCell('A7').font = { bold: true, size: 12 };
  ws.getCell('C7').value = saldoAtual;
  ws.getCell('C7').numFmt = '"R$" #,##0.00';
  ws.getCell('C7').font = { bold: true, size: 12, color: { argb: 'FF059669' } };

  // Table header
  const headerRow = 9;
  const headers = ['Data', 'Tipo', 'Descrição', 'Valor', 'Saldo Anterior', 'Saldo Posterior'];
  headers.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin' } };
  });

  movimentacoes.forEach((mov, idx) => {
    const rowNum = headerRow + 1 + idx;
    const dateStr = getMovDate(mov);
    const signedValue = mov.tipo === 'ENTRADA' ? mov.valor : -mov.valor;
    ws.getCell(rowNum, 1).value = formatDate(dateStr);
    ws.getCell(rowNum, 2).value = mov.tipo === 'ENTRADA' ? 'Entrada' : 'Saída';
    ws.getCell(rowNum, 3).value = mov.descricao;
    ws.getCell(rowNum, 4).value = signedValue;
    ws.getCell(rowNum, 4).numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
    ws.getCell(rowNum, 4).font = {
      bold: true,
      color: { argb: mov.tipo === 'ENTRADA' ? 'FF059669' : 'FFDC2626' },
    };
    ws.getCell(rowNum, 5).value = mov.saldo_anterior;
    ws.getCell(rowNum, 5).numFmt = '"R$" #,##0.00';
    ws.getCell(rowNum, 6).value = mov.saldo_posterior;
    ws.getCell(rowNum, 6).numFmt = '"R$" #,##0.00';
    ws.getCell(rowNum, 6).font = { bold: true };
  });

  ws.columns = [
    { width: 14 },
    { width: 12 },
    { width: 60 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lucros_acumulados_${razaoSocial.replace(/\s+/g, '_')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
