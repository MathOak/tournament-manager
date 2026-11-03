# Resumo de contexto do chat — Tournament Manager

**Criado em:** 2026-11-03 17:51 (hora local do ambiente)
**Finalidade:** ponto de partida para próximos chats de desenvolvimento. O código atual é a fonte de verdade; confirme arquivos antes de fazer alterações, pois podem ter sido editados depois deste resumo.

## Projeto e arquitetura

- Aplicação SPA Tournament Manager em Angular 21, componentes standalone, TypeScript estrito e Angular Router.
- Tailwind CSS 4 está importado globalmente; a identidade escura/neon usa tokens CSS em `src/styles.css`.
- Persistência local, sem backend: `TournamentStore` mantém coleção de campeonatos, salva no IndexedDB e usa localStorage como fallback, incluindo migração do documento legado. Importação JSON adiciona um campeonato; exportação é individual.
- Funcionalidades principais: jogadores, configuração de fases suíças e eliminação simples, administração de placares MD3/MD5, dashboard e apresentação de bracket.
- Nenhuma autenticação, API ou sincronização entre dispositivos está implementada.

## Trabalho realizado neste histórico

1. Tema escuro neon aplicado, preservando alternância claro/escuro. Tokens globais e gradientes foram adicionados; implementação em `src/styles.css`.
2. Criada a rota `/brackets`, com seleção de campeonato/chave, tela de apresentação, fullscreen acionado pelo usuário e bracket responsivo com placares, byes, slots futuros e conectores SVG.
3. A coleção local de campeonatos e a migração do armazenamento de documento único foram implementadas em `src/app/core/tournament-store.service.ts`.
4. A chave foi incorporada ao Dashboard e ganhou navegação comum.
5. A escala do bracket foi ajustada para telas grandes/4K; validação visual anterior mediu 3840 × 2160 e 1920 × 1080.
6. Foi implementada refatoração de UI: componentes standalone com CSS co-localizado para layout compartilhado, bracket, Dashboard e elementos genéricos.
7. Cobertura de testes foi ampliada para domínio, store, páginas e novos componentes. O último resultado confirmado após refatoração foi 25 arquivos e 65 testes aprovados; `npm run build` também passou.
8. Playwright está configurado com seis fluxos E2E em `e2e/tournament-flows.spec.ts`. Execução anterior falhou antes dos testes por `spawn EPERM` ao iniciar Chromium, então E2E não está validado neste ambiente.

## Componentes extraídos

- Layout compartilhado: `AppHeaderComponent`, `AppFooterComponent`, `AppToastComponent` em `src/app/shared/layout/`.
- UI transversal: `PageHeadingComponent`, `StatusBadgeComponent`, `EmptyStateComponent` em `src/app/shared/ui/`.
- Bracket: toolbar, resumo do evento, tabs de rodada, coluna, cartão de partida, conectores e legenda em `src/app/features/brackets/components/`.
- Dashboard: hero, métricas, cartões de partidas ao vivo/próximas e overview de etapa em `src/app/features/dashboard/components/`.
- Plano e registro da refatoração: `docs/plano-refatoracao-componentes-ui.md`.

## Estado observado mais recente da navegação e Header

- A rota `/brackets` em `src/app/app.routes.ts` não usa `data: { displayMode: true }`.
- `App.isPresentationRoute()` em `src/app/app.ts` foi editado recentemente para testar apenas `/display`; a antiga condição para `/brackets` está comentada.
- O shell em `src/app/app.html` renderiza `<app-header>` e `<app-footer>` quando `displayMode()` é falso. Assim, `/brackets` deve receber o Header do shell.
- Dentro de `BracketDisplayComponent`, o Header adicional continua comentado no ramo `!embedded` de `src/app/features/brackets/bracket-display.component.html`; não o descomente sem avaliar duplicação com o shell.
- Verifique o `src/app/app.ts` atual antes de concluir comportamento: houve uma edição manual recente nesta condição.

## Testes e comandos

- `npm test`: testes unitários/componentes com Vitest via Angular CLI, em modo sem watch.
- `npm run build`: build Angular de produção.
- `npm run test:e2e`: Playwright E2E; `npm run test:e2e:install` instala Chromium.
- Última validação confirmada no chat: build passou e 25 arquivos/65 testes passaram. E2E permanece pendente de ambiente que permita iniciar Chromium.

## Documentação do repositório

- Plano de implementação de torneios: `docs/plano-implementacao-torneios.md`.
- Plano UX Dashboard/Admin: `docs/plano-ux-dashboard-admin.md`.
- Plano da chave em tela cheia: `docs/plano-implementacao-bracket-telao.md`.
- Plano de refatoração: `docs/plano-refatoracao-componentes-ui.md`.
- Plano de cobertura de testes: `docs/plano-testes-cobertura-integral.md`.
- Plano de tema neon: `docs/plano-acao-tema-neon.md`.

## Recomendações para continuidade

1. Ler esta nota e, se necessário, o plano específico em `docs/` relacionado à tarefa; confirmar o estado atual do código antes de alterar.
2. Preservar a arquitetura standalone e TypeScript estrito; manter CSS de componentes junto dos componentes e tokens compartilhados em `src/styles.css`.
3. Executar `npm test` e `npm run build` após mudanças relevantes. Executar E2E quando o ambiente suportar o Chromium.
4. Não assumir suporte remoto/multiusuário: o estado do torneio é local ao navegador.
