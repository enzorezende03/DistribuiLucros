import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAnaliseRefresh } from '@/hooks/useAnaliseRefresh';

afterEach(() => vi.useRealTimers());

describe('Atualização da análise', () => {
  it('atualiza todas as fontes da empresa ao abrir, a cada 15 segundos e ao voltar à aba', () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const keys = ['distribuicoes', 'confirmacoes', 'cliente', 'socios', 'movimentacoes_lucros'];
    const seed = () => keys.forEach(key => client.setQueryData([key, 'empresa'], []));
    seed();
    client.setQueryData(['distribuicoes', 'outra-empresa'], []);
    const { unmount } = renderHook(() => useAnaliseRefresh('empresa'), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    const check = () => {
      keys.forEach(key => expect(client.getQueryState([key, 'empresa'])?.isInvalidated).toBe(true));
      expect(client.getQueryState(['distribuicoes', 'outra-empresa'])?.isInvalidated).toBe(false);
    };
    check();
    seed();
    act(() => vi.advanceTimersByTime(15_000));
    check();
    seed();
    act(() => window.dispatchEvent(new Event('focus')));
    check();
    unmount();
    seed();
    act(() => vi.advanceTimersByTime(15_000));
    expect(client.getQueryState(['distribuicoes', 'empresa'])?.isInvalidated).toBe(false);
    client.clear();
  });

  it('invalidar distribuições e confirmações também atualiza as consultas da análise', async () => {
    const client = new QueryClient();
    for (const source of ['distribuicoes', 'confirmacoes']) {
      const key = [source, 'analise', 'empresa'];
      client.setQueryData(key, []);
      await client.invalidateQueries({ queryKey: [source] });
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    }
    client.clear();
  });
});