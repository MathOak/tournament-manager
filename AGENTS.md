# Contexto técnico do projeto

## Visão geral

- **Nome:** Tournament Manager (`tournament-manager`).
- **Tipo:** aplicação web Angular standalone no navegador, configurada como SPA.
- **Estado atual:** gerenciamento local de campeonatos, participantes, etapas suíças/eliminatórias, resultados MD3/MD5, Admin, Dashboard e apresentação de bracket.
- **Persistência:** IndexedDB com fallback localStorage, coleção de torneios e import/export JSON. Não há backend, autenticação nem sincronização entre dispositivos.

## Histórico de contexto para agentes

- Antes de começar uma tarefa, consulte o resumo mais recente em `history/` (ordenado pelo caminho/nome com data-hora `YYYY-MM-DD/HH-mm-resumo-chat.md`) para conhecer decisões e alterações recentes feitas em conversas.
- No momento desta atualização, o resumo é `history/2026-11-04/11-50-resumo-chat.md`.
- O histórico é contexto auxiliar: confirme sempre o código/documentos atuais antes de editar. Em caso de divergência, o estado atual do repositório prevalece.

## Stack e configuração

- Angular **21.2.x**, com componentes standalone e bootstrap via `bootstrapApplication`.
- TypeScript **5.9.x**, com verificações estritas habilitadas (`strict` e `strictTemplates`, entre outras).
- Navegação via Angular Router; rotas atuais incluem `/`, `/display`, `/brackets`, `/players`, `/tournament` e `/admin`.
- Estado reativo disponível via Angular Signals e `TournamentStore`.
- Estilos globais importam Tailwind CSS **4.1.x** e definem tokens de tema. Componentes compartilhados e vários componentes de feature têm CSS co-localizado.
- Gerenciador de pacotes: npm; o repositório contém `package-lock.json`.
- Testes unitários/componentes: Vitest integrado ao Angular CLI. Última validação registrada: 25 arquivos e 65 testes aprovados.
- E2E: Playwright configurado em `playwright.config.ts`, com specs em `e2e/`. Em ambiente anterior, Chromium falhou ao iniciar (`spawn EPERM`); não declarar E2E aprovados sem executar com sucesso.

## Estrutura relevante

- `src/main.ts`: ponto de entrada e bootstrap da aplicação.
- `src/app/app.ts`, `app.html`, `app.css`: shell, modo de apresentação, tema, Header/Footer/Toast compartilhados e `router-outlet`.
- `src/app/app.routes.ts`: rotas da aplicação.
- `src/app/core/tournament-store.service.ts`: estado, coleção de torneios, persistência local e import/export.
- `src/app/domain/`: modelo e regras puras para torneios, etapas, rodadas, partidas, classificação e resultados.
- `src/app/shared/layout/`: Header, Footer e Toast.
- `src/app/shared/ui/`: PageHeading, StatusBadge e EmptyState.
- `src/app/features/`: páginas e componentes locais de Admin, Brackets, Dashboard, Players e Tournament.
- `src/styles.css`: tokens, reset, estilos globais e estilos ainda compartilhados entre features.
- `docs/`: planos e decisões do produto; `history/`: resumos datados de contexto de conversas.
- `public/`: arquivos estáticos servidos pela aplicação.

## Comandos de desenvolvimento

Execute na raiz do projeto:

- `npm ci`: instalar dependências conforme o lockfile.
- `npm start`: iniciar o servidor de desenvolvimento Angular (normalmente em `http://localhost:4200`).
- `npm run build`: gerar o build de produção em `dist/`.
- `npm test`: executar testes unitários/componentes uma vez via Angular CLI/Vitest.
- `npm run test:e2e`: executar E2E Playwright (requer browser instalado).
- `npm run test:e2e:install`: instalar Chromium do Playwright.

## Orientações para agentes

1. Antes de implementar uma funcionalidade, confira o código e a configuração existentes; diferencie claramente comportamento já implementado de requisitos ainda não definidos.
2. Preserve a arquitetura standalone do Angular e o TypeScript estrito. Declare imports necessários nos próprios componentes standalone.
3. Use Angular Router para novas páginas e Signals quando apropriado para estado local reativo. Não introduza bibliotecas ou serviços externos sem necessidade e sem verificar compatibilidade com Angular 21.
4. Não invente contratos de API, regras de torneio, persistência ou autenticação. Se forem necessários e não estiverem especificados, peça esclarecimento ou proponha uma solução local explicitamente identificada como provisória.
5. Ao alterar comportamento, atualize ou adicione testes em `src/**/*.spec.ts`. Verifique build e testes quando o ambiente permitir.
6. Mantenha a interface acessível e responsiva; use tokens CSS e CSS co-localizado dos componentes, evitando duplicações globais.
7. Preserve a arquitetura de componentes standalone e passe dados/eventos explícitos para componentes de apresentação; não acople subcomponentes diretamente ao store sem necessidade.

## Limites do levantamento

Este documento e os resumos em `history/` são auxiliares e podem ficar desatualizados. Requisitos de regras competitivas não definidos devem ser confirmados ou explicitamente tratados como provisórios; não invente regras oficiais.
