import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotificacoes, useMarkNotificacaoLida, useMarkAllNotificacoesLidas } from '@/hooks/useDistribuicoes';
import { Bell, CheckCheck, Check, FileText } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const statusMap: Record<string, string> = {
  'Enviada ao Contador': 'ENVIADA_AO_CONTADOR',
  'Recebida': 'RECEBIDA',
  'Em validação': 'EM_VALIDACAO',
  'Aprovada': 'APROVADA',
  'Ajuste Solicitado': 'AJUSTE_SOLICITADO',
  'Cancelada': 'CANCELADA',
};

function useTranslateNotification() {
  const { t, language } = useLanguage();

  return (titulo: string, mensagem: string) => {
    if (language === 'pt') return { titulo, mensagem };

    let tTitulo = titulo;
    let tMensagem = mensagem;

    // "Status atualizado: <StatusName>"
    const statusMatch = titulo.match(/^Status atualizado:\s*(.+)$/);
    if (statusMatch) {
      const statusPt = statusMatch[1].trim();
      const statusKey = statusMap[statusPt];
      const translatedStatus = statusKey ? t(`status.${statusKey}`) : statusPt;
      tTitulo = `${t('notifications.statusUpdated')}: ${translatedStatus}`;
    }

    // "Nova distribuição recebida: <CompanyName>"
    const newDistMatch = titulo.match(/^Nova distribuição recebida:\s*(.+)$/);
    if (newDistMatch) {
      const companyName = newDistMatch[1].trim();
      tTitulo = `${t('notifications.newDistReceived')}: ${companyName}`;
    }

    // "Sua distribuição foi recebida pelo contador."
    if (mensagem === 'Sua distribuição foi recebida pelo contador.') {
      tMensagem = t('notifications.receivedByAccountant');
    }

    // "Sua distribuição teve o status alterado para "<Status>"..."
    const msgStatusMatch = mensagem.match(/^Sua distribuição teve o status alterado para "([^"]+)"\.?\s*(Observação:\s*(.+))?$/);
    if (msgStatusMatch) {
      const statusPt = msgStatusMatch[1].trim();
      const obs = msgStatusMatch[3]?.trim();
      const statusKey = statusMap[statusPt];
      const translatedStatus = statusKey ? t(`status.${statusKey}`) : statusPt;
      tMensagem = `${t('notifications.statusChangedTo')} "${translatedStatus}".`;
      if (obs) {
        tMensagem += ` ${t('notifications.observation')}: ${obs}`;
      }
    }

    // "A empresa X enviou uma nova distribuição no valor de R$ Y para a competência Z."
    const companyMsgMatch = mensagem.match(/^A empresa (.+?) enviou uma nova distribuição no valor de (R\$ [\d.,]+) para a competência (.+)\.$/);
    if (companyMsgMatch) {
      const company = companyMsgMatch[1];
      const value = companyMsgMatch[2];
      const period = companyMsgMatch[3];
      tMensagem = t('notifications.companySentDist')
        .replace('{company}', company)
        .replace('{value}', value)
        .replace('{period}', period);
    }

    return { titulo: tTitulo, mensagem: tMensagem };
  };
}

export default function NotificacoesPage() {
  const { clienteId, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { data: notificacoes, isLoading } = useNotificacoes(clienteId, false, isAdmin);
  const markLida = useMarkNotificacaoLida();
  const markAllLidas = useMarkAllNotificacoesLidas();
  const navigate = useNavigate();
  const translateNotification = useTranslateNotification();

  const handleMarkAll = () => {
    if (isAdmin) {
      notificacoes?.filter(n => !n.lida).forEach(n => markLida.mutate(n.id));
    } else if (clienteId) {
      markAllLidas.mutate(clienteId);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('notifications.title')}</h1>
            <p className="text-muted-foreground">{t('notifications.subtitle')}</p>
          </div>
          {notificacoes && notificacoes.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleMarkAll}>
              <CheckCheck className="h-4 w-4" />
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !notificacoes || notificacoes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">{t('notifications.noNotifications')}</p>
              <p className="text-sm">{t('notifications.willBeNotified')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notificacoes.map((n) => {
              const { titulo, mensagem } = translateNotification(n.titulo, n.mensagem);
              return (
                <Card
                  key={n.id}
                  className={cn(
                    'transition-all hover:shadow-md',
                    !n.lida && 'border-primary/30 bg-primary/5'
                  )}
                >
                  <CardContent className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 p-4">
                    <div className="mt-1 rounded-full bg-primary/10 p-2">
                      <Bell className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{titulo}</p>
                      <p className="text-sm text-muted-foreground mt-1">{mensagem}</p>
                      <p className="text-xs text-muted-foreground mt-2">{formatDate(n.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {n.distribuicao_id && (
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate(`/distribuicoes`)}>
                          <FileText className="h-3 w-3" />
                          {t('notifications.view')}
                        </Button>
                      )}
                      {!n.lida && (
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => markLida.mutate(n.id)}>
                          <Check className="h-3 w-3" />
                          {t('notifications.read')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
