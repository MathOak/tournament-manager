# Plano de implementação — Tournament Manager

## 1. Objetivo

Evoluir o scaffold Angular atual para uma aplicação frontend de gerenciamento de torneios, inicialmente adequada a Clash Royale, mas configurável para outros jogos. O sistema deverá cadastrar jogadores, criar etapas nos formatos suíço e eliminação simples, registrar resultados em partidas MD3 ou MD5 e refletir as alterações do administrador no dashboard.

Este documento é um plano técnico inicial, não uma especificação final de regras competitivas. Decisões que dependem do organizador estão listadas em [Decisões pendentes](#10-decisões-pendentes).

## 2. Estado atual do projeto

- Angular 21.2, componentes standalone, TypeScript 5.9 com verificações estritas.
- Aplicação SPA inicializada em `src/main.ts`; Router configurado, mas sem rotas.
- A tela atual é o scaffold padrão do Angular; não há funcionalidades de torneio.
- Tailwind CSS 4 está disponível globalmente.
- Testes unitários usam Vitest através do Angular CLI.
- Não foi identificado backend, autenticação ou mecanismo de persistência.

## 3. Requisitos funcionais iniciais

- **REQ-001 — Configuração genérica:** permitir definir nome do torneio e jogo, sem vincular as regras do produto exclusivamente a Clash Royale.
- **REQ-002 — Jogadores:** cadastrar, listar, editar e remover participantes antes do início das etapas.
- **REQ-003 — Formatos:** criar chave suíça e chave de eliminação simples a partir dos participantes cadastrados.
- **REQ-004 — Partidas:** configurar partidas como MD3 ou MD5, registrar placar e determinar vencedor.
- **REQ-005 — Administração:** disponibilizar uma área de administração para atualizar resultados e acompanhar o estado das partidas.
- **REQ-006 — Dashboard:** mostrar jogadores, etapas, partidas e resultados atualizados para o público/participantes.
- **REQ-007 — Persistência local em JSON:** preservar os dados do torneio em formato JSON no navegador e permitir exportar/importar um arquivo JSON.
- **REQ-008 — Atualização reativa:** propagar alterações feitas pelo administrador para o dashboard sem exigir recarga manual, dentro do escopo de sincronização escolhido.
- **REQ-009 — Integridade:** validar entradas, impedir resultados incompatíveis com MD3/MD5 e preservar a consistência das chaves após a conclusão de partidas.

## 4. Premissas e limites do MVP

1. O primeiro incremento será frontend-only, sem inventar API, banco de dados ou autenticação.
2. O navegador é a fonte local de persistência. Recomenda-se IndexedDB para os dados operacionais, com serialização JSON versionada para exportação/importação. Um adapter de persistência deve permitir substituir o armazenamento local por uma API futura sem reescrever as regras de torneio.
3. “Atualização automática” será implementada entre telas/abas abertas no mesmo navegador, usando estado reativo compartilhado e um canal de sincronização entre abas. Sincronização entre dispositivos ou usuários diferentes requer backend e está fora do MVP frontend-only.
4. Os formatos suíço e eliminação simples serão modelados como etapas do torneio. Até confirmação das regras, cada etapa pode ser criada independentemente; não haverá avanço automático dos melhores colocados do suíço para a chave eliminatória.
5. MD3 significa primeiro jogador a vencer 2 jogos; MD5, primeiro a vencer 3. O resultado guardará vitórias por jogador, não somente um vencedor.
6. Os detalhes de desempate, pareamento suíço e classificação serão configuráveis ou claramente indicados como regra provisória, nunca presumidos como regra oficial do jogo.
7. Não será incluída segurança real de acesso administrativo: esconder uma rota ou proteger um botão no frontend não equivale a autenticação. Uso multiusuário confiável exige serviço backend com autorização.

## 5. Arquitetura proposta

### 5.1 Organização por domínio

Manter a estrutura standalone do Angular e organizar novas funcionalidades por domínio, por exemplo:

- `src/app/core/`: estado compartilhado do torneio, persistência, sincronização e utilitários transversais.
- `src/app/domain/`: tipos e regras puras para jogadores, torneios, etapas, pareamentos, chaves e resultados.
- `src/app/features/players/`: cadastro e gerenciamento de jogadores.
- `src/app/features/tournament/`: criação do torneio e configuração de etapas.
- `src/app/features/admin/`: atualização administrativa de partidas.
- `src/app/features/dashboard/`: visualização de torneio e resultados.
- `src/app/shared/`: componentes reutilizáveis de apresentação e formulários.

Os nomes e caminhos finais podem ser ajustados à convenção adotada durante a implementação; evitar concentrar toda a lógica no componente raiz.

### 5.2 Modelo de domínio inicial

Criar tipos TypeScript explícitos, com identificadores estáveis e datas ISO:

- `Tournament`: `id`, `name`, `game` (identificador/nome), `createdAt`, `updatedAt`, `status`, `players`, `stages` e `schemaVersion`.
- `Player`: `id`, `displayName`, opcionalmente `gameHandle` e `metadata` extensível para atributos específicos de jogos.
- `Stage`: `id`, `name`, `format` (`swiss` ou `single-elimination`), `status`, `bestOf` (`3` ou `5`), participantes, rodadas e/ou chave.
- `Round`: índice/número, estado e partidas.
- `Match`: `id`, jogadores/slots, estado (`pending`, `in-progress`, `completed`, `bye`), placar, vencedor e timestamps.
- `MatchScore`: vitórias de cada lado, limitadas ao alvo definido por `bestOf`.

Preferir propriedades genéricas e `metadata` tipado/validado para particularidades futuras de jogos, sem codificar termos exclusivos de Clash Royale no núcleo do domínio.

### 5.3 Regras de geração

**Sistema suíço**

- Receber lista de participantes e configuração explícita de rodadas.
- Produzir os pareamentos de uma rodada por vez, considerando pontuação acumulada.
- Evitar revanche quando houver pareamentos válidos alternativos.
- Tratar quantidade ímpar de participantes por meio de bye, conforme regra definida e registrada.
- Atualizar classificação após resultados confirmados.
- Não prometer pareamento oficial de uma federação específica sem uma regra/padrão acordado.

**Eliminação simples**

- Criar chave com tamanho compatível com a próxima potência de 2.
- Definir e documentar como as vagas sem adversário (byes) são distribuídas; não assumir que o sorteio puro determina se haverá cabeças de chave.
- Vencedores avançam para a próxima rodada; resultados devem ser validados antes do avanço.
- Permitir visualizar partidas pendentes e concluídas.

As funções de pareamento, geração de chave, classificação e validação de placar devem ser puras e independentes da interface, para facilitar testes e revisão das regras.

### 5.4 Persistência e sincronização

- Definir uma interface `TournamentRepository` para carregar, salvar, importar, exportar e apagar torneios.
- Implementar inicialmente persistência local do documento JSON versionado no IndexedDB; manter fallback/migração explícita se necessário.
- Validar `schemaVersion` e conteúdo na importação. Rejeitar arquivos inválidos com mensagens acionáveis; não sobrescrever estado existente silenciosamente.
- Oferecer exportação para arquivo `.json` e importação com confirmação antes de substituir dados.
- Usar Signals ou RxJS para estado reativo Angular, conforme o fluxo escolhido.
- Notificar outras abas do mesmo navegador por `BroadcastChannel` (com evento `storage` como fallback, se necessário) e recarregar/atualizar o estado de forma controlada.
- Concorrência entre múltiplos administradores, sincronização em nuvem, login e recuperação de senha não fazem parte do armazenamento local.

### 5.5 Rotas e experiência

Rotas iniciais sugeridas:

- `/` ou `/dashboard`: dashboard do torneio selecionado.
- `/players`: gerenciamento da lista de jogadores.
- `/tournament`: criação/configuração de torneio e etapas.
- `/admin`: painel para atualização de partidas.

Como não há autenticação, a rota `/admin` é apenas separação de interface, não controle de acesso seguro. A interface deve ser responsiva, acessível por teclado, usar rótulos explícitos e estados vazios/erro/carregamento. Adotar Tailwind já instalado sem adicionar dependências não necessárias.

## 6. Fases e tarefas

### Fase 1 — Base do domínio e navegação

- [ ] **T001:** Definir tipos de domínio e estados em `src/app/domain/`.
- [ ] **T002:** Criar funções puras para cálculo de MD3/MD5, validação de placar e escolha de vencedor.
- [ ] **T003:** Configurar rotas standalone para dashboard, jogadores, torneio e administração em `src/app/app.routes.ts`.
- [ ] **T004:** Substituir o conteúdo do scaffold em `src/app/app.html` e `src/app/app.ts` por layout de aplicação e navegação principal.
- [ ] **T005:** Criar testes unitários do domínio em arquivos `*.spec.ts`, cobrindo placares válidos/inválidos, empate não permitido quando a regra não o aceitar e estados de partida.

### Fase 2 — Cadastro e estado local

- [ ] **T006:** Implementar formulário e listagem CRUD de jogadores em `src/app/features/players/`.
- [ ] **T007:** Validar nome obrigatório e impedir identificadores duplicados; manter handle de jogo opcional.
- [ ] **T008:** Criar interface de repositório e adapter IndexedDB com documento JSON versionado em `src/app/core/`.
- [ ] **T009:** Implementar importação/exportação JSON com validação de esquema, confirmação de substituição e mensagens de erro.
- [ ] **T010:** Testar persistência, migração/versões de esquema e importação de dados inválidos.

### Fase 3 — Criação e gestão das chaves

- [ ] **T011:** Criar fluxo para configurar torneio, jogo e participantes selecionados.
- [ ] **T012:** Implementar gerador de rodada suíça com número de rodadas configurável, pontuação e tratamento de bye.
- [ ] **T013:** Implementar gerador de chave de eliminação simples, incluindo vagas e byes.
- [ ] **T014:** Implementar avanço de vencedores e atualização da classificação após confirmação de resultados.
- [ ] **T015:** Adicionar testes de casos limites (quantidade ímpar, poucos participantes, potência de 2, revanche e participantes sem partida).
- [ ] **T016:** Construir páginas de configuração e visualização das chaves em `src/app/features/tournament/`.

### Fase 4 — Administração e dashboard reativo

- [ ] **T017:** Criar painel admin para selecionar partidas, editar placar e confirmar/retificar resultados.
- [ ] **T018:** Aplicar validação do alvo de vitórias conforme MD3/MD5 e impedir avanço baseado em resultado incompleto.
- [ ] **T019:** Criar dashboard público com participantes, etapas, classificação e partidas por estado.
- [ ] **T020:** Ligar telas ao estado reativo compartilhado; garantir atualização imediata dentro da aplicação.
- [ ] **T021:** Implementar sincronização entre abas do mesmo navegador e tratar alterações concorrentes com aviso/recarregamento seguro.
- [ ] **T022:** Testar fluxo de atualização de resultado refletido no dashboard, incluindo persistência após recarga.

### Fase 5 — Robustez e entrega do MVP

- [ ] **T023:** Revisar acessibilidade, responsividade, estados vazios, erros de persistência e confirmação de ações destrutivas.
- [ ] **T024:** Documentar formato JSON exportado e limitações de sincronização local em `README.md`.
- [ ] **T025:** Executar `npm run build` e `npm test`; corrigir falhas introduzidas e registrar limitações remanescentes.
- [ ] **T026:** Fazer teste manual integrado: cadastrar participantes, criar as duas modalidades, lançar partidas MD3/MD5, acompanhar no dashboard, recarregar e exportar/importar o torneio.

### Fora do MVP / possível fase posterior

- Backend/API e armazenamento compartilhado entre usuários/dispositivos.
- Autenticação, autorização de administrador e trilha auditável de alterações.
- Atualização ao vivo em múltiplos clientes pela rede (WebSocket/SSE ou mecanismo equivalente).
- Integração com APIs específicas de jogos, convites, resultados automáticos ou perfis oficiais.
- Regras oficiais de ranking/desempate e operação de múltiplos torneios simultâneos, até serem especificadas.

## 7. Critérios de aceite do MVP

1. O organizador pode cadastrar jogadores e configurar o nome e o jogo do torneio.
2. É possível gerar uma etapa suíça e uma etapa de eliminação simples para a quantidade de participantes suportada, incluindo tratamento explícito de vagas/bye.
3. Partidas podem ser definidas como MD3 ou MD5; o sistema não aceita um placar acima do número necessário de vitórias nem declara vencedor antes disso.
4. Ao confirmar resultado no painel admin, o dashboard aberto na mesma aplicação reflete o resultado e os avanços sem recarga manual.
5. O documento continua disponível após recarregar o navegador; o organizador consegue exportar e importar JSON válido.
6. Um JSON inválido ou de versão não suportada não apaga silenciosamente os dados carregados.
7. As regras de pareamento e classificação aplicadas são visíveis/documentadas, testadas e não apresentadas como regras oficiais sem confirmação.
8. Build e testes unitários passam no ambiente de desenvolvimento.

## 8. Estratégia de testes

- **Domínio unitário:** placar MD3/MD5, vitória, estado de partida, pareamento suíço, bye, pontuação/classificação e geração de chave.
- **Persistência:** leitura/escrita, JSON inválido, versão desconhecida, exportação/importação e atualização entre abas.
- **Componentes:** formulários, mensagens de validação, filtros e estados vazios.
- **Integração funcional:** cadastro → criação da etapa → atualização admin → dashboard → recarga → exportar/importar.
- **Build:** `npm run build` após os incrementos e ao finalizar.
- O projeto já usa Vitest; antes de introduzir framework E2E, confirmar necessidade e compatibilidade com o Angular CLI instalado.

## 9. Requisitos mapeados ao plano

| Requisito | Cobertura principal | Evidência esperada |
|---|---|---|
| REQ-001 | T001, T011, T024 | Modelo genérico de jogo e configuração do torneio |
| REQ-002 | T006, T007 | CRUD e validações de jogadores |
| REQ-003 | T012–T016 | Geradores e páginas para suíço e eliminação simples |
| REQ-004 | T002, T017, T018 | Regras e validações MD3/MD5 |
| REQ-005 | T017, T018, T021 | Fluxo de administração de resultados |
| REQ-006 | T019–T022 | Dashboard reativo e testes de atualização |
| REQ-007 | T008–T010, T024 | Persistência e intercâmbio de JSON |
| REQ-008 | T020–T022 | Estado reativo e sincronização no escopo acordado |
| REQ-009 | T002, T010, T014, T015, T018 | Validação do domínio, importação e progressão |

## 10. Decisões pendentes

Resolver antes de fechar regras e critérios finais da Fase 3:

1. O campeonato começa com uma etapa suíça seguida de eliminação simples? Se sim, quantos jogadores avançam e como se determina o seed? Ou são duas modalidades alternativas/independentes?
2. Quantas rodadas suíças serão usadas? Devem ser fixas ou calculadas? Qual método de pareamento, pontuação, desempate, bye e tratamento de desistência será adotado?
3. Como o sorteio inicial funciona: aleatório puro, seed manual ou ranking/cabeças de chave? Há necessidade de impedir partidas entre jogadores do mesmo grupo/equipe?
4. A lista de jogadores e os torneios devem ser salvos apenas no navegador do organizador, ou admin e dashboard precisam funcionar em dispositivos diferentes e para vários usuários ao mesmo tempo?
5. O painel admin precisa de autenticação/autorização? Se sim, será necessário backend ou serviço de identidade.
6. Em MD3/MD5, basta registrar vitórias por jogador ou também é necessário guardar resultado de cada partida individual (por exemplo, decks, duração, replay ou observações)?
7. O sistema precisa suportar vários torneios salvos, edição de torneio em andamento, cancelamentos e correção de resultado já confirmado?
8. O idioma inicial será português? Deve haver requisitos de identidade visual, hospedagem ou compatibilidade específica?

## 11. Riscos e mitigação

- **Limite frontend-only:** dados locais não são compartilhados entre usuários/dispositivos. Mitigar deixando claro o escopo no MVP e mantendo repositório substituível por API.
- **Ausência de segurança admin:** qualquer pessoa com acesso ao navegador pode alterar o estado local. Não apresentar o frontend como seguro para torneios competitivos remotos.
- **Regras de suíço ambíguas:** pareamentos e desempates podem divergir de expectativas. Confirmar regras antes de tratá-las como definitivas e cobrir com exemplos de teste.
- **Perda/corrupção de dados locais:** IndexedDB pode ser apagado pelo usuário/navegador. Oferecer exportação de backup, validação de importação e avisos para exportar cópia.
- **Alterações simultâneas:** abas podem gravar sobre estado recente. Usar versão/timestamp do documento e detectar conflito antes de substituir dados.
