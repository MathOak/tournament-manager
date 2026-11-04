# Plano de ação — botões de modo telão (Dashboard e Chaves)

## Objetivo

O botão "Modo telão" do `app-dashboard-actions` deve receber o destino por parâmetro:

- Clicado no Dashboard (`/`): vai para `/display/dashboard`.
- Clicado na toolbar de Chaves (`/brackets`): vai para `/display/brackets`.

## Estado atual (edições em andamento)

- [dashboard-actions.component.html](../src/app/shared/ui/dashboard-actions/dashboard-actions.component.html): `routerLink=r` é um valor inválido, deveria ser `[routerLink]="routerLink"`.
- [dashboard-actions.component.ts](../src/app/shared/ui/dashboard-actions/dashboard-actions.component.ts): o input `routerLink` tem default `/display`. O botão "Painel admin" foi removido do modo normal, e o spec ainda espera `['/display', '/admin']`.
- [bracket-toolbar.component.html](../src/app/features/brackets/components/bracket-toolbar/bracket-toolbar.component.html): `[routerLink]="/display/brackets"` é expressão inválida, precisa de string literal (`"'/display/brackets'"`). Os selects de campeonato e chave, "Tela cheia" e "Novo campeonato" estão comentados, então a tela de Chaves perdeu esses controles. O `displayMode` passado ao componente nunca é definido pelo `bracket-display`.
- [app.routes.ts](../src/app/app.routes.ts): só existe `/display` (Dashboard). Não há `/display/dashboard` nem `/display/brackets`.
- [app.ts](../src/app/app.ts): `isPresentationRoute` só reconhece `/display`; a parte de `/brackets` está comentada.
- [dashboard-hero.component.html](../src/app/features/dashboard/components/dashboard-hero/dashboard-hero.component.html): não passa destino ao `app-dashboard-actions`.

## Decisões a confirmar

1. `/display` antigo: redirecionar para `/display/dashboard` (recomendado, mantém links e e2e antigos) ou remover.
2. "Sair do telão" no modo telão: voltar para a rota de origem (`/` ou `/brackets`) via novo input `exitLink`, em vez de sempre `/`.
3. "Painel admin": manter no modo normal do Dashboard? Hoje foi removido do componente. Sugestão: input opcional `showAdminLink` (default `false`), ligado só no Dashboard.
4. Controles da toolbar de Chaves (selects, "Novo campeonato"): restaurar os que estão comentados, mantendo `app-dashboard-actions` ao lado.

## Etapas

1. **Rotas** em `app.routes.ts`:
   - `display` redireciona para `display/dashboard`.
   - `display/dashboard`: `DashboardComponent`, `data: { displayMode: true }`.
   - `display/brackets`: `BracketDisplayComponent`, `data: { displayMode: true }`.
2. **`app.ts`**: `isPresentationRoute` continua `startsWith('/display')`; remover o comentário morto sobre `/brackets`.
3. **`DashboardActionsComponent`**:
   - Inputs: `displayMode`, `displayLink` (obrigatório, destino do "Modo telão"), `exitLink` (default `/`) e, se aprovado, `showAdminLink`.
   - Corrigir o template para `[routerLink]="displayLink"` e `[routerLink]="exitLink"`.
   - Renomear o input `routerLink` para `displayLink` para não colidir com a diretiva `RouterLink`.
4. **Dashboard**: `dashboard-hero` passa `displayLink="/display/dashboard"`, `exitLink="/"` e `showAdminLink`.
5. **Chaves**:
   - `BracketDisplayComponent` lê `data['displayMode']` da rota e repassa `displayMode` à toolbar.
   - `bracket-toolbar` usa `[displayLink]="'/display/brackets'"` e `[exitLink]="'/brackets'"`. O evento `fullscreenRequested` já está ligado.
   - Em `bracket-display.component.html`, ligar `(fullscreenRequested)="toggleFullscreen()"` e restaurar o bloco `bracket-control-band` comentado, trocando o botão "Tela cheia" pelo `app-dashboard-actions`.
6. **Testes**:
   - Atualizar `dashboard-actions.component.spec.ts` (hrefs por `displayLink`, `exitLink`, admin opcional).
   - Atualizar os specs de `dashboard-hero` e `bracket-display` para a nova toolbar.
   - Ajustar `e2e/tournament-flows.spec.ts` se usar `/display`.
7. **Validação**: `npm test`, `npm run build` e conferência manual: Dashboard → `/display/dashboard` → sair volta a `/`; Chaves → `/display/brackets` → sair volta a `/brackets`.

## Fora de escopo

- Novas telas de telão além de Dashboard e Chaves.
- Alterar o estilo visual dos botões.
