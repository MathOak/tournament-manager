# Contexto técnico do projeto

## Visão geral

- **Nome:** Tournament Manager (`tournament-manager`).
- **Tipo:** aplicação web Angular no navegador, configurada como SPA.
- **Estado atual:** scaffold inicial do Angular CLI; ainda não há funcionalidades de gerenciamento de torneios implementadas.
- **Backend e persistência:** não identificados no projeto. Não presumir API, banco de dados, autenticação ou armazenamento persistente.

## Stack e configuração

- Angular **21.2.x**, com componentes standalone e bootstrap via `bootstrapApplication`.
- TypeScript **5.9.x**, com verificações estritas habilitadas (`strict` e `strictTemplates`, entre outras).
- Navegação via Angular Router; a configuração existe, mas a lista de rotas está vazia.
- Estado reativo disponível via Angular Signals; o componente raiz atualmente usa um signal apenas para o título.
- Estilos: CSS global importa Tailwind CSS **4.1.x**. O arquivo de estilo do componente raiz está vazio; o template inicial contém estilos inline do scaffold.
- Gerenciador de pacotes: npm; o repositório contém `package-lock.json`.
- Testes unitários: Vitest integrado ao Angular CLI.

## Estrutura relevante

- `src/main.ts`: ponto de entrada e bootstrap da aplicação.
- `src/app/app.ts`: componente raiz standalone.
- `src/app/app.html`: template raiz atual, ainda com a tela de boas-vindas padrão do Angular.
- `src/app/app.css`: estilos do componente raiz (atualmente vazio).
- `src/app/app.config.ts`: provedores globais e configuração do Router.
- `src/app/app.routes.ts`: rotas (atualmente vazias).
- `src/app/app.spec.ts`: testes unitários iniciais do componente raiz.
- `src/styles.css`: estilos globais e importação de Tailwind.
- `public/`: arquivos estáticos servidos pela aplicação.

## Comandos de desenvolvimento

Execute na raiz do projeto:

- `npm ci`: instalar dependências conforme o lockfile.
- `npm start`: iniciar o servidor de desenvolvimento Angular (normalmente em `http://localhost:4200`).
- `npm run build`: gerar o build de produção em `dist/`.
- `npm test`: executar os testes unitários configurados pelo Angular CLI/Vitest.

## Orientações para agentes

1. Antes de implementar uma funcionalidade, confira o código e a configuração existentes; diferencie claramente comportamento já implementado de requisitos ainda não definidos.
2. Preserve a arquitetura standalone do Angular e o TypeScript estrito. Declare imports necessários nos próprios componentes standalone.
3. Use Angular Router para novas páginas e Signals quando apropriado para estado local reativo. Não introduza bibliotecas ou serviços externos sem necessidade e sem verificar compatibilidade com Angular 21.
4. Não invente contratos de API, regras de torneio, persistência ou autenticação. Se forem necessários e não estiverem especificados, peça esclarecimento ou proponha uma solução local explicitamente identificada como provisória.
5. Ao alterar comportamento, atualize ou adicione testes em `src/**/*.spec.ts`. Verifique build e testes quando o ambiente permitir.
6. Mantenha a interface acessível e responsiva; aproveite Tailwind já instalado ou os estilos CSS existentes, evitando duplicar definições globais.

## Limites do levantamento

Este documento descreve o que foi observado nos arquivos de configuração e no código-fonte disponível. Requisitos funcionais, fluxos de usuário, modelo de dados, regras de competição e decisões de implantação ainda não estão documentados.
