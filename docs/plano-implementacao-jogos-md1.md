# Plano de implementação — catálogo de jogos, MD1 e placar por categoria

## 1. Objetivo

Permitir escolher o jogo de um catálogo antes de configurar o torneio, classificar cada jogo por uma categoria de regras e usar a categoria para determinar como registrar, validar e apresentar os resultados. O primeiro catálogo terá Clash Royale e EA SPORTS FC (FIFA/EAFC). O sistema também deve oferecer MD1 e permitir iniciar uma partida em 0–0 para que ela apareça como ao vivo.

**Status: implementado e ampliado em 2026-11-05.** Todos os jogos oferecem MD1, MD2, MD3 e MD5, configurados no catálogo. EA SPORTS FC guarda gols por jogo dentro da série; MD2 significa primeira pessoa a duas vitórias (podendo durar até três jogos). Validação final: build aprovado e 87 testes unitários aprovados. A suíte Playwright ainda precisa de execução bem-sucedida.

## 2. Estado atual confirmado

- O jogo é um texto livre (`Tournament.game`) editado em `src/app/features/tournament/tournament.component.html` e salvo por `TournamentStore.updateTournamentDetails()`.
- `BestOf` aceita apenas `3 | 5`; as opções MD3/MD5 aparecem na criação de etapas e na classificação para eliminatória.
- `Match.scoreA` e `scoreB` atualmente representam vitórias de uma série. `validateMatchResult()` exige que alguém alcance 2 vitórias no MD3 ou 3 no MD5.
- O Admin tem a ação “Salvar placar parcial”, mas `validateMatchProgress()` rejeita 0–0. Portanto ainda não existe uma ação de início de partida sem pontuação.
- O mesmo placar é usado por validação, estatísticas, cards ao vivo, histórico e bracket. Para suportar gols sem confundir gols com vitórias de série, a mudança precisa atravessar domínio, store e telas de resultado.
- A persistência e os arquivos JSON usam `schemaVersion: 1`; `isTournament()` rejeita outras versões. IndexedDB e o fallback localStorage contêm torneios que precisam continuar legíveis.

## 3. Requisitos funcionais

- **REQ-001 — Catálogo:** substituir o campo livre de jogo por uma seleção de um catálogo com Clash Royale e EA SPORTS FC (incluindo FIFA/EAFC como nomes anteriores/aliases quando importar dados). O catálogo usa identificadores estáveis, nomes de exibição e uma categoria de pontuação; não inferir regras comparando texto do nome.
- **REQ-002 — Categorias extensíveis:** disponibilizar uma estratégia de resultado por categoria. Todos os jogos classificados na categoria de gols devem compartilhar a validação, entrada de placar, desempate por pênaltis e apresentação definidos para EA SPORTS FC. A categoria de Clash Royale mantém placar de vitórias em partidas/séries.
- **REQ-003 — Formatos MD:** oferecer MD1, MD2, MD3 e MD5 a todos os jogos. Para Clash Royale, registrar vitórias por série; para jogos de gols, registrar o placar de gols de cada jogo na série e encerrar quando alguém atingir o alvo de vitórias correspondente.
- **REQ-004 — Pênaltis:** na categoria de gols, permitir informar placar de pênaltis quando o placar de gols terminar empatado. Pênaltis não substituem nem alteram o placar de gols; determinam o vencedor da partida. Não permitir concluir empate sem vencedor nem registrar pênaltis se o placar de gols já tiver um vencedor.
- **REQ-005 — Iniciar ao vivo em 0–0:** o Admin deve ter uma ação explícita “Iniciar partida” que persiste o estado `in-progress` com placar 0–0, sem declarar vencedor. A partida deve aparecer como ao vivo no Admin, Dashboard e bracket. O início não deve alterar classificação nem avançar chave.
- **REQ-006 — Resultados coerentes nas telas:** Admin, Dashboard, cards de partida, histórico e bracket devem identificar a unidade do placar (vitórias da série ou gols) e mostrar o vencedor/placar de pênaltis quando aplicável.
- **REQ-007 — Compatibilidade de dados:** dados locais e JSONs v1 devem ser migrados ou lidos sem perda de torneios, resultados, jogadores ou chaves. A importação de dados inválidos continua sem substituir o estado atual.
- **REQ-008 — Integridade competitiva:** validar no domínio e no store os estados pendente, ao vivo e concluído; somente resultados concluídos com vencedor podem contar para classificação ou progressão da eliminatória.

## 4. Decisões de implementação recomendadas

1. Criar catálogo tipado em `src/app/domain/game-catalog.ts`. Cada entrada terá `id`, `label`, `category` e formatos permitidos. IDs sugeridos: `clash-royale` e `ea-sports-fc`; aliases de importação podem reconhecer `FIFA`, `EAFC` e `EA SPORTS FC`.
2. Começar com duas categorias explícitas, por exemplo `series-wins` e `goals`. A UI e a regra consultam a categoria; não adicionam condicionais específicas pelo nome do jogo.
3. Usar resultado discriminado no domínio, em vez de tratar gols como vitórias de série: resultado de série com vitórias A/B; resultado de gols com gols A/B e, opcionalmente, pênaltis A/B. Ajustar `Match`, `BestOf` e o validador para suportar isso com tipos estritos.
4. Manter compatibilidade de exibição de torneios antigos, preservando o nome de jogo original. Para registros v1 conhecidos, atribuir o ID de catálogo correspondente; para jogo desconhecido, preservar como legado e exigir seleção de um jogo suportado antes de criar novas etapas, sem apagar as etapas/resultados existentes.
5. Publicar novos dados como schema v2 e manter um migrador v1 → v2 centralizado na leitura/importação. Validar o objeto após a migração e cobrir IndexedDB, localStorage e JSON importado. Não alterar nomes de banco, stores ou chaves de persistência.
6. Os formatos MD1, MD2, MD3 e MD5 vêm da lista do jogo no catálogo, permitindo alterações futuras. MD2 segue a decisão do organizador: primeira pessoa a duas vitórias. Para jogos de gols, cada jogo da série possui seu próprio placar e eventual desempate por pênaltis.
7. O botão “Iniciar partida” é uma operação explícita no store. Ele cria o estado ao vivo com resultado zerado; salvar placar parcial em 0–0 também pode preservar esse estado, mas não é substituto para uma ação de início clara.

## 5. Arquivos e áreas afetadas

- Catálogo e modelos: `src/app/domain/game-catalog.ts` (novo), `src/app/domain/tournament.model.ts`.
- Regras de resultado, classificação e avanço: `src/app/domain/tournament-engine.ts` e `src/app/domain/tournament-engine.spec.ts`.
- Persistência, migração e ações de partida: `src/app/core/tournament-store.service.ts` e `src/app/core/tournament-store.service.spec.ts`.
- Seleção de jogo e configuração MD: `src/app/features/tournament/tournament.component.ts`, `.html` e `.spec.ts`.
- Início, entrada e confirmação de placar: `src/app/features/admin/admin.component.ts`, `.html` e `.spec.ts`.
- Placar ao vivo e resultado em tela: `src/app/features/dashboard/dashboard.component.ts`, `.html`, componentes `live-match-card` e `upcoming-match-card`.
- Bracket e resumo: `src/app/features/brackets/bracket-display.component.ts`, `.html`, componentes de resumo/card e seus specs.
- Fluxos completos: `e2e/tournament-flows.spec.ts`.

## 6. Fases e tarefas

### Fase 1 — Catálogo, tipos e compatibilidade de domínio

- [x] **T001 [Plan:1.1]:** criar `src/app/domain/game-catalog.ts` com IDs estáveis, nomes, aliases de importação, categorias `series-wins`/`goals` e formatos permitidos para Clash Royale e EA SPORTS FC.
- [x] **T002 [Plan:1.2,1.3]:** atualizar `src/app/domain/tournament.model.ts` para incluir `BestOf = 1 | 3 | 5`, identidade do jogo e dados opcionais de pênaltis, mantendo compatibilidade com torneios legados.
- [x] **T003 [Plan:1.3]:** atualizar `src/app/domain/tournament-engine.ts` para validar resultados por categoria: alvo de vitórias para séries; gols não negativos e pênaltis somente para empate em categoria de gols; derivar vencedor corretamente.
- [x] **T004 [Plan:1.3,1.4]:** atualizar cálculo de classificação e retrospecto em `src/app/domain/tournament-engine.ts` para contar partidas concluídas/vitórias sem somar gols como vitórias de série.
- [x] **T005 [Plan:1.3,1.4]:** adicionar specs em `src/app/domain/tournament-engine.spec.ts` cobrindo MD1, 0–0 ao vivo, empate, pênaltis e estatísticas por categoria.

### Fase 2 — Persistência, migração e início de partida

- [x] **T006 [Plan:1.5]:** atualizar `src/app/core/tournament-store.service.ts` para escrever schema v2 e migrar documentos v1 no carregamento local e na importação JSON.
- [x] **T007 [Plan:1.5,1.7]:** ajustar o validador de importação em `src/app/core/tournament-store.service.ts` para aceitar v1 via migração e v2 diretamente, rejeitando dados inválidos sem substituir dados atuais.
- [x] **T008 [Plan:1.7]:** adicionar operação de início no store, validando etapa, rodada, partida pendente e participantes; persistir placar inicial 0–0 com status `in-progress` e sem vencedor.
- [x] **T009 [Plan:1.3,1.7]:** adequar `updateMatchProgress()` e `updateMatch()` para suportar placar ao vivo 0–0, conclusão validada e pênaltis.
- [x] **T010 [Plan:1.5,1.7]:** ampliar specs do store para migração v1, resultados existentes, início de partida e import inválido.

### Fase 3 — Configuração de torneio

- [x] **T011 [Plan:1.1,1.2]:** substituir o input livre por seleção de catálogo e usar aliases no domínio para reconhecer nomes legados.
- [x] **T012 [Plan:1.2,1.3]:** disponibilizar MD1/MD2/MD3/MD5 para todos os jogos e categoria de gols com entrada individual por jogo.
- [x] **T013 [Plan:1.2,1.3]:** permitir MD1 em etapas e na eliminatória, preservando os formatos suportados.
- [x] **T014 [Plan:1.1,1.2]:** testar catálogo, formatos e seleção de categoria em `tournament.component.spec.ts`.

### Fase 4 — Operação de partida e exibição

- [x] **T015 [Plan:1.4,1.7]:** adicionar “Iniciar partida” no Admin para definir ao vivo em 0–0.
- [x] **T016 [Plan:1.3,1.4]:** exibir campos de vitórias da série, gols e pênaltis de acordo com categoria.
- [x] **T017 [Plan:1.4,1.7]:** validar conclusão e correção; empate de gols requer pênaltis com vencedor.
- [x] **T018 [Plan:1.4,1.6]:** exibir placares ao vivo e rótulos por categoria no Dashboard.
- [x] **T019 [Plan:1.4,1.6]:** adaptar card e resumo do bracket para placares por categoria e pênaltis.
- [x] **T020 [Plan:1.4,1.6]:** não contabilizar gols como vitórias de série nas estatísticas.

### Fase 5 — Validação ponta a ponta e documentação

- [x] **T021 [Plan:1.1,1.3,1.4,1.5]:** adicionar fluxo E2E para início 0–0, gols, desempate por pênaltis e persistência.
- [x] **T022 [Plan:1.1,1.2,1.4]:** cobrir Clash Royale, formatos MD1/3/5 e semântica de série nos testes unitários da configuração/domínio.
- [x] **T023 [Plan:1.5,1.7]:** testar importação de JSON v1 e preservação dos resultados durante a migração v2.
- [x] **T024 [Plan:1.1-1.7]:** executar `npm test` (87 aprovados) e `npm run build` (aprovado). E2E foi escrito, porém não executado com sucesso nesta sessão.
- [x] **T025 [Plan:1.1-1.7]:** documentar catálogo, categorias, pênaltis e início ao vivo no `README.md`.

## 7. Critérios de aceite

1. A criação/configuração do torneio oferece uma lista de jogos, inicialmente Clash Royale e EA SPORTS FC, sem aceitar novo nome livre como jogo suportado.
2. A categoria determina a semântica da partida; adicionar outro jogo à categoria de gols reutiliza a mesma entrada, validação e apresentação sem lógica especial pelo nome.
3. MD1 está disponível; para EA SPORTS FC, o placar registra gols. Um resultado com gols diferentes escolhe vencedor pelo placar; um empate só é concluído quando há placar de pênaltis válido e vencedor.
4. É possível iniciar partida com 0–0. O status persiste como `in-progress`, aparece como “Ao vivo” nas telas e não conta como resultado concluído nem avança uma chave.
5. Partidas concluídas contam uma vitória/derrota para classificação; gols e pênaltis não são confundidos com vitórias de série nas estatísticas.
6. MD1/MD2/MD3/MD5 funcionam para os jogos do catálogo; categorias de gols armazenam resultados individuais em vez de somar gols como vitórias da série.
7. Torneios locais e arquivos v1 permanecem acessíveis depois da atualização; um arquivo inválido não apaga/substitui os dados atuais.
8. Testes unitários cobrem as regras de pontuação e migração; build e testes passam. E2E só é declarado aprovado após execução real com navegador disponível.

## 8. Mapeamento de requisitos

| Requisito | Plano | Evidência principal |
|---|---|---|
| REQ-001 — Catálogo de jogos | T001, T011, T014, T021, T022 | `game-catalog.ts`; seletor em `tournament.component.html`; specs do componente e E2E |
| REQ-002 — Categorias reutilizáveis | T001–T005, T012, T016, T018–T020 | estratégia de categoria no domínio; Admin, Dashboard e bracket |
| REQ-003 — MD1 e placar de gols | T002–T005, T012–T014, T016–T017, T021 | modelo/validador; configuração de etapa; formulário e fluxo E2E |
| REQ-004 — Pênaltis | T003, T005, T016–T019, T021 | tipo de resultado, validação e apresentação de desempate |
| REQ-005 — Início ao vivo 0–0 | T008–T010, T015, T018–T019, T021 | ação no store/Admin e estado exibido como ao vivo |
| REQ-006 — Telas com placar correto | T016–T020, T021–T022 | Admin, Dashboard, bracket e estatísticas |
| REQ-007 — Compatibilidade de dados | T006–T007, T010, T023 | migrador v1→v2 e testes de importação/persistência |
| REQ-008 — Integridade e progressão | T003–T010, T017, T019–T024 | testes de domínio/store, UI e E2E |

## 9. Decisão a confirmar antes da implementação

MD2 foi definido como primeira pessoa a duas vitórias, portanto a série pode ter até três jogos. A lista MD1/MD2/MD3/MD5 é uma configuração por jogo no catálogo; para uma modalidade futura, adicione sua opção e mantenha explícita a regra que converte o formato em vitórias necessárias.
