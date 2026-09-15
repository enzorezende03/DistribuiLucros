import ExcelJS from 'exceljs';

export interface SheetData {
  name: string;
  rows: string[][];
}

/** Normaliza texto: minúsculo, sem acento, espaços colapsados. */
export function normalizeText(value: string): string {
  return (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function onlyDigits(value: string): string {
  return (value || '').toString().replace(/\D/g, '');
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof value === 'object') {
    const anyVal = value as Record<string, unknown>;
    if ('text' in anyVal) return String(anyVal.text ?? '');
    if ('result' in anyVal) return cellToString(anyVal.result);
    if ('richText' in anyVal && Array.isArray(anyVal.richText)) {
      return (anyVal.richText as { text?: string }[]).map((r) => r.text || '').join('');
    }
    if ('hyperlink' in anyVal) return String(anyVal.hyperlink ?? '');
  }
  return String(value);
}

function detectSeparator(line: string): string {
  const semis = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;
  if (tabs > semis && tabs > commas) return '\t';
  return semis >= commas ? ';' : ',';
}

function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === sep && !quoted) {
      out.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

/** Lê o arquivo enviado e devolve as abas como matriz de textos. */
export async function readSpreadsheet(file: File): Promise<SheetData[]> {
  const isCsv = /\.(csv|txt)$/i.test(file.name);

  if (isCsv) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [{ name: 'CSV', rows: [] }];
    const sep = detectSeparator(lines[0]);
    return [{ name: 'CSV', rows: lines.map((l) => parseCsvLine(l, sep)) }];
  }

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheets: SheetData[] = [];
  workbook.eachSheet((sheet) => {
    const rows: string[][] = [];
    const maxCols = Math.max(sheet.columnCount || 0, 1);
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      for (let c = 1; c <= maxCols; c++) {
        values.push(cellToString(row.getCell(c).value).trim());
      }
      rows.push(values);
    });
    sheets.push({ name: sheet.name, rows });
  });

  return sheets;
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/** Converte texto/serial em data ISO (yyyy-mm-dd) ou null. */
export function parseDataCelula(raw: string): string | null {
  const value = (raw || '').trim();
  if (!value) return null;

  const iso = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return buildIso(Number(y), Number(m), Number(d));
  }

  const br = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (br) {
    const [, d, m, yRaw] = br;
    let year = Number(yRaw);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    return buildIso(year, Number(m), Number(d));
  }

  // Serial do Excel
  if (/^\d+([.,]\d+)?$/.test(value)) {
    const serial = Number(value.replace(',', '.'));
    if (serial > 20000 && serial < 80000) {
      const date = new Date(EXCEL_EPOCH + Math.round(serial) * 86400000);
      return buildIso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    }
  }

  return null;
}

function buildIso(year: number, month: number, day: number): string | null {
  if (!year || !month || !day) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const test = new Date(Date.UTC(year, month - 1, day));
  if (test.getUTCMonth() + 1 !== month || test.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Converte texto em número, aceitando 1.234,56 / 1234.56 / R$ 1.000. */
export function parseValorCelula(raw: string): number | null {
  let value = (raw || '').toString().trim();
  if (!value) return null;
  const negative = /^\(.*\)$/.test(value) || value.startsWith('-');
  value = value.replace(/[()]/g, '').replace(/r\$/i, '').replace(/\s/g, '').replace(/-/g, '');
  if (!value) return null;

  const hasComma = value.includes(',');
  const hasDot = value.includes('.');

  if (hasComma && hasDot) {
    // O último separador é o decimal
    value = value.lastIndexOf(',') > value.lastIndexOf('.')
      ? value.replace(/\./g, '').replace(',', '.')
      : value.replace(/,/g, '');
  } else if (hasComma) {
    value = value.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    const parts = value.split('.');
    // 1.234 (milhar) vs 1234.56 (decimal)
    if (parts.length > 2 || parts[parts.length - 1].length === 3) {
      value = parts.join('');
    }
  }

  if (!/^\d+(\.\d+)?$/.test(value)) return null;
  const num = Number(value);
  if (!isFinite(num)) return null;
  return negative ? -num : num;
}

export interface SocioMatchInput {
  id: string;
  nome: string;
  cpf: string;
  ativo: boolean;
  data_entrada: string | null;
  data_saida: string | null;
}

export interface LinhaImportada {
  rowIndex: number;
  dataOriginal: string;
  valorOriginal: string;
  socioOriginal: string;
  data: string | null;
  valor: number | null;
  socioId: string | null;
  avisos: string[];
  erros: string[];
  incluir: boolean;
}

export interface MapearParams {
  rows: string[][];
  startRow: number; // índice (0-based) da primeira linha de dados
  colData: number;
  colValor: number;
  colSocio: number;
  socios: SocioMatchInput[];
  existentes: { data: string; socioId: string; valor: number }[];
}

export function mapearLinhas({
  rows,
  startRow,
  colData,
  colValor,
  colSocio,
  socios,
  existentes,
}: MapearParams): LinhaImportada[] {
  const porNome = new Map<string, SocioMatchInput[]>();
  const porDoc = new Map<string, SocioMatchInput[]>();
  socios.forEach((s) => {
    const nomeKey = normalizeText(s.nome);
    if (nomeKey) porNome.set(nomeKey, [...(porNome.get(nomeKey) || []), s]);
    const docKey = onlyDigits(s.cpf);
    if (docKey) porDoc.set(docKey, [...(porDoc.get(docKey) || []), s]);
  });

  const result: LinhaImportada[] = [];

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i] || [];
    const dataOriginal = (row[colData] || '').trim();
    const valorOriginal = (row[colValor] || '').trim();
    const socioOriginal = (row[colSocio] || '').trim();

    if (!dataOriginal && !valorOriginal && !socioOriginal) continue;

    const erros: string[] = [];
    const avisos: string[] = [];

    const data = parseDataCelula(dataOriginal);
    if (!data) erros.push('Data não reconhecida');

    const valor = parseValorCelula(valorOriginal);
    if (valor === null) erros.push('Valor não reconhecido');
    else if (valor <= 0) erros.push('Valor precisa ser maior que zero');

    let socioId: string | null = null;
    const nomeKey = normalizeText(socioOriginal);
    const docKey = onlyDigits(socioOriginal);
    const candidatosNome = nomeKey ? porNome.get(nomeKey) : undefined;
    const candidatosDoc = docKey.length >= 11 ? porDoc.get(docKey) : undefined;
    const candidatos = candidatosNome?.length ? candidatosNome : candidatosDoc;

    if (!socioOriginal) {
      erros.push('Sócio não informado');
    } else if (!candidatos || candidatos.length === 0) {
      erros.push('Sócio não encontrado no cadastro');
    } else if (candidatos.length > 1) {
      erros.push('Há mais de um sócio com esse nome — escolha qual é');
    } else {
      socioId = candidatos[0].id;
      const socio = candidatos[0];
      if (data) {
        if (socio.data_entrada && data < socio.data_entrada) {
          erros.push('Data anterior à entrada do sócio na empresa');
        }
        if (socio.data_saida && data > socio.data_saida) {
          erros.push('Data posterior à saída do sócio da empresa');
        }
      }
    }

    if (data && socioId && valor !== null) {
      const dup = existentes.some(
        (e) => e.data === data && e.socioId === socioId && Math.abs(e.valor - valor) < 0.005
      );
      if (dup) avisos.push('Já existe um lançamento igual — confira se não é repetido');
    }

    result.push({
      rowIndex: i,
      dataOriginal,
      valorOriginal,
      socioOriginal,
      data,
      valor,
      socioId,
      avisos,
      erros,
      incluir: erros.length === 0,
    });
  }

  return result;
}

/** Sugere colunas a partir dos nomes do cabeçalho. */
export function sugerirColunas(header: string[]): { data: number; valor: number; socio: number } {
  const find = (terms: string[]) =>
    header.findIndex((h) => {
      const n = normalizeText(h);
      return terms.some((t) => n.includes(t));
    });

  return {
    data: find(['data', 'dia', 'competencia', 'pagamento']),
    valor: find(['valor', 'lucro', 'montante', 'total', 'r$']),
    socio: find(['socio', 'nome', 'beneficiario', 'cpf', 'favorecido']),
  };
}

export function competenciaFromData(data: string): string {
  return data.slice(0, 7);
}
