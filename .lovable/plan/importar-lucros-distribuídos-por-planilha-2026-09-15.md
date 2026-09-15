# Importar lucros distribuídos por planilha

Permitir que o cliente envie a própria planilha de controle (Excel ou CSV), indique quais colunas contêm data, valor e sócio, revise o que foi lido e confirme o registro.

## Como vai funcionar

1. Na tela "Distribuições", ao lado dos botões de exportar, aparece um novo botão **Importar planilha**.
2. O cliente escolhe o arquivo (.xlsx, .xls ou .csv) e, se houver mais de uma aba, escolhe a aba.
3. O sistema mostra as primeiras linhas da planilha e três seletores: **Data**, **Valor** e **Sócio**. Cada seletor lista as colunas encontradas (usando a primeira linha como nome da coluna). Também é possível dizer em qual linha os dados começam, caso a planilha tenha títulos acima.
4. Tela de conferência: cada linha aparece com data, valor, sócio identificado e um aviso quando algo está errado. Linhas com problema podem ser desmarcadas; as demais seguem para o registro.
5. Ao confirmar, cada linha da planilha gera um lançamento próprio, com o sócio e valor daquela linha, enviado para análise da 2M (mesmo caminho do registro manual).
6. No final, um resumo: quantos lançamentos foram criados e quais linhas foram ignoradas.

## Regras de leitura

- **Data**: aceita data do Excel, além dos formatos 31/12/2026, 2026-12-31 e 31-12-2026. O mês do lançamento é derivado da data, como já acontece hoje.
- **Valor**: aceita 1.234,56, 1234.56 e números puros; ignora "R$" e espaços. Valor zero ou negativo é recusado.
- **Sócio**: procura primeiro por nome (sem diferenciar maiúsculas, acentos ou espaços extras) e, se não encontrar, por CPF/CNPJ (só dígitos). Se não achar, ou se houver dois sócios com o mesmo nome, a linha é sinalizada e o cliente pode escolher o sócio na tela de conferência.
- **Avisos por linha**: sócio não encontrado, data inválida, valor inválido, data fora do período em que o sócio pertencia à empresa (entrada/saída) e possível duplicidade com lançamento já existente (mesma data, sócio e valor).
- Linhas totalmente vazias são ignoradas em silêncio.

## Detalhes técnicos

- Novo componente `src/components/ImportDistribuicoesDialog.tsx` com três passos (arquivo → mapeamento de colunas → conferência), no padrão visual dos diálogos atuais.
- Leitura com ExcelJS (já usado no projeto) para .xlsx/.xls; CSV lido por parser simples com detecção de separador `,` ou `;`.
- Novo módulo `src/lib/importDistribuicoesPlanilha.ts` com o parsing da planilha, normalização de data/valor e o casamento de sócios, isolado da interface para facilitar testes.
- Gravação reaproveita `useCreateDistribuicao` do hook `useDistribuicoes`, em sequência com contador de progresso: uma distribuição por linha (`valor_total` = valor da linha) e um item em `distribuicao_itens` para o sócio. `natureza` fixa em `LUCRO`, status padrão `ENVIADA_AO_CONTADOR`, `solicitante_nome`/`solicitante_email` do usuário logado, como no registro manual.
- Sem mudanças de banco: usa as tabelas e políticas já existentes.
- Textos em PT-BR, tom direto, seguindo as microcópias atuais.
