# Painel de Adesão dos Clientes

Nova página exclusiva do admin para acompanhar quais empresas estão usando o sistema, quem nunca acessou e quem está em dia com os preenchimentos mensais.

## Rota e acesso
- Nova rota `/adesao` protegida com `requireAdmin`.
- Item de menu no `SidebarLayout` (visível apenas para admin), ícone de gráfico/usuários.

## Cards de resumo (topo)
1. **Empresas ativas** — total de clientes com `status = 'ativo'`.
2. **Sem usuário vinculado** — clientes sem nenhum registro aprovado em `user_clientes`.
3. **Nunca acessaram** — usuários vinculados aprovados cujo `auth.users.last_sign_in_at` é nulo.
4. **Em dia no mês atual** — clientes com distribuição (não cancelada) ou confirmação `NAO_HOUVE` para a competência corrente.
5. **Pendentes do mês anterior** — clientes sem distribuição nem confirmação no mês passado.
6. **Engajamento médio (últimos 6 meses)** — % médio de meses preenchidos.

## Tabela detalhada
Colunas:
- Cliente (razão social + CNPJ + tag 2M Saúde/Contabilidade)
- Vínculo de usuário (badge: Sem usuário / Pendente aprovação / Ativo / Desativado)
- Último acesso (data ou "Nunca acessou")
- Mês atual (✓ Em dia / Pendente / NÃO HOUVE)
- Mês anterior (mesmo formato)
- Engajamento 6m (barra de progresso com % e "X de 6 meses")
- Ações (menu)

Filtros no topo da tabela:
- Busca por razão social/CNPJ
- Status de adesão: Todos / Sem login / Pendentes do mês / Em dia / Inativos
- Tag de empresa (2M Saúde / 2M Contabilidade)
- Ordenação: pior engajamento primeiro (padrão), alfabética, último acesso

## Ações por linha
Menu de ações contextual:
- **Enviar lembrete WhatsApp** — usa template existente de cobrança (integração WhatsApp já configurada).
- **Notificar in-app** — cria registro em `notificacoes` para o usuário vinculado.
- **Resetar senha (CNPJ)** — reusa edge function `reset-password-cnpj`.
- **Ver distribuições do cliente** — abre `/distribuicoes?clienteId=...`.
- **Ver como cliente** — usa impersonação existente.

Ação em massa (botão acima da tabela quando filtrado): **Enviar lembrete para todos os selecionados** com checkboxes por linha.

## Detalhes técnicos

### Backend
- Nova RPC `get_adesao_clientes()` (SECURITY DEFINER, restrita a admin via `is_admin()`) que retorna por cliente:
  - `cliente_id`, `razao_social`, `cnpj`, `tag`, `status`
  - `total_usuarios`, `usuarios_aprovados`, `usuarios_pendentes`
  - `ultimo_acesso` (max de `auth.users.last_sign_in_at` dos vínculos aprovados)
  - `tem_distribuicao_mes_atual`, `tem_naohouve_mes_atual`
  - `tem_distribuicao_mes_anterior`, `tem_naohouve_mes_anterior`
  - `meses_preenchidos_6m` (int de 0 a 6)
- Lê de `auth.users` (acessível via SECURITY DEFINER) cruzando com `user_clientes`, `distribuicoes`, `confirmacoes_mes`.
- Sem mudanças de schema — apenas a função.

### Frontend
- `src/hooks/useAdesao.ts` — React Query consumindo a RPC.
- `src/pages/Adesao.tsx` — página com cards (`Card`), tabela responsiva (mesmo padrão das outras telas — desktop tabela / mobile cards), filtros via `useUrlState`.
- `src/components/adesao/AcoesAdesao.tsx` — dropdown de ações reutilizando hooks/edge functions existentes.
- Registro de rota em `src/App.tsx` e link em `src/components/layout/SidebarLayout.tsx`.
- Traduções PT/EN/ES em `src/translations/index.ts`.

### Cálculo do engajamento 6m
Para cada um dos 6 meses anteriores ao atual, conta como "preenchido" se houver ao menos uma `distribuicoes` não cancelada **ou** uma `confirmacoes_mes` com `resposta = 'NAO_HOUVE'`. Resultado = nº de meses preenchidos.

## Fora do escopo
- Gráficos históricos por cliente (pode ser fase 2).
- Exportação Excel do painel (pode ser adicionada depois se solicitado).
- Notificações automáticas agendadas — apenas envio manual a partir do painel.
