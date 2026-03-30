import { useState, useCallback } from 'react';
import ExcelJS from 'exceljs';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { formatCurrency, formatCPF, formatCNPJ } from '@/lib/format';

interface ExportDistribuicoesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDistribuicoesDialog({ open, onOpenChange }: ExportDistribuicoesDialogProps) {
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  // Generate last 24 months as options, sorted chronologically (oldest first)
  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }).reverse();

  const toggleMonth = (month: string) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const selectAll = () => {
    if (selectedMonths.length === monthOptions.length) {
      setSelectedMonths([]);
    } else {
      setSelectedMonths([...monthOptions]);
    }
  };

  const handleExport = useCallback(async () => {
    if (selectedMonths.length === 0) {
      toast.error('Selecione pelo menos um mês.');
      return;
    }

    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('distribuicoes')
        .select(`
          *,
          cliente:clientes(razao_social, cnpj),
          itens:distribuicao_itens(id, socio_id, valor, socio:socios(nome, cpf))
        `)
        .in('competencia', selectedMonths)
        .order('competencia', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.warning('Nenhuma distribuição encontrada para os meses selecionados.');
        setExporting(false);
        return;
      }

      // Flatten data: one row per item (sócio)
      const rows: Record<string, any>[] = [];
      for (const dist of data) {
        const baseRow = {
          'Recibo': dist.recibo_numero || '',
          'Período': month,
          'Data Distribuição': dist.data_distribuicao,
          'Cliente': (dist as any).cliente?.razao_social || '',
          'CNPJ': formatCNPJ((dist as any).cliente?.cnpj || ''),
          'Valor Total': Number(dist.valor_total),
          'Forma Pagamento': dist.forma_pagamento,
          'Status': dist.status,
          'Solicitante': dist.solicitante_nome,
          'E-mail Solicitante': dist.solicitante_email,
        };

        const itens = (dist as any).itens || [];
        if (itens.length > 0) {
          for (const item of itens) {
            rows.push({
              ...baseRow,
              'Sócio': item.socio?.nome || '',
              'CPF Sócio': formatCPF(item.socio?.cpf || ''),
              'Valor Sócio': Number(item.valor),
            });
          }
        } else {
          rows.push({ ...baseRow, 'Sócio': '', 'CPF Sócio': '', 'Valor Sócio': '' });
        }
      }

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Distribuições');
      const columns = Object.keys(rows[0]);
      ws.columns = columns.map((key) => ({ header: key, key }));
      rows.forEach((row) => ws.addRow(row));

      const monthsLabel = selectedMonths.length === 1
        ? selectedMonths[0]
        : `${selectedMonths.length}_meses`;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `distribuicoes_${monthsLabel}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${data.length} distribuição(ões) exportada(s)!`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao exportar: ' + (err.message || 'erro desconhecido'));
    } finally {
      setExporting(false);
    }
  }, [selectedMonths, onOpenChange]);

  const handleClose = (open: boolean) => {
    if (!open) setSelectedMonths([]);
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-accent" />
            Exportar Distribuições
          </DialogTitle>
          <DialogDescription>
            Selecione os meses que deseja exportar para Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-3 py-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {selectedMonths.length} mês(es) selecionado(s)
            </Badge>
            <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={selectAll}>
              {selectedMonths.length === monthOptions.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-[350px] overflow-auto pr-1">
            {monthOptions.map((month) => (
              <label
                key={month}
                className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedMonths.includes(month)}
                  onCheckedChange={() => toggleMonth(month)}
                />
                <span className="text-sm">{formatMonth(month)}</span>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || selectedMonths.length === 0}
            className="gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
