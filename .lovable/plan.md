# Página "Análise das Distribuições" (visão por sócio)

Ao clicar no card "Distribuído em 2026" do Dashboard, o cliente vai para uma nova página de análise, em vez de abrir a janela de detalhes. Layout e cores atuais continuam iguais.

## O que a página mostra
- **Seletor de ano** (padrão: ano atual) e botão "Voltar ao Dashboard".
- **Cards de resumo**: total distribuído no ano, média mensal, maior mês e número de sócios que receberam.
- **Gráfico de barras empilhadas por mês**: quanto cada sócio recebeu em cada mês, com uma linha de referência nos R$ 50 mil.
- **Gráfico de pizza**: participação de cada sócio no total do ano (%).
- **Tabela de análise por sócio**: total no ano, % do total, média mensal, maior mês, quantos meses passaram de R$ 50 mil (apenas PF; PJ aparece como "PJ – sem limite").
- **Pontos de atenção** em texto simples, por exemplo: "Thiago passou de R$ 50 mil em 7 dos 8 meses" ou "Setembro ainda não foi confirmado".
- A lista atual por sócio e mês (a da janela de hoje) fica no fim da página, recolhível.
- Conta apenas lançamentos Enviados e Aprovados (ignora cancelados e não aprovados).

## Detalhes técnicos
- Nova página `src/pages/AnaliseDistribuicoes.tsx`, rota `/analise-distribuicoes` (protegida, cliente e "Ver como cliente").
- `Dashboard.tsx`: o clique no card navega para a rota; a janela "Detalhes do Ano" é removida.
- Dados via hooks existentes de distribuições e sócios; gráficos com recharts (`components/ui/chart`), cores dos tokens do tema.
- Textos novos em PT/EN/ES em `translations/index.ts`.
