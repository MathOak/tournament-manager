# Tournament Manager

Aplicação frontend Angular para organizar torneios de diferentes jogos, cadastrar jogadores, gerar etapas suíças ou de eliminação simples e acompanhar partidas MD3/MD5.

## Requisitos

- Node.js compatível com a versão do Angular CLI instalada.
- npm 11 (versão registrada no `package.json`).

## Desenvolvimento

Na raiz do projeto:

- `npm ci` instala as dependências do lockfile.
- `npm start` inicia o servidor Angular, normalmente em `http://localhost:4200`.
- `npm run build` gera o build de produção em `dist/`.
- `npm test` executa os testes unitários via Vitest.

## Fluxo do MVP

1. Em **Jogadores**, cadastre os participantes e, opcionalmente, o nick no jogo.
2. Em **Torneio**, escolha nome, jogo, formato da etapa e MD3 ou MD5. A chave recebe um embaralhamento aleatório dos participantes.
3. Em **Admin**, registre o placar de cada partida. MD3 exige 2 vitórias e MD5 exige 3.
4. Em **Dashboard**, acompanhe as chaves, rodadas e classificação do sistema suíço.
5. Use **Exportar JSON** e **Importar JSON** na página de jogadores para fazer backup ou transferir os dados.

As etapas suíça e eliminatória são independentes nesta primeira versão: não há avanço automático dos classificados de uma para outra. O pareamento suíço evita revanche quando encontra alternativa, atribui 1 ponto por vitória/bye e permite configurar o número de rodadas.

## Persistência e sincronização

Os dados são persistidos localmente no navegador (IndexedDB, com cópia de fallback em localStorage). As telas na mesma aplicação e abas no mesmo navegador recebem atualizações reativas. Importação/exportação usa JSON versionado (`schemaVersion: 1`). Faça backups periódicos: limpar os dados do navegador pode remover o torneio.

O frontend não fornece sincronização entre dispositivos ou usuários e a tela Admin não tem autenticação. Não use esta versão como controle seguro para um torneio remoto/multiusuário. Para isso, será necessário backend com autenticação, autorização e persistência compartilhada.

## Stack

Angular 21 standalone, TypeScript estrito, Angular Router, Signals, Tailwind CSS 4 e Vitest.
