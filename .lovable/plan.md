
## Objetivo

Unificar a experiência: quando o cliente informa "Não houve distribuição" no mês, esse registro passa a se comportar exatamente como uma distribuição normal — vai para o contador com status **ENVIADA_AO_CONTADOR**, aparece na mesma listagem/painel, pode ser editado pelo cliente enquanto não aprovado, e fica bloqueado após **APROVADA**.

## Mudanças

### 1. Banco de dados (migração)

- Adicionar coluna `status` em `confirmacoes_mes` (mesmo enum `status_distribuicao`), default `ENVIADA_AO_CONTADOR`.
- Adicionar `updated_at` + trigger de atualização.
- Backfill: todas as confirmações `NAO_HOUVE` existentes recebem `status = ENVIADA_AO_CONTADOR` (para o contador revisar) — assim já ficam visíveis no fluxo antigo. (Alternativa que posso ajustar se preferir: marcar as antigas como `APROVADA`.)
- Ajustar RLS/policies de `confirmacoes_mes`:
  - Cliente pode INSERT/UPDATE/DELETE somente quando `status <> 'APROVADA'` e `status <> 'CANCELADA'`.
  - Admin pode atualizar status livremente.
- Ajustar o trigger existente `resolver_pendente_mes_on_confirmacao`: só resolve o alerta `PENDENTE_MES` quando `status = 'APROVADA'` (para manter o alerta ativo enquanto a contabilidade ainda não confirmou). Alternativamente, manter resolução imediata — decidir com o usuário (ver pergunta abaixo).
- Notificação para admin ao criar/editar "Não houve" (mesmo padrão de `useCreateDistribuicao`).

### 2. Frontend

**`useConfirmacoes.ts`**
- Tipar `status` em `Confirmacao`.
- `useConfirmacoesNaoHouve` passa a considerar status (mostrar todos, mas com badge).
- Novos hooks: `useUpdateConfirmacaoStatus` (admin aprova/cancela), `useUpdateConfirmacao` (cliente edita observação enquanto não aprovado), `useDeleteConfirmacao` (cliente cancela enquanto não aprovado).
- `useCreateConfirmacao`: cria com `status = ENVIADA_AO_CONTADOR` e dispara notificação de admin.

**`Distribuicoes.tsx` (painel admin e cliente)**
- Em vez de painel colapsável separado, mesclar as "Não houve" na mesma tabela de distribuições, como linhas com:
  - Valor: "—" (ou "Sem distribuição")
  - Badge visual "Não houve" (cinza/info) na coluna de identificação
  - Coluna Status: mesmos badges (Enviada ao contador / Aprovada / Cancelada)
  - Ações admin: Aprovar / Cancelar (batch inclusive)
  - Ações cliente: Editar observação / Cancelar (somente se não aprovada)
- Filtros e totais existentes ignoram linhas "Não houve" no cálculo de somatório (valor 0).
- Remover o painel colapsável "Clientes que declararam Não houve" adicionado antes (agora redundante).

**Fluxo do cliente ao marcar "Não houve"**
- Toast + entrada aparece na listagem com status "Enviada ao contador", editável.
- Se o cliente decidir depois registrar uma distribuição real no mesmo mês, ele pode cancelar a confirmação (enquanto não aprovada) e criar a distribuição normalmente.

### 3. Interações com regras existentes

- `gerar_alertas_pendente_mes`: mantém lógica atual (só ignora meses com confirmação NAO_HOUVE existente).
- `get_adesao_clientes`: continua contando `NAO_HOUVE` como mês preenchido independentemente do status (o cliente cumpriu a obrigação de reportar).

## Pergunta antes de implementar

O alerta `PENDENTE_MES` do mês deve ser resolvido:
- (A) **assim que o cliente marca "Não houve"** (comportamento atual — cliente já cumpriu a obrigação), ou
- (B) **somente após o contador aprovar** a confirmação (mais rigoroso)?

Vou seguir com **(A)** se você não indicar o contrário, pois é consistente com "o cliente já reportou".

## Arquivos afetados

- migração SQL (nova)
- `src/hooks/useConfirmacoes.ts`
- `src/pages/Distribuicoes.tsx`
- `src/hooks/useAlertas.ts` (nenhum, apenas se mudarmos a resolução)
