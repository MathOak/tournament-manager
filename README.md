# Tournament Manager

Aplicação frontend Angular para organizar torneios de diferentes jogos, cadastrar jogadores, gerar etapas suíças ou de eliminação simples e acompanhar partidas MD1, MD2, MD3 ou MD5.

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
2. Em **Torneio**, escolha nome, jogo, formato da etapa e modalidade MD1, MD2, MD3 ou MD5. A chave recebe um embaralhamento aleatório dos participantes.
3. Em **Admin**, registre o placar de cada partida. MD1 exige 1 vitória; MD2 e MD3 exigem 2; MD5 exige 3.
4. Em **Dashboard**, acompanhe as chaves, rodadas e classificação do sistema suíço.
5. Use **Exportar JSON** e **Importar JSON** na página de jogadores para fazer backup ou transferir os dados.

### Jogos e placares

- O jogo é selecionado no catálogo antes da criação de uma etapa. Todos os jogos oferecem MD1, MD2, MD3 e MD5; as opções ficam configuradas no catálogo para permitir futuras modalidades.
- Clash Royale registra vitórias por série. EA SPORTS FC (FIFA/EAFC) registra gols por jogo; em séries MD2/MD3/MD5, os gols de cada jogo ficam no histórico e a série termina quando alguém alcança o número de vitórias exigido. Empates em um jogo exigem pênaltis diferentes; pênaltis definem o vencedor daquele jogo, sem alterar os gols.
- No Admin, **Iniciar partida** registra 0–0 como ao vivo. Isso não conta como resultado concluído nem avança uma chave. Torneios locais existentes e JSON schema v1 são migrados ao serem carregados/importados.

### Modo telão e temas

- Abra **Modo telão** no dashboard ou use `/display` para uma visão pública de largura ampla, sem navegação administrativa; o botão permite solicitar tela cheia.
- O tema escuro é padrão. O botão **Claro/Escuro** alterna a preferência, que fica salva neste navegador.
- Partidas em andamento mostram o placar atual da série separado do retrospecto total (séries vencidas e perdidas). O retrospecto conta somente séries concluídas em todas as etapas; byes e séries parciais não são contados.

### Classificação para a eliminatória

Após concluir todas as rodadas suíças, use **Classificar para eliminatória** na configuração do torneio. Selecione o Top N ou ajuste participantes individualmente; escolha seeds pela classificação, sorteados ou em ordem manual. Empates na linha de corte exigem confirmação explícita. A fase suíça permanece intacta e a nova eliminatória guarda sua origem e seeds.

### Pareamento das etapas

- Na criação de etapas suíças ou de eliminação simples, escolha pareamento automático ou montagem manual. No modo manual, revise os confrontos e confirme antes de criar/iniciar a etapa ou rodada; participantes duplicados ou ausentes são bloqueados.
- Na eliminação simples, byes automáticos são resolvidos na primeira rodada; a segunda rodada não recebe bye por falta de feeder. No suíço com número ímpar, o bye vale vitória/ponto, não conta como partida jogada e é rotacionado entre quem ainda não recebeu bye.
- Rodadas suíças manuais só podem ser montadas depois que a rodada anterior estiver concluída. A progressão da eliminatória continua automática após os resultados.

### Atualização de resultados

No Admin, escolha a etapa e rodada. Registre o placar parcial durante uma série ou confirme o resultado final (MD3: 2 vitórias; MD5: 3). Resultados concluídos ficam no histórico recolhido e exigem confirmação para correção, que pode alterar progressão da chave.

As etapas suíça e eliminatória são independentes nesta primeira versão: não há avanço automático dos classificados de uma para outra. O pareamento suíço evita revanche quando encontra alternativa, atribui 1 ponto por vitória/bye e permite configurar o número de rodadas.

## Persistência e sincronização

Os dados são persistidos localmente no navegador (IndexedDB, com cópia de fallback em localStorage). As telas na mesma aplicação e abas no mesmo navegador recebem atualizações reativas. Importação/exportação usa JSON versionado (`schemaVersion: 1`). Faça backups periódicos: limpar os dados do navegador pode remover o torneio.

O frontend não fornece sincronização entre dispositivos ou usuários e a tela Admin não tem autenticação. Não use esta versão como controle seguro para um torneio remoto/multiusuário. Para isso, será necessário backend com autenticação, autorização e persistência compartilhada.

## Stack

Angular 21 standalone, TypeScript estrito, Angular Router, Signals, Tailwind CSS 4 e Vitest.
