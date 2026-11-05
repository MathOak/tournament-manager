# Plano de implementação — montagem manual das chaves

**Status: implementação concluída em 2026-11-05.** Pareamento manual/automático para eliminação simples e sistema suíço está implementado, incluindo validação, byes, persistência, UI e testes unitários. Validação final: `npm test` aprovado (99 testes) e `npm run build` aprovado. Os fluxos E2E para os dois formatos foram adicionados, mas a execução no Chromium não foi confirmada nesta sessão.

## 1. Objetivo

Permitir que a organização escolha manualmente os confrontos de uma etapa do torneio, em vez de depender exclusivamente de pareamento automático. A montagem deve funcionar nas modalidades atuais — eliminação simples e sistema suíço — e admitir outras modalidades futuras por meio de regras específicas de pareamento. A organização revisa e confirma os confrontos antes de iniciar a etapa/rodada; na eliminação simples, os vencedores continuam avançando automaticamente como hoje.

**Status: implementado em 2026-11-05.** As telas agora oferecem pareamento manual e automático para eliminação simples e sistema suíço. Byes da eliminação são distribuídos na primeira rodada; o bye suíço conta como vitória/ponto, não como partida jogada, e usa rotação justa. Build e testes unitários aprovados; E2E foi adicionado, mas sua execução não foi confirmada nesta sessão.

## 2. Estado atual confirmado

- A criação direta de etapas em [src/app/features/tournament/tournament.component.ts](../src/app/features/tournament/tournament.component.ts) chama `TournamentStore.addStage()` sem especificar ordem; `createStage()` embaralha participantes na eliminação simples e o sistema suíço também cria pareamentos automaticamente.
- Para a eliminatória classificada do suíço, já existem os modos de distribuição por classificação, sorteio e ordem manual. A opção manual apenas ordena os seeds: `arrangeBySeed()` ainda monta confrontos de acordo com o padrão cabeça de chave 1 contra último seed, 2 contra penúltimo etc. Ela não permite escolher qualquer confronto.
- `Stage.rounds[0].matches` já guarda `playerAId` e `playerBId`, e o restante das rodadas é preenchido por avanço automático. A estrutura atual pode representar uma montagem manual da primeira rodada sem duplicar o bracket.
- O tratamento de vagas/byes é automático, baseado nos slots sem participante, e propaga o avanço para as rodadas seguintes.
- O sistema suíço gera pareamentos por pontos, evitando revanche quando possível. A montagem manual deverá obedecer às restrições de cada formato (por exemplo, uma partida por participante por rodada e bye único quando o número de participantes for ímpar), sem assumir que as regras da eliminação simples também servem ao suíço.

## 3. Requisitos funcionais

- **REQ-001 — Escolha do modo por modalidade:** oferecer pareamento automático ou montagem manual em todas as modalidades do torneio. A configuração e validação respeitam o formato; a arquitetura não limita o recurso à eliminação simples.
- **REQ-002 — Editor de confrontos:** na eliminação simples, permitir escolher cada confronto da primeira rodada. No suíço, permitir montar os confrontos de cada rodada antes de iniciá-la, considerando participantes elegíveis e partidas já realizadas. Modalidades futuras fornecem sua própria política de slots e validação.
- **REQ-003 — Unicidade e integridade:** em cada rodada, cada participante elegível aparece no máximo uma vez; não permitir auto-confronto, duplicação, participante inelegível ou confirmação inválida. A cobertura deve ser completa, exceto slots de bye aceitos pelas regras da modalidade.
- **REQ-004 — Byes automáticos na eliminação:** dimensionar a chave para a próxima potência de dois e distribuir automaticamente os byes na primeira rodada, de modo que sejam resolvidos nela. Nenhuma partida da segunda rodada pode ser bye por falta de um classificado feeder. Byes avançam sem resultado manual e não contam como partidas disputadas.
- **REQ-005 — Byes no sistema suíço:** com número ímpar de participantes elegíveis, um bye é necessário em cada rodada. O participante que recebe o bye é considerado vencedor da rodada e recebe os mesmos pontos de vitória previstos para uma partida vencida; o bye não conta como partida disputada. O gerador automático deve excluir da seleção os participantes que já receberam bye enquanto houver participantes elegíveis sem bye. A montagem manual deve aplicar a mesma regra: não permitir selecionar novamente alguém que já recebeu bye, salvo se todos os participantes elegíveis já tiverem recebido um e for inevitável repetir; nesse caso, avisar e escolher de forma determinística quem tem menos byes anteriores.
- **REQ-006 — Prévia e confirmação:** mostrar prévia dos confrontos/byes antes de salvar; permitir voltar, trocar participantes e cancelar. Nenhuma etapa/rodada manual é gravada até confirmação explícita.
- **REQ-007 — Progressão automática:** após confirmar a eliminatória, manter a propagação de vencedores; correções recalculam slots descendentes. No suíço, a próxima rodada só fica disponível após o encerramento da atual.
- **REQ-008 — Persistência:** salvar confrontos em `Stage.rounds[].matches` e persistir/exportar/importar pelo fluxo atual. Reabrir o campeonato deve mostrar os mesmos pares, sem novo sorteio.
- **REQ-009 — Compatibilidade:** torneios existentes/importados conservam confrontos gravados. Alterar o modo de montagem não reembaralha etapas/rodadas existentes.
- **REQ-010 — Acessibilidade e responsividade:** controles com rótulos explícitos, uso por teclado e suporte a telas móveis; estados inválidos e byes anunciados.
- **REQ-011 — Extensibilidade:** novas modalidades de torneio podem definir política própria de slots, elegibilidade e byes sem alterar os editores e validadores dos formatos já existentes.

## 4. Escopo e decisões

### Incluído nesta entrega

- Escolha entre pareamento automático e manual em **eliminação simples** e **sistema suíço**.
- Editor manual da primeira rodada eliminatória e editor de confrontos para cada rodada suíça antes de iniciá-la.
- Reutilização do editor para a eliminatória criada a partir do suíço, preservando a etapa de origem.
- Prévia e confirmação antes da persistência.
- Continuação automática do bracket após confirmação; geração/seleção da rodada suíça seguinte após finalizar a atual.
- Byes automáticos da eliminação resolvidos na primeira rodada; bye suíço rotativo quando o número de participantes for ímpar.

### Fora do escopo inicial

- Editar retroativamente uma eliminatória após iniciar ou registrar resultados. O modo de montagem é escolhido antes da confirmação da etapa.
- Editar retroativamente uma rodada suíça iniciada; a escolha manual é realizada antes de iniciar cada rodada.
- Regras de cabeças de chave, grupos/equipes, restrições geográficas ou prevenção manual de revanche, salvo se forem especificadas depois.
- Interface de montagem de modalidades futuras ainda não presentes; o domínio deve permitir conectá-las por política própria.

### Decisões recomendadas

1. Aplicar a seleção manual a confrontos individuais, não apenas a ordem de seeds. Preservar “Seguir classificação” e “Sortear” como atalhos de preenchimento da prévia da eliminatória, permitindo ajuste posterior.
2. Na eliminação, distribuir os byes automaticamente na primeira rodada. Para `N` participantes, usar `2^ceil(log2(N)) - N` byes e posicioná-los de forma que todos sejam resolvidos na rodada 1; cada partida da rodada 2 deve ter dois feeders definidos.
3. No suíço com número ímpar de participantes, um bye é inevitável em cada rodada e vale como vitória/ponto na classificação, mas não aumenta o total de partidas disputadas. Distribuí-lo primeiro entre participantes sem bye anterior; repetir somente quando todos já tiverem recebido bye, priorizando quem tiver menos byes. O pareamento automático e o manual devem aplicar e validar a mesma regra.
4. Guardar a composição confirmada diretamente nos matches da rodada. Pode-se adicionar `pairingMode` em `Stage`/`Round` para indicar origem; renderização e avanço dependem dos matches salvos, não da reconstrução dos seeds.
5. A confirmação cria/grava a etapa ou rodada imediatamente. Cancelar ou sair da prévia não altera o torneio nem consome IDs persistidos.
6. Definir política/contrato de pareamento por formato: eliminação (árvore e feeders), suíço (pares disjuntos e bye conforme paridade) e extensão para futuras modalidades.

## 5. Arquivos e áreas afetadas

- Domínio, política de pareamento e geração: `src/app/domain/tournament.model.ts`, `src/app/domain/tournament-engine.ts`.
- Store/commit: `src/app/core/tournament-store.service.ts`.
- Tela de configuração, montagem e prévia: `src/app/features/tournament/tournament.component.ts`, `.html`, `.spec.ts` e estilos co-localizados; extrair componentes reutilizáveis de pareamento em `src/app/features/tournament/components/` se necessário.
- Apresentação e persistência: `src/app/features/brackets/` e `src/app/features/brackets/bracket-display.component.spec.ts` para garantir que slots manuais já persistidos são exibidos corretamente.
- Testes de domínio/store: `src/app/domain/tournament-engine.spec.ts`, `src/app/core/tournament-store.service.spec.ts`.
- Testes de ponta a ponta: `e2e/tournament-flows.spec.ts`.

## 6. Fases e tarefas

### Fase 1 — Modelo e políticas de pareamento por formato

- [x] **T001:** definir tipos para modo de pareamento e configuração em `Stage`/`Round`, preservando JSON legado.
- [x] **T002:** criar validação/materialização de pareamentos para primeira rodada eliminatória e rodadas suíças manuais.
- [x] **T003:** validar participantes elegíveis, auto-confrontos, duplicidade, cobertura, tamanho e byes por formato.
- [x] **T004:** distribuir byes da eliminação na primeira rodada e rotacionar byes suíços por contagem anterior.
- [x] **T005:** testar pareamentos manuais, byes, rotação justa e ausência de byes eliminatórios na segunda rodada.

### Fase 2 — Integração com o store

- [x] **T006:** adicionar operações do store para criação eliminatória manual e início de rodada suíça manual, com validação no domínio.
- [x] **T007:** suportar pareamento automático/manual no store, mantendo automático como padrão.
- [x] **T008:** aceitar confrontos exatos na eliminatória de classificados do suíço.
- [x] **T009:** iniciar rodada suíça manual somente depois da conclusão da anterior e impedir geração automática em etapa marcada como manual.
- [x] **T010:** cobrir store para persistência dos pares, validação, início manual e regras de byes.

### Fase 3 — Experiência de montagem manual

- [x] **T011:** oferecer modo automático/manual na configuração para os dois formatos.
- [x] **T012:** criar editor manual eliminatório, com sugestão inicial que posiciona byes na primeira rodada.
- [x] **T013:** criar editor de rodada suíça manual com participantes únicos e bye rotativo.
- [x] **T014:** adicionar selects com rótulos, mensagens de validação, ações de cancelar/confirmar e estilos responsivos.
- [x] **T015:** implementar confirmação de montagem manual; a criação usa exatamente os pares exibidos.
- [x] **T016:** reutilizar a seleção manual para eliminatória originada do suíço.
- [x] **T017:** adicionar specs dos componentes para os dois formatos.

### Fase 4 — Compatibilidade, apresentação e ponta a ponta

- [x] **T018:** as telas usam os jogadores armazenados diretamente em cada partida.
- [x] **T019:** testes verificam byes eliminatórios na rodada 1 e sua propagação sem BYE na rodada 2.
- [x] **T020:** adicionar E2E de chave eliminatória manual, persistência de confrontos e avanço.
- [x] **T021:** adicionar E2E de rodada suíça manual após concluir a rodada anterior; a execução Chromium não foi confirmada.
- [x] **T022:** executar `npm test` (99 aprovados) e `npm run build` (aprovado). A execução E2E no Chromium não foi confirmada nesta sessão.
- [x] **T023:** documentar pareamento manual/automático e byes no README.

## 7. Critérios de aceite

1. Todas as modalidades existentes oferecem montagem automática ou manual; cada formato aplica suas próprias restrições.
2. É possível definir confrontos da primeira rodada eliminatória e de cada rodada suíça antes de iniciá-los.
3. Participantes não se repetem na mesma rodada e configurações incompletas/inválidas não podem ser confirmadas.
4. Byes da eliminação são resolvidos na primeira rodada, sem byes por falta de feeder na segunda. No suíço ímpar, existe exatamente um bye por rodada; ele conta como vitória/ponto, não como partida disputada, e não é atribuído novamente a quem já recebeu bye enquanto houver outro participante sem bye.
5. A prévia corresponde ao que será persistido; confirmar não recalcula o pareamento e cancelar não altera dados.
6. Após recarga/export/import, os confrontos permanecem iguais.
7. Progressão, correção de resultados, placar por categoria e apresentação atuais continuam funcionando.
8. A arquitetura permite adicionar formatos futuros com política própria de slots/validação.
9. Testes unitários e build passam; E2E só é declarado aprovado após execução real em Chromium.

## 8. Mapeamento de requisitos

| Requisito | Plano | Evidência principal |
|---|---|---|
| REQ-001 — Escolha de modo | T001, T006–T008, T011, T020–T021 | seletor por formato e testes de fluxos |
| REQ-002 — Montagem em todos os formatos | T002–T005, T011–T017, T020–T021 | políticas e editores por modalidade |
| REQ-003 — Unicidade/integridade | T003, T005, T013–T017 | validador e specs de UI |
| REQ-004 — Byes por modalidade | T004–T005, T010, T012–T013, T019, T021 | invariantes eliminatória e suíço |
| REQ-005 — Prévia/confirmar/cancelar | T015–T017, T020–T021 | confirmação exata do preview |
| REQ-006 — Avanço de vencedores | T004, T018–T020 | integração com propagação atual |
| REQ-007 — Persistência/compatibilidade | T006–T010, T020–T021 | store, reload, JSON e legado preservado |
| REQ-010 — Acessibilidade/responsividade | T013–T017 | rótulos, teclado e layout móvel |
| REQ-011 — Extensibilidade | T002–T005, T011 | política plugável por formato |

## 9. Ponto a confirmar antes da implementação

Byes da eliminação simples e do suíço têm regras distintas. Na eliminação, byes automáticos ficam na primeira rodada e devem ser resolvidos nela para que toda partida da segunda rodada tenha dois feeders. No suíço, se o número de participantes for ímpar, um bye é inevitável por rodada, conta como vitória/ponto e não como partida disputada. O sistema automático e o editor manual devem evitar atribuir bye novamente a quem já recebeu um enquanto houver participantes sem bye; repetição só ocorre quando inevitável, priorizando quem tem menos byes anteriores. A regra “sem bye na segunda rodada” não se aplica ao suíço ímpar.
