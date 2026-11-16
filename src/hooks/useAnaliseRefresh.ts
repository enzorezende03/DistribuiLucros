import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const ANALISE_REFRESH_INTERVAL = 15_000;
const SOURCES = new Set(['distribuicoes', 'confirmacoes', 'cliente', 'socios', 'movimentacoes_lucros']);

// Refresh only this company's report sources, preserving visible cached data.
export function useAnaliseRefresh(clienteId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!clienteId) return;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) => SOURCES.has(String(queryKey[0])) && queryKey.includes(clienteId),
      });
    };
    refresh();
    const timer = window.setInterval(refresh, ANALISE_REFRESH_INTERVAL);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [clienteId, queryClient]);
}