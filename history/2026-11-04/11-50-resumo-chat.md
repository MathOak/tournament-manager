# Resumo de contexto do chat — Tournament Manager

**Criado em:** 2026-11-04 11:50 (hora local do ambiente)
**Finalidade:** ponto de partida para próximos chats. O código atual é a fonte de verdade; confirme arquivos antes de editar, pois podem ter sido alterados depois deste resumo. Complementa `history/2026-11-03/17-51-resumo-chat.md`.

## Trabalho realizado

1. **Plano de qualidade de vida** (`docs/plano-qualidade-de-vida.md`): seletor de campeonato, import/export JSON do campeonato selecionado e limpeza total no Admin.
2. **Admin** (`src/app/features/admin/`):
   - Barra superior com seletor de campeonato, "Novo campeonato", "Exportar JSON", "Importar JSON", "Excluir campeonato" e "Limpar dados do sistema".
   - Trocar de campeonato zera rascunhos, etapa e rodada selecionadas.
   - Importação com mesmo id pergunta se substitui (OK) ou importa como cópia (Cancelar).
   - Limpeza exige `confirm` e digitar `LIMPAR`. O último campeonato não pode ser excluído.
   - `TournamentStore.clearAll()` zera a coleção e deixa um campeonato vazio persistido; há teste no spec do store. O export já era só do campeonato selecionado.
3. **`SelectMenuComponent`** (`src/app/shared/ui/select-menu/`, seletor `app-select-menu`), dropdown genérico baseado em referência visual:
   - Inputs: `options` (`SelectMenuOption`: `value`, `title`, `subtitle?`, `badge?`, `imageUrl?`), `value`, `label`, `placeholder`, `showThumbnail` (default `true`), `disabled`. Output: `valueChange`.
   - Sem `imageUrl`, a miniatura mostra a inicial do título. Subtítulo some quando vazio. Há ARIA combobox/listbox, teclado (setas, Home, End, Enter, Espaço, Esc, Tab) e fechamento ao clicar fora.
   - Em uso: Admin (campeonato com jogo como subtítulo; etapa só título), toolbar de Chaves (campeonato e chave) e tela Torneio (formato, MD3/MD5, fase suíça, top N, seeds), todos sem ícone, exceto campeonato.
   - Specs de `bracket-display` foram ajustados para `app-select-menu`.
4. **`DashboardActionsComponent`** (`src/app/shared/ui/dashboard-actions/`, `app-dashboard-actions`):
   - Inputs: `displayMode`, `displayLink` (default `/display/dashboard`), `exitLink` (default `/`). Output: `fullscreenRequested`. O componente mantém o signal `fullscreen` via `document:fullscreenchange`.
   - Fora do modo telão: um botão "Modo telão" (ícone de setas para fora) para `displayLink`. O botão "Painel admin" foi removido em todos os contextos.
   - No modo telão: botão de tela cheia (setas para fora/para dentro conforme o estado real) e "Sair do telão" para `exitLink`, oculto enquanto estiver em tela cheia.
   - Estilo com mais contraste por tokens (`action-solid`, `action-outline`, `action-muted`).
5. **Rotas de apresentação** (`src/app/app.routes.ts`): `/display` redireciona para `/display/dashboard`; `/display/dashboard` (Dashboard) e `/display/brackets` (`BracketDisplayComponent`) usam `data: { displayMode: true }`. `App.isPresentationRoute()` testa `startsWith('/display')`. O Header e o Footer do shell ficam ocultos nessas rotas.
   - O `dashboard-hero` passa `displayLink="/display/dashboard"` e `exitLink="/"`. A toolbar de Chaves usa `/display/brackets` e `/brackets`; `BracketDisplayComponent` lê `displayMode` da rota (`ActivatedRoute` opcional).
6. Plano de revisão dos botões de modo telão: `docs/plano-botoes-modo-telao.md`. As decisões foram aplicadas (redirecionar `/display`, saída conforme origem, sem Painel admin, sem restaurar o comentado).

## Pendências e observações

- `npm test`, `npm run build` e E2E **não foram executados** nestas alterações (o terminal PowerShell bloqueia `npm.ps1`; usar `cmd /c` ou liberar a política). Validar antes de dar como concluído.
- Controles da toolbar de Chaves (seletores, "Novo campeonato", "Tela cheia" antigo) seguem comentados em `bracket-toolbar.component.html` por decisão do usuário; na visualização não embutida a toolbar mostra só as ações de modo telão. As entradas `stages`/`selectedStageId` e os eventos `stageSelected`/`tournamentCreated` continuam declarados.
- CSS antigo (`.bracket-select-label`, estilos de `<select>`) pode estar sem uso.
- Não há testes específicos para a troca de ícone de tela cheia, para os novos handlers do Admin nem para as rotas `/display/*`.
- A visualização nas telas Admin, Chaves, Torneio e telão não foi conferida.
- O `AGENTS.md` ainda cita a rota `/display` sem as subrotas.
