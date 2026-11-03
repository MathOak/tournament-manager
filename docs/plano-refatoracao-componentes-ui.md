# Plano de refatoração — componentes compartilhados e CSS co-localizado

**Status:** implementado em 2026-11-03.

## 1. Objetivo

Reduzir o acoplamento de templates e da folha global, extraindo as partes importantes da interface para componentes Angular standalone, agrupados por responsabilidade e com estilos co-localizados. Começar pelo layout compartilhado: criar `src/app/shared/layout/` e extrair o Header/topbar para `src/app/shared/layout/header/`, reutilizando-o no shell e na tela dedicada de chaves.

A refatoração deve preservar rotas, regras de torneio, persistência, comportamento responsivo, temas e aparência atual. Evitar componentizar cada elemento pequeno sem um limite funcional/reutilização clara.

## 2. Estado atual observado

- A aplicação usa Angular 21, standalone, TypeScript estrito e templates HTML separados.
- `src/app/app.html` contém o shell, topbar, navegação principal, controle de tema, toast de notificações, `router-outlet` e rodapé.
- `src/app/app.ts` concentra estado de tema, deteção de rota de apresentação e coordena o `TournamentStore`.
- `src/app/features/brackets/bracket-display.component.html` repete marca e navegação quando não está embutido, além de reunir controles, resumo do campeonato, tabs, partidas, conectores, estados vazios e rodapé explicativo.
- `src/app/features/dashboard/dashboard.component.html` reúne hero, ao vivo/próximas partidas, métricas, uma instância do componente de bracket e a lista/visualização das etapas e classificação.
- `src/styles.css` contém tokens globais, reset e estilos de layout, formulários, admin, dashboard e brackets. Estilos específicos de bracket ocupam um bloco grande; classes estruturais foram crescendo na folha global.
- `src/app/app.css` existe, mas está vazio. Os componentes de feature têm estilos majoritariamente globais, sem `styleUrl` próprio.
- A navegação aparece no shell do app e também no componente dedicado de chaves, com diferenças condicionais para modo embutido/apresentação.
- Já existem testes de raiz e de bracket. O projeto usa Vitest pelo Angular CLI.

## 3. Princípios e limites

1. **Componentizar por responsabilidade:** cada componente representa uma área identificável da interface ou uma unidade visual reutilizável, não cada `<div>`.
2. **Standalone e entradas explícitas:** usar componentes standalone; transferir estado/ações por `input()`/`output()` ou signals públicos definidos, sem dar acesso direto a stores globais quando não for necessário.
3. **CSS co-localizado:** mover regras exclusivamente usadas por um componente para o seu `.css`; manter no `src/styles.css` tokens, reset, tipografia base, utilitários realmente globais e estilos de tema que atravessem componentes.
4. **Preservar CSS encapsulation:** preferir estilos Angular encapsulados. Para estados de tema, consumir custom properties globais (`--text`, `--surface`, `--border`, acentos) e não usar `::ng-deep` como solução normal.
5. **Não alterar comportamento ao mesmo tempo que estrutura:** extrações devem manter bindings, labels, IDs, estados, acessibilidade e eventos; refactors do store ou da regra de domínio devem ser separados.
6. **Compartilhamento consciente:** `Header` fica no layout partilhado. Componentes de bracket próprios permanecem na feature `brackets`, visto que são especializados e o dashboard já reutiliza o componente de apresentação.

## 4. Estrutura alvo sugerida

```text
src/app/
  shared/
    layout/
      app-header/
        app-header.component.ts
        app-header.component.html
        app-header.component.css
      app-footer/
        app-footer.component.ts
        app-footer.component.html
        app-footer.component.css
      app-toast/
        app-toast.component.ts
        app-toast.component.html
        app-toast.component.css
    ui/
      empty-state/
      page-heading/
      status-badge/
      icon-button/
  features/
    dashboard/
      components/
        dashboard-hero/
        live-match-card/
        tournament-stats/
        stage-overview/
    brackets/
      components/
        bracket-toolbar/
        bracket-event-summary/
        bracket-round-tabs/
        bracket-board/
          bracket-board.component.ts
          bracket-board.component.html
          bracket-board.component.css
        bracket-round-column/
        bracket-match-card/
        bracket-connectors/
```

A estrutura é indicativa: preferir componentes locais dentro de `features/<feature>/components/` para peças sem reutilização fora da feature; somente peças genéricas e usadas por mais de uma feature devem ir para `shared/ui/`.

## 5. Componentes candidatos à modularização

### Prioridade P0 — layout global

#### `AppHeaderComponent`

- Extrair do shell e da duplicação no header da tela de chaves.
- Responsabilidades: marca, navegação com rota ativa, botão de tema, indicador “Dados locais”.
- API sugerida: entrada de tema atual e, alternativamente, estado/label do indicador; evento `themeToggle`.
- Não deve acessar `TournamentStore` nem `Router` além do necessário para links/estado de rota; aplicar tema e persistir preferência continuam no shell ou em serviço dedicado.
- CSS co-localizado contém layout de `.topbar`, marca, navegação e controle de tema; regras comuns a `main-nav` precisam ter um único dono.
- Deve ser possível configurar modo compacto/ocultar navegação em tela cheia, se a tela de chaves realmente precisar desse estado. Não duplicar estrutura de menu dentro do bracket.

#### `AppFooterComponent`

- Extrair o rodapé “Tournament Manager · Persistência neste navegador”.
- Pode receber texto de status local via input ou manter a mensagem fixa se não houver variação planejada.
- CSS próprio para largura, espaçamento e texto muted.

#### `AppToastComponent`

- Extrair aviso flutuante, botão de fechar e `role="status"`.
- API sugerida: `message` e evento `dismiss`; shell continua lendo o serviço e passa valor/evento.
- Testar fechamento por teclado e anúncio acessível.

### Prioridade P1 — bracket (componente composto atual)

#### `BracketToolbarComponent`

- Seletor de campeonato, seletor condicional de chave, ação de fullscreen e ação “Novo campeonato”.
- Recebe lista/seleção de campeonatos, lista/seleção de etapas e estado fullscreen; emite seleção/ações. Não assume persistência.
- CSS agrupa seletor, labels e botões para desktop/mobile.

#### `BracketEventSummaryComponent`

- Nome do torneio/jogo, etapa, MD3/MD5 e contagem de participantes.
- Somente apresentação; entradas tipadas.

#### `BracketRoundTabsComponent`

- Abas/botões por rodada e estado de seleção; emite a rodada escolhida.
- A lógica de rolagem até a coluna correspondente pode ser delegada para o contêiner `BracketDisplayComponent`.

#### `BracketBoardComponent`

- Componente orquestrador visual da chave: define proporções, largura/altura, sequência de rodadas e liga conectores às colunas.
- Recebe `stage`, jogadores/nomes, medidas do viewport e rótulos deriváveis; não deve lidar com seletor de torneios, fullscreen ou persistência.

#### `BracketRoundColumnComponent`

- Título da rodada e lista de partidas daquela rodada; API de entrada tipada.

#### `BracketMatchCardComponent`

- Cartão de confronto: nomes, placar, vencedor, pendente, ao vivo, bye e texto “Avança por bye”.
- Co-localiza estilo do badge de bye e estados do cartão, preservando a centralização e afastamento dos placares.
- Recomendado como unidade com testes para status, nome truncado, rótulo acessível e score.

#### `BracketConnectorsComponent`

- Gera/desenha SVG dos conectores de uma transição de rodada. Recebe geometrias/tamanhos/contagens, não conhece os dados completos do torneio.
- Evitar misturar cálculo SVG com estilos de cartões/colunas no arquivo do componente pai.

#### `BracketEmptyStateComponent` (opcional, pode ser shared)

- Estados “carregando campeonatos”, “nenhuma chave encontrada” e “chave sem rodadas”.
- Se for genérico para páginas de jogadores/admin, extrair para `shared/ui/empty-state`; se os estados de bracket tiverem controles específicos, manter wrapper/variante na feature.

### Prioridade P2 — dashboard

#### `DashboardHeroComponent`

- Marca/resumo do evento, jogadores, partidas concluídas e ações Modo telão/Admin.
- Reutilização potencial no modo `/display`, com variação de ações por input.

#### `LiveMatchCardComponent` e `UpcomingMatchCardComponent`

- Cartões de partidas ao vivo e próximas. Há diferenças de estrutura, então começar com componentes separados; só unificar depois se a API comum não ficar cheia de condicionais.

#### `TournamentStatsComponent`

- Grid dos totais de participantes, partidas ao vivo e séries concluídas.
- Recebe valores já calculados; não consulta stores.

#### `StageOverviewComponent`

- Resumo de uma etapa do torneio. Deve usar subcomponentes diferentes para classificação suíça e lista de bracket simples se o comportamento visual divergir.
- Não substituir o bracket completo de telão pelo resumo compacto existente.

### Prioridade P3 — UI transversal para telas existentes

- `PageHeadingComponent`: eyebrow, título, subtítulo e área de ações; candidatos em Jogadores, Torneio e Admin.
- `StatusBadgeComponent`: estados de etapa/partida; recebe variante semântica e label, sem deixar cor ser a única indicação.
- `EmptyStateComponent`: estado vazio reutilizável em dashboard, jogadores, setup, admin e chave.
- `IconButtonComponent`: variantes e rótulos acessíveis para fechar/remover/editar, se a API comum reduzir duplicação sem esconder semântica.
- `ConfirmDialogComponent`: somente se houver mais confirmações além de `window.confirm`; não introduzir infraestrutura para um único caso sem valor claro.

## 6. Plano por fases

### Fase 0 — Baseline e inventário

1. Registrar a aparência atual em `/`, `/players`, `/tournament`, `/admin`, `/brackets` e `/display`, no tema claro/escuro e em desktop/móvel.
2. Registrar build/testes existentes e contagem de testes.
3. Fazer inventário de seletores CSS e templates antes de mover arquivos, distinguindo estilos globais verdadeiros de estilos que pertencem a uma feature.

### Fase 1 — Shared layout e Header

1. Criar `src/app/shared/layout/` e a pasta `app-header/`.
2. Extrair marca, menu, links ativos, tema e “Dados locais” para `AppHeaderComponent`.
3. Substituir markup em `app.html` e na rota `/brackets` por `<app-header>` com inputs de modo, evitando manter duas cópias do menu.
4. Definir propriedade de exibição: header padrão no shell; no modo fullscreen, decidir explicitamente se deve usar navegação global ou navegação compacta. Não deixar ambas simultâneas.
5. Mover CSS de header/nav/brand/theme-toggle para `app-header.component.css`, mantendo apenas tokens/variáveis globais em `styles.css`.
6. Remover o menu duplicado e classes que ficaram sem consumidor após migração.
7. Cobrir estado de rota ativa e toggle de tema com testes de componente.

### Fase 2 — Footer e notificações

1. Extrair rodapé para `AppFooterComponent` e inserir no shell conforme o modo de apresentação.
2. Extrair toast para `AppToastComponent`; ligar `notice()`/`dismissNotice()` do shell por input/output.
3. Mover estilos para os respectivos CSS.
4. Testar visibilidade no display, papel acessível e evento de dismiss.

### Fase 3 — Bracket modular

1. Criar componentes de toolbar, resumo e tabs.
2. Extrair bracket board, colunas, cartão de partida e conectores SVG em ordem de menor acoplamento.
3. Deixar `BracketDisplayComponent` como contêiner: obtém store/seleção, calcula propriedades de apresentação e coordena eventos; delegar template de apresentação aos filhos.
4. Consolidar a instância embutida do dashboard (`embedded`) e a página dedicada para compartilhar apresentação sem controles duplicados.
5. Co-localizar CSS por unidade; definir quais dimensões responsivas são inputs/estilos da board e não constantes escondidas em folhas globais.
6. Testar estados BYE, vencedor, pendente, ao vivo, slot futuro, tema e múltiplas rodadas.

### Fase 4 — Dashboard e peças visuais transversais

1. Extrair hero, cartões ao vivo/próximos e grid de métricas.
2. Extrair visualização/resumo de etapa; separar classificação suíça do componente de eliminatória.
3. Avaliar `PageHeading`, `StatusBadge`, `EmptyState` e `IconButton` com pelo menos duas utilizações reais antes de os mover para `shared/ui`.
4. Aplicar estratégia equivalente a Players/Tournament/Admin apenas quando ela reduzir duplicação ou separar lógica/template claramente.

### Fase 5 — Consolidação de CSS e validação

1. Manter `src/styles.css` para import do Tailwind, tokens globais, reset, elementos base, utilitários compartilhados e overrides globais inevitáveis de tema.
2. Remover blocos específicos de componentes dos estilos globais depois que cada componente receber seu CSS co-localizado.
3. Verificar que CSS encapsulado não perdeu regras intencionais de descendentes, `routerLinkActive`, temas por atributo no `html` ou estados responsivos.
4. Validar build/testes e rotas em tema claro/escuro, mobile, desktop, 4K e modo fullscreen.
5. Fazer revisão visual comparativa com a baseline; a extração não deve alterar a hierarquia, alinhamento, cor ou tamanho sem solicitação explícita.

## 7. Critérios de aceite

- O Header global existe em `shared/layout/header` e é usado pelo shell e pelas telas que precisarem de navegação comum; não há markup duplicado da navegação.
- Layout, navegação, tema e estado ativo continuam funcionais em todas as rotas.
- CSS próprio de cada componente visual está junto dele; `styles.css` não contém grandes blocos exclusivos de bracket/dashboard/header.
- Componentes de bracket têm responsabilidades claras: toolbar, resumo/tabs, board, coluna, cartão de partida e conectores.
- Componentes reutilizáveis recebem dados por API explícita e não leem diretamente o store sem necessidade.
- A tela embutida no dashboard e a página dedicada mantêm aparência e dados corretos, sem controles duplicados.
- Acessibilidade, estados de vazio/carregamento, responsividade até 4K e layout fullscreen permanecem intactos.
- Build e todos os testes passam; componentes extraídos têm cobertura dos comportamentos relevantes.

## 8. Riscos e mitigação

- **Mudança visual acidental por CSS encapsulation:** fazer extração em etapas pequenas, mover regras com o componente e validar screenshot antes/depois.
- **Duplicação escondida por variações embedded/fullscreen:** definir inputs e modos explícitos; evitar cópia do template condicional em vários locais.
- **Componentização excessiva:** manter componentes de uma única linha/sem lógica junto ao pai, salvo quando houver semântica, reutilização ou teste útil.
- **Dependência direta de store:** passar dados e outputs para subcomponentes; manter persistência no contêiner/serviço.
- **Escala 4K:** inputs de dimensão e custom properties precisam continuar sincronizados; adicionar teste visual/medição para layouts amplos.
- **CSS global de tema:** tokens continuam globais; componentes devem consumir tokens, sem replicar paletas por folha.

## 9. Ordem recomendada de entrega

1. `AppHeaderComponent` (pedido principal), com remoção da navegação duplicada em brackets.
2. `AppFooterComponent` e `AppToastComponent`.
3. `BracketMatchCardComponent` e `BracketRoundColumnComponent`.
4. `BracketConnectorsComponent` e `BracketBoardComponent`.
5. Toolbar/resumo/tabs do bracket.
6. Dashboard hero, partidas e métricas.
7. Componentes transversais PageHeading/Badge/EmptyState/IconButton.
8. Limpeza final de `src/styles.css`, documentação e validação ponta a ponta.

## 10. Execução registrada

- **Layout compartilhado:** criados `src/app/shared/layout/app-header/`, `app-footer/` e `app-toast/`, cada um com TypeScript, template, CSS e spec. O shell usa esses componentes e a página dedicada `/brackets` reutiliza o mesmo Header, removendo a cópia da navegação.
- **Bracket:** o contêiner `BracketDisplayComponent` mantém store, seleção, tamanho do viewport e fullscreen; as apresentações foram separadas em `BracketToolbarComponent`, `BracketEventSummaryComponent`, `BracketRoundTabsComponent`, `BracketRoundColumnComponent`, `BracketMatchCardComponent`, `BracketConnectorsComponent` e `BracketLegendComponent`. Os estilos de cartão/coluna/conectores/tabs/resumo/legenda ficam junto aos componentes.
- **Dashboard:** criados `DashboardHeroComponent`, `TournamentStatsComponent`, `LiveMatchCardComponent`, `UpcomingMatchCardComponent` e `StageOverviewComponent`. O dashboard calcula estado/records e passa valores por inputs; os componentes de UI não dependem diretamente do store.
- **UI compartilhada:** criados `PageHeadingComponent`, `StatusBadgeComponent` e `EmptyStateComponent`, reutilizados em Jogadores, Torneio, Admin, Dashboard e Brackets.
- **CSS:** movidos estilos dos componentes extraídos para arquivos `.css` co-localizados e removidos os blocos duplicados do `src/styles.css`. A folha global mantém tokens/tema, reset, controles comuns e estilos que continuam compartilhados pelas features existentes.
- **Testes:** cada novo componente recebeu teste de contrato/apresentação; os testes de shell, dashboard, bracket e páginas foram atualizados para a composição nova.
- **Validação:** `npm run build` concluído; `npm test` aprovou 25 arquivos e 65 testes. O modo navegador foi inspecionado em `/` e `/brackets`; o header compartilhado, menu, seleção, rounds, scorecards e conteúdo do dashboard permaneceram renderizados. Os cenários E2E não foram reexecutados nesta refatoração; a execução Playwright anterior neste ambiente foi bloqueada pelo `spawn EPERM` ao iniciar Chromium.

### Estrutura efetivamente criada

```text
src/app/shared/
  layout/
    app-header/
    app-footer/
    app-toast/
  ui/
    empty-state/
    page-heading/
    status-badge/
src/app/features/brackets/components/
  bracket-toolbar/
  bracket-event-summary/
  bracket-round-tabs/
  bracket-round-column/
  bracket-match-card/
  bracket-connectors/
  bracket-legend/
src/app/features/dashboard/components/
  dashboard-hero/
  tournament-stats/
  live-match-card/
  upcoming-match-card/
  stage-overview/
```
