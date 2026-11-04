# Plano de qualidade de vida — Admin

## Objetivo

Tornar o painel Admin o ponto central de gestão: escolher qual campeonato gerenciar, importar/exportar o JSON dele e limpar os dados locais do sistema.

## Situação atual

- `TournamentStore` já expõe `tournaments`, `selectedTournamentId`, `selectTournament()`, `createTournament()`, `removeTournament()`, `exportJson()` e `importJson(json, replaceExisting)`.
- `AdminComponent` opera sempre sobre `store.tournament()` (o campeonato selecionado) e só gerencia etapas/resultados.
- Não existe seletor de campeonato nem import/export/limpeza no Admin.
- Não existe operação de "limpar tudo" no store.

## Escopo

### 1. Seletor de campeonato no Admin

- Bloco no topo do Admin com `<select>` (ou lista de cards em telas largas) listando `store.tournaments()` com nome, jogo e status resumido (jogadores/etapas).
- Ao trocar, chamar `store.selectTournament(id)` e resetar `selectedStageId`, `selectedRoundNumber`, `drafts` e `editingMatches` do `AdminComponent`.
- Botão "Novo campeonato" (`createTournament()`) e "Excluir campeonato" (`removeTournament()`) com `confirm`.
- Estado vazio (sem campeonatos): reutilizar `EmptyStateComponent` com ação para criar/importar.
- Acessibilidade: `label` associado, foco preservado após troca, `aria-live` via Toast existente para confirmações.

### 2. Importar e exportar JSON do campeonato selecionado

- **Exportar:** botão que usa `store.exportJson()` e baixa `Blob` com nome `torneio-<slug-do-nome>-<dd-mm-aa>.json`.
- **Importar:** botão com `<input type="file" accept="application/json">` oculto; ler com `File.text()` e chamar `store.importJson(json)`.
  - Se já existir campeonato com mesmo id, perguntar via `confirm` se deve substituir (`replaceExisting = true`) ou importar como cópia.
  - Em caso de JSON inválido, mostrar erro pelo `notice` do store, sem alterar estado.
- Confirmar no código atual se `exportJson()` exporta só o selecionado ou toda a coleção; ajustar para exportar apenas o selecionado, mantendo compatibilidade com arquivos antigos (ex.: `public/gameHistory/torneio-23-10-26.json`).

### 3. Limpar jogadores e torneios do sistema

- Novo método `store.clearAll()`: zera `tournaments`, cria estado vazio, limpa `selectedTournamentId`, persiste em IndexedDB e localStorage (fallback), define `notice`.
- Botão "Limpar dados do sistema" em área separada ("Zona de perigo") no Admin.
- Confirmação em duas etapas: `confirm` descrevendo o que será apagado e sugerindo exportar antes; opcionalmente exigir digitar "LIMPAR".
- Ação irreversível; não afeta tema/preferências de UI.

## Arquivos afetados

- `src/app/core/tournament-store.service.ts`: `clearAll()`, ajuste de export/import conforme item 2.
- `src/app/features/admin/admin.component.ts` e `.html`: seletor, botões, handlers de arquivo, reset de estado local.
- Opcional: extrair `AdminTournamentToolbarComponent` em `features/admin/components/` (apresentacional, entradas/saídas explícitas, sem injetar o store).
- Testes: `tournament-store.service.spec.ts`, `admin.component.spec.ts`, `e2e/tournament-flows.spec.ts`.

## Testes

- Store: `clearAll()` zera coleção e persistência; export só do selecionado; import substitui/duplica conforme opção; JSON inválido não altera estado.
- Componente Admin: trocar campeonato atualiza etapas exibidas e limpa drafts; botões disparam as ações; limpar exige confirmação (cancelar não apaga).
- E2E (executar apenas se o Chromium iniciar): criar 2 campeonatos, alternar no Admin, exportar, limpar, importar e verificar dados.

## Etapas sugeridas

1. Store: `clearAll()` + revisão de export/import + testes.
2. Admin: seletor de campeonato + reset de estado + testes.
3. Admin: exportar/importar com download/upload + testes.
4. Admin: zona de perigo com limpeza + testes.
5. E2E, `npm run build` e `npm test`; atualizar `AGENTS.md`/`README.md` se o comportamento mudar.

## Fora de escopo

- Backend, autenticação ou sincronização entre dispositivos.
- Novas regras competitivas.
- Merge parcial de campeonatos ou desfazer a limpeza.
