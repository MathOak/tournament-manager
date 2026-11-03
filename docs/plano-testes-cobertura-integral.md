# Plano de testes — cobertura integral do estado atual

**Status:** implementado parcialmente em 2026-11-03. Unitários e componentes estão implementados e validados; os testes E2E foram adicionados, mas o navegador Playwright falhou ao iniciar neste ambiente (`spawn EPERM`).

## 1. Objetivo

Construir uma suíte que valide o comportamento atual do Tournament Manager de ponta a ponta, cobrindo regras de domínio, store e persistência local, telas e formulários, navegação, bracket, temas, acessibilidade e fluxos completos. O objetivo é caracterizar o sistema existente e detectar regressões, sem inventar comportamentos ainda não implementados.

“Cobertura integral” significa validar cada fluxo funcional observável e regras de negócio identificadas, não apenas atingir um percentual de linhas. Medir coverage depois de mapear testes críticos; definir mínimo quantitativo apenas quando a baseline estiver conhecida.

## 2. Estado atual levantado

- Angular 21 standalone, TypeScript strict, Router e Signals.
- Vitest integrado ao Angular CLI e ambiente de teste com JSDOM.
- Scripts existentes: `npm test` executa `ng test`; não há configuração de E2E ou ferramenta de navegador no `package.json`.
- Testes encontrados:
  - `src/app/app.spec.ts`: criação da aplicação e presença dos links de navegação.
  - `src/app/domain/tournament-engine.spec.ts`: MD3/MD5, progressão, suíço/byes, eliminação, correção, seeds e retrospecto agregado.
  - `src/app/features/brackets/bracket-display.component.spec.ts`: render da chave, rodadas/conectores, vencedor, bye e escala calculada para 4K.
- Não foram encontrados testes específicos para `TournamentStore`, Players, Admin, Tournament setup, migração de persistência, interação de telas, importação/exportação, tema ou fluxos integrados completos.
- Persistência é local: IndexedDB com fallback localStorage; coleção de campeonatos, seleção persistida, import/export JSON e sincronização entre abas por BroadcastChannel.
- Há dados JSON de exemplo em `public/gameHistory/`, mas o aplicativo não os carrega automaticamente; testes não devem depender desse arquivo sem explicitamente utilizá-lo como fixture.
- Não existe backend, serviço remoto, autenticação ou sincronização entre dispositivos. Não criar teste de API/rede como se esses recursos existissem.

## 3. Camadas da estratégia

### Camada A — Unitários de domínio

Manter testes rápidos e determinísticos das funções puras em `src/app/domain/`.

**Modelo e validação de resultado**

- Placares válidos e inválidos para MD3 e MD5, ambos os lados como vencedor.
- Negativos, decimais, empate, alvo incorreto, duas pontuações no alvo, vencedor sem participantes.
- Progresso parcial permitido e recusas para série já encerrada, empate, score vazio ou limite atingido sem confirmação.

**Geração e progressão**

- Swiss: participantes pares/ímpares, primeiro round, bye, não repetir bye quando possível, evitar revanche enquanto houver alternativa, comportamento quando não há alternativa, limites de rodadas.
- Classificação: pontos, partidas disputadas, participante sem jogo, bye, empate na pontuação e desempate por nome já observado no código.
- Eliminação: tamanhos 2, 3, 4, 8, 14 e 16; número de rodadas, slots nulos/byes, seed, propagação e finalização.
- Correção de resultado: atualizar o vencedor propagado, limpar placares e vencedores posteriores, preservar consistência da chave.
- Retrospecto: contar apenas séries finalizadas com dois jogadores e vencedor; placares agregados, etapas mistas, byes, série ao vivo e partidas pendentes.

### Camada B — Unitários do `TournamentStore`

Criar testes isolados com ambiente controlado, relógio/dados determinísticos e adapters/fakes para armazenamento e BroadcastChannel. Cobrir:

- Estado inicial, `ready`, contadores e avisos.
- Atualizar nome/jogo: trim, valores vazios e atualização timestamp.
- Criar campeonato, gerar nome, selecionar id existente/inexistente, remover selecionado/não selecionado e proteção de último campeonato.
- Adicionar/remover jogadores: trim, duplicidade case-insensitive, nome obrigatório, handle opcional, bloquear remoção de participante em chave.
- Adicionar etapa: exigir dois jogadores; criar suíço/eliminatória com MD3/MD5.
- Criar eliminatória a partir de suíço: fonte inexistente/incompleta, resultados pendentes, menos de dois classificados, IDs repetidos/desconhecidos, seed por classificação/manual/sorteio.
- Gerar rodada suíça: etapa inexistente/não suíça, pendências, limite atingido e sucesso após concluir rodada.
- Atualizar placar final e parcial: sucesso, validação, avisos e status da etapa.
- `exportJson()` e importação: documento válido, JSON malformado, versão desconhecida, campos inválidos, ID duplicado com geração de novo ID, substituição explicitamente permitida, preservação da coleção e seleção do importado.
- Persistência: carregar collection de IndexedDB, fallback localStorage, documento legado v1, sem coleção, ids selecionados ausentes, falhas de quota/DB e evitar perda silenciosa.
- BroadcastChannel: notificar alterações locais e recarregar estado recebido sem ciclo de notificações.

**Recomendação arquitetural para testabilidade:** antes de acumular testes dependentes de APIs globais e IndexedDB simulado, encapsular persistência num adapter/repositório pequeno injetável. Se não for feito, usar IndexedDB fake compatível e restaurar spies/storage em `afterEach`.

### Camada C — Testes de componentes Angular

Usar `TestBed`, `provideRouter`, fixtures de torneio e spies/serviços falsos. Verificar comportamento visível e interações, não detalhes privados da classe.

**Shell/Header/Router**

- Links para Dashboard, Jogadores, Torneio, Chaves e Admin; rota ativa e navegação.
- Modo normal versus rotas de apresentação `/display` e `/brackets`.
- Toggle de tema dark/light, atributo `data-theme`, persistência da preferência e label acessível.
- Toast aparece, tem `role="status"` e pode ser fechado; rodapé não aparece no modo de apresentação.

**Players**

- Formulário de nome/handle, adicionar com sucesso, limpar os campos e exibir contagem/lista.
- Nome vazio/duplicado mantém formulário e informa erro.
- Remoção exige confirmação; cancelamento não altera dados; erro ao remover participante de etapa deve ser comunicado.
- Export JSON dispara download com MIME/nome adequados; import com confirmação, cancelamento e arquivo inválido.

**Tournament setup**

- Salvar nome/jogo; bloquear valores inválidos conforme store.
- Criar etapa suíça/eliminatória, MD3/MD5, rodadas configuradas e estado vazio.
- Gerar rodada seguinte só após concluir partidas; opção disabled e mensagens.
- Excluir etapa com confirmação/cancelamento.
- Classificação de suíço, seleção Top N/manual, corte empatado, confirmação explícita, reordenar seeds e reverter preview.
- Prévia dos confrontos/byes e confirmar apenas uma vez.

**Admin**

- Estado vazio sem etapas; selecionar etapa e rodada; counters abertas/ao vivo/concluídas.
- Exibir partidas acionáveis primeiro e partidas finalizadas na seção recolhida.
- Draft de placar, salvar parcial, confirmar resultado MD3/MD5 e mostrar mensagens de erro/sucesso.
- Corrigir resultado exige confirmação; cancelamento preserva score; salvar correção atualiza o resultado.
- Identificar nomes/acessibilidade dos campos e labels dos botões.

**Dashboard e bracket**

- Dashboard: hero, contagens, live/upcoming/empty, classificação suíça e etapa.
- Bracket dedicado: filtro de etapas eliminatórias apenas, seletor de campeonato/etapa, tabs, nomes, placeholders de vencedor, vencedor, estado, bye, conectores, fullscreen API (sucesso, não suportada, Promise rejeitada), atualização dos labels ao alternar tema e campeonato.
- Bracket embutido: o modo embedded não duplica header global, botões de tema/fullscreen nem dados; usa o campeonato selecionado atual.
- Responsividade: widths pequenas, desktop e 4K. Preferir assertions semânticas e medições geométricas significativas, não pixel snapshots frágeis em todas as variações.

### Camada D — Integração de serviços/armazenamento

Testar conjunto de componentes + store + persistência, sem mockar o domínio inteiro:

1. Inicializar com legado v1 no localStorage, migrar para coleção e recarregar sem perda.
2. Criar dois campeonatos, alterar cada um, alternar e comprovar isolamento de jogadores/etapas.
3. Importar o mesmo JSON novamente sem substituir silenciosamente o anterior; validar id único e dados preservados.
4. Exportar e importar novamente, comparar conteúdo relevante do campeonato.
5. Atualizar estado em uma instância e observar notificação/atualização em outra instância ou aba simulada.
6. Falha de persistência mostra aviso e mantém dados exportáveis durante a sessão.

### Camada E — E2E do navegador

Adicionar ferramenta E2E apenas como dependência de desenvolvimento e configurá-la compatível com Angular/Vitest atual (Playwright é recomendável para Chromium/Firefox/WebKit). Isso requer decisão de instalar e CI disponível; não presumir ambientes ou browsers já configurados.

Fluxos E2E prioritários:

- **Fluxo completo suíço:** iniciar estado limpo → cadastrar jogadores → criar etapa suíça → inserir resultados MD3/MD5 → gerar próxima rodada → classificar e confirmar empates conforme fluxo atual → criar eliminatória.
- **Fluxo de chave:** selecionar/alternar campeonato → abrir `/brackets` → validar rodadas/placares/byes/conectores → fullscreen e saída por botão/Esc → retornar ao Dashboard pela navegação.
- **Fluxo Admin → Dashboard:** atualizar placar no Admin e verificar refletido no dashboard e na chave; recarregar e verificar persistência.
- **Import/export e coleção:** importar dois torneios, alternar, exportar um, recarregar e verificar seleção/dados individuais.
- **Aparência funcional:** dark/light, viewport mobile/desktop/4K, tabulação por teclado, foco visível, menu e fullscreen.
- Cada teste começa com banco/localStorage/IndexedDB isolados; não depender dos dados pessoais persistidos no navegador do desenvolvedor.

E2E não deve confirmar autenticação, colaboração em rede, API ou sincronização entre dispositivos porque tais requisitos não estão implementados.

## 4. Fixtures e isolamento dos testes

- Criar builders/factories de `Tournament`, `Player`, `Stage`, `Round` e `Match` em helpers de teste, com IDs determinísticos e sem `Math.random()` para expectativas.
- Para testar o sorteio, injetar fonte aleatória/seed ou verificar apenas invariantes e conjunto de participantes; não depender de ordem não determinística.
- Cada teste do store começa com storage vazio e limpa IndexedDB/localStorage/channel/timers/spies após execução.
- Não compartilhar objetos mutáveis entre testes; clonar fixtures e evitar alterações em estado global.
- Confirm/file download/fullscreen e APIs do navegador devem ter fakes controlados e restaurados após cada teste.
- Testes visuais devem usar fixture explícita, não o campeonato atualmente armazenado na máquina.

## 5. Matriz de cobertura funcional

| Área | Regras/fluxos essenciais | Tipo principal |
|---|---|---|
| Modelo e engine | MD3/MD5, swiss, eliminação, seed, bye, correção e retrospecto | Unitário |
| Store | CRUD, coleção, import/export, validação e avisos | Unitário/integração |
| Persistência | IndexedDB, localStorage, migração e falhas | Integração |
| Navegação e tema | rotas, shell, apresentação, tema claro/escuro | Componente/E2E |
| Jogadores | criar, listar, remover, import/export | Componente/E2E |
| Configuração | dados, formatos, rodadas, classificação e seed | Componente/E2E |
| Administração | filtros, placar, parcial, confirmação e correção | Componente/E2E |
| Dashboard | estados vazios, live/upcoming, contadores, classificação | Componente/E2E |
| Bracket | rounds, conectores, bye, score, seletor, fullscreen | Componente/E2E |
| Acessibilidade/responsivo | teclado, labels, foco, overflow e telão/4K | Componente/E2E/manual assistido |

## 6. Ordem recomendada de execução

1. **Baseline:** executar build/testes atuais e registrar resultado real; capturar fluxos/fixtures do estado presente.
2. **Helpers e domínio:** tornar testes determinísticos e fechar lacunas da engine.
3. **Store:** extrair adapter de persistência se necessário; testar regras de coleção e falhas.
4. **Componentes:** adicionar testes de Players, Tournament setup, Admin e Dashboard; preferir interação/DOM visível.
5. **Bracket:** completar estados do seletor, fullscreen e modo embedded/dedicado; revisar responsividade.
6. **Integração:** cobrir migração, persistência após reload, múltiplos torneios e BroadcastChannel.
7. **E2E:** instalar/configurar ferramenta, implementar fluxos de alto risco e adicionar execução no CI quando pipeline for conhecido.
8. **Acessibilidade e cobertura:** revisar labels/foco/teclado e produzir relatório de cobertura; usar cobertura para achar código sem teste, sem tratar número isolado como prova de completude.

## 7. Critérios de aceite do programa de testes

- Cada requisito/comportamento encontrado está associado a pelo menos um caso de teste na matriz.
- Engine possui casos positivos, negativos e limites para regras MD3/MD5, swiss, eliminação e correção.
- Store possui cobertura de coleção, migração, validação JSON, persistência local e falhas.
- Os fluxos de todas as páginas possuem testes de apresentação/interação, inclusive estados vazios e validações.
- Pelo menos os fluxos críticos do usuário têm E2E real de navegador, com dados isolados e sem depender de storage persistido do desenvolvedor.
- Temas, fullscreen e bracket responsivo são verificados sem snapshots indiscriminados e frágeis.
- Build, suíte unitária/componente, integração e E2E podem ser executados por comandos documentados e reportam falhas com saída não-zero.
- Nenhum teste sugere suporte a backend, autenticação ou sincronização remota que não exista.

## 8. Riscos e decisões

- **“Totalidade” sem spec formal:** o plano parte do comportamento observado em código e documentos; comportamentos ambíguos devem virar testes de caracterização, não ser inventados.
- **IndexedDB e browser APIs em JSDOM:** pode ser necessário adapter injetável ou fake específico; testar um adapter é mais estável que mockar cada método global no serviço.
- **E2E e dependências:** Playwright ainda não está no projeto; a implantação de E2E requer instalação e escolha de browsers/CI. A etapa unitária/componente permanece executável com a stack atual.
- **Flakiness de layout:** testes geométricos devem focar invariantes e breakpoints representativos; snapshots só para páginas estáticas e aprovados conscientemente.
- **Aleatoriedade de sorteios:** sem fonte de aleatoriedade injetável, asserções de ordenação exata são frágeis. Preferir invariantes ou refatorar gerador para RNG injetável.
- **Mudança contínua do produto:** quando componentes forem refatorados conforme `plano-refatoracao-componentes-ui.md`, manter casos de contrato e mover testes com a responsabilidade; não duplicar testes idênticos só por mudança de arquivo.

## 9. Implementação e validação realizadas

### Testes adicionados

- `src/app/domain/tournament-engine.spec.ts`: ampliado para cobrir entradas inválidas, classificações que não contam BYE/partidas abertas como série jogada, chaves ímpares e byes, limites de rodadas suíças e atualização parcial imutável.
- `src/app/core/tournament-store.service.spec.ts`: novo conjunto para inicialização, contagens, detalhes do torneio, CRUD/seleção de coleção, jogadores, criação de etapas, placares finais/parciais, rodadas suíças, promoção para eliminatória, JSON, IDs duplicados e migração do fallback legado.
- `src/app/features/players/players.component.spec.ts`: estados vazios, submissão bem-sucedida/recusada e confirmação de remoção.
- `src/app/features/admin/admin.component.spec.ts`: contadores, editores de partida, gravação parcial/final, correção confirmada e estado sem etapas.
- `src/app/features/tournament/tournament.component.spec.ts`: salvar configuração, criar etapa/rodada, empate no corte de qualificação, preview/seed e confirmação de exclusão.
- `src/app/features/dashboard/dashboard.component.spec.ts`: estado vazio, partida ao vivo e bracket embutido.
- `src/app/features/brackets/bracket-display.component.spec.ts`: filtragem por formato, modo embutido, rodadas/conectores, BYE, fullscreen indisponível e dimensões 4K.
- `src/app/app.spec.ts`: navegação e alternância/persistência do tema.
- `e2e/tournament-flows.spec.ts`: seis cenários de navegador para navegação, cadastro, importação, bracket/fullscreen, Admin→bracket após recarga, tema e viewports mobile/4K.

### Ferramenta e comandos

- Adicionado `@playwright/test` como dependência de desenvolvimento e configuração em `playwright.config.ts`, com Chromium e servidor Angular reutilizável.
- `npm test` executa `ng test --watch=false`.
- `npm run test:e2e` executa E2E; `npm run test:e2e:install` instala Chromium; `npm run test:e2e:ui` abre a interface do Playwright.

### Resultados observados

- Build de produção Angular: concluído com sucesso após a adição dos testes/configuração.
- Unitários/componentes: **8 arquivos aprovados, 47 testes aprovados**.
- E2E: os seis cenários foram encontrados por `playwright test --list`, mas a execução falhou antes dos testes iniciarem. O Playwright recebeu `spawn EPERM` ao abrir `chrome-headless-shell.exe`; trata-se de bloqueio de execução do browser no ambiente, não de uma falha de asserção da aplicação. Reexecutar em uma máquina/CI que permita iniciar o Chromium instalado.
- `get_errors` não reportou erros nos testes/specs novos. O editor reporta separadamente um diagnóstico de `rootDir` em `tsconfig.app.json`/`tsconfig.spec.json` associado ao compilador TypeScript do editor; o build Angular executado passou.
- Instalação do Playwright reportou vulnerabilidades já presentes/na árvore npm (17 moderadas e 1 alta no audit do comando de instalação). A implementação de testes não executou `npm audit fix` nem alterou dependências de runtime para tentar remediá-las sem avaliação.
