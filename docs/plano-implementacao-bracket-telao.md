# Plano de implementação — seletor de campeonato e chave em tela cheia

**Status:** implementado em 2026-11-03.

## 1. Objetivo

Criar uma página dedicada para exibir somente as chaves de colocação dos participantes, permitindo selecionar o campeonato e visualizar a chave eliminatória com layout inspirado na imagem enviada. A visualização deve ocupar a tela, funcionar em telão/desktop e continuar navegável em telas menores.

A referência visual apresenta uma chave de eliminação simples em colunas por rodada, cartões compactos de partidas, placares destacados, byes, linhas conectando partidas, seletor/abas para navegar pelas fases e um cabeçalho enxuto.

## 2. Levantamento do projeto

- A aplicação possui uma rota `/display` que reaproveita o dashboard, mas ainda exibe partidas ao vivo/próximas, estatísticas e classificação além das chaves. Não é uma página exclusiva de bracket.
- O modo display já esconde a barra principal e dispõe de um botão para solicitar tela cheia via Fullscreen API; o navegador exige ação explícita do usuário e pode negar a solicitação.
- O modelo `Tournament` contém etapas (`Stage`), rodadas (`Round`) e partidas (`Match`). Etapas de eliminação simples têm as partidas e os participantes/slots necessários para desenhar o bracket, incluindo byes e vencedores.
- A implementação atual do bracket (`.bracket-grid`) é uma lista horizontal de rodadas e cartões, sem conectores visuais, distribuição vertical alinhada ou tratamento gráfico dedicado para jogos futuros.
- O projeto mantém somente um torneio ativo no `TournamentStore` (`active-tournament` no IndexedDB e uma chave de fallback local). Importar JSON substitui o torneio ativo. Portanto, um seletor com vários campeonatos exige antes definir/implementar coleção e persistência de torneios, não apenas um `<select>` visual.
- Existe um JSON de exemplo em `public/gameHistory/`, mas o código não o carrega automaticamente como torneio disponível. Não presumir que esse arquivo represente uma coleção ou histórico oficial.
- O modelo atual suporta etapa suíça e eliminação simples. Para a visualização de colocação em formato de bracket, mostrar somente etapas de eliminação simples; não transformar a classificação suíça em chave sem regra explícita.

## 3. Decisões de produto recomendadas

1. Criar uma rota própria `/brackets` ou `/display/brackets`, independente do dashboard. Recomendação: `/brackets`, com nome “Chaves” na navegação administrativa e experiência pública limpa ao abrir a rota.
2. A página deve mostrar o nome do campeonato selecionado, seu jogo e somente as chaves eliminatórias; remover da página os cards de partidas ao vivo, estatísticas, classificação suíça e controles administrativos.
3. O seletor lista torneios persistidos no navegador. Como o sistema hoje só tem um torneio ativo, suportar múltiplos torneios locais passa a ser um pré-requisito; se a decisão de produto for não suportar múltiplos torneios salvos, o seletor deve listar as etapas eliminatórias dentro do torneio ativo e ser nomeado de acordo, sem fingir selecionar torneios diferentes.
4. Se um campeonato contiver mais de uma etapa eliminatória, oferecer também seleção de etapa/chave. A seleção de rodada serve para navegar/realçar a coluna e não deve remover as demais rodadas da visão de telão.
5. A rota usa layout de tela cheia, ocupando `100dvh`/largura disponível sem cabeçalho global da aplicação. A entrada em fullscreen do navegador será iniciada por botão “Tela cheia”, pois browsers não permitem forçá-la sem gesto do usuário; se recusada ou não suportada, a página continua em layout expandido normal.
6. Preservar tema neon atual e sua alternância. No modo de projeção, reduzir elementos de controle ao essencial; disponibilizar “Sair da tela cheia”/“Voltar” e uma forma de escolher outro campeonato sem cobrir a chave.

## 4. Fases e tarefas

### Fase A — Modelo de vários campeonatos e persistência

**Arquivos principais:** `src/app/domain/tournament.model.ts`, `src/app/core/tournament-store.service.ts`, `src/app/features/tournament/` e testes associados.

- **A1.** Confirmar a semântica de “selecionar campeonato”: vários torneios salvos no mesmo navegador ou etapas/chaves do torneio ativo. Adotar a recomendação de vários torneios locais caso não haja outra indicação.
- **A2.** Definir um `TournamentRepository`/store de coleção que liste, carregue, crie, atualize, selecione e arquive/exclua torneios sem sobrescrever outro torneio.
- **A3.** Revisar IndexedDB: armazenar documentos por `tournament.id` e manter um identificador separado para o torneio atualmente selecionado. Definir fallback local e política de sincronização entre abas para seleção/alteração de torneio.
- **A4.** Manter compatibilidade com o documento v1 atual: migrar o torneio único persistido para a coleção sem perda de dados; manter importação de um JSON v1 como novo torneio ou pedir confirmação de substituição somente quando o usuário explicitamente escolher essa ação.
- **A5.** Manter exportação individual em JSON e validar identificadores únicos. Não alterar regras de partidas, pontuação ou classificação.
- **A6.** Criar testes de migração do armazenamento antigo, seleção, criação, importação, exclusão/arquivamento e persistência entre recargas/abas.

### Fase B — Rota e fluxo do seletor

**Arquivos principais:** `src/app/app.routes.ts`, `src/app/app.ts`, `src/app/app.html`, novo componente da feature de brackets e testes.

- **B1.** Criar rota dedicada de brackets, com metadado para o shell ocultar navegação/rodapé e aplicar layout de telão.
- **B2.** Adicionar entrada “Chaves” na navegação normal, sem substituir o dashboard público existente.
- **B3.** No topo da nova página, apresentar seletor acessível de campeonato com nome e, quando útil, jogo. Ao selecionar, carregar somente aquele documento da coleção.
- **B4.** Listar apenas etapas `single-elimination`. Se não houver chave eliminatória, mostrar estado vazio contextual com atalho de retorno à gestão do torneio; não fabricar bracket a partir de suíço.
- **B5.** Se existirem múltiplas chaves eliminatórias no campeonato, disponibilizar seletor de chave/etapa. Mostrar nome da etapa e formato MD3/MD5 no contexto.
- **B6.** Manter controle para tema claro/escuro, navegação de retorno e botão de fullscreen. O modo fullscreen precisa respeitar permissões e falhas da API.

### Fase C — Atualização do componente de bracket

**Alvos principais:** `src/app/features/dashboard/dashboard.component.html`, estilos globais e/ou novo componente independente de bracket. Recomendação: extrair componente reutilizável para não acoplar o layout de telão ao dashboard.

- **C1.** Renderizar uma coluna para cada rodada da chave e cartões para cada partida, preservando a sequência do modelo (`round.number`) e mostrando rótulos como Oitavas, Quartas, Semifinal e Final quando o tamanho da chave permitir; manter “Rodada N” como fallback genérico.
- **C2.** Alinhar verticalmente partidas e seus jogos alimentadores: a partida da rodada seguinte ocupa o centro vertical dos dois confrontos que a alimentam. Usar geometria baseada em CSS Grid/flex e/ou SVG para conectores; evitar calcular coordenadas frágeis em pixels fixos.
- **C3.** Desenhar conectores entre partidas relacionadas, sem cobrir cartões ou capturar cliques; dar suporte a viewport com rolagem horizontal quando a chave exceder a largura.
- **C4.** Cada cartão mostra dois participantes/slots, placar da série, vencedor visualmente destacado, estado e bye. Para slots futuros, apresentar “Vencedor de [rodada/confronto]” em vez de um espaço em branco, se for possível derivar o alimentador pela posição dos jogos.
- **C5.** Nomes longos devem truncar com acesso ao nome completo por tooltip/atributo acessível; manter hierarquia, tamanhos e contraste legíveis a distância.
- **C6.** Exibir todas as rodadas simultaneamente no telão, como na referência; controles de abas/segmentos podem navegar até uma rodada, rolar ou destacar a fase, mas não ocultar o contexto global da chave.
- **C7.** Adaptar chave ao celular: rolagem controlada ou visualização por rodada com botões anterior/próxima; nunca deixar a navegação por teclado bloqueada em overflow horizontal.

### Fase D — Fullscreen e responsividade do telão

- **D1.** Usar altura de viewport dinâmica (`100dvh`) e largura total, com cabeçalho compacto, seletor e área de chave ocupando o espaço restante.
- **D2.** Ação explícita “Entrar em tela cheia” chama `requestFullscreen()`; ouvir `fullscreenchange` para atualizar rótulo/estado e permitir sair via botão ou tecla Esc nativa.
- **D3.** Tratar navegador sem Fullscreen API, rejeição de Promise e modo embutido, apresentando aviso discreto e mantendo o layout expansivo sem exceção não tratada.
- **D4.** Considerar ocultar controles após um período apenas se houver requisito futuro; na primeira versão, manter uma forma visível e acessível de trocar campeonato/sair.
- **D5.** Usar cores/status já definidos no tema: vencedor, pendente, ao vivo e bye devem ter rótulo/indicador além da cor. Evitar animações piscantes em tela de evento e respeitar `prefers-reduced-motion`.

### Fase E — Testes e validação visual

- **E1.** Testes unitários/componentes para o seletor, filtragem de etapas eliminatórias, nomeação genérica de rodadas, slots futuros, byes, vencedores e placares.
- **E2.** Testes de coleção e migração de persistência de um torneio ativo para vários torneios.
- **E3.** Validar Fullscreen API em sucesso, indisponibilidade e rejeição, sem travar a navegação.
- **E4.** Revisar layouts com chave pequena, 8, 14 e 16 participantes; casos com byes, resultados parciais, chave ainda pendente e final concluída.
- **E5.** Inspecionar visualmente em resolução de telão/desktop e viewport móvel; conferir fullscreen, rolagem, foco, contraste e controles.
- **E6.** Executar `npm run build` e `npm test`; fazer fluxo manual de criar/importar dois campeonatos, alternar entre eles e confirmar que cada bracket permanece associado ao campeonato certo.

## 5. Critérios de aceite

1. Existe uma página/aba “Chaves” que abre uma apresentação dedicada, sem conteúdo do dashboard que não seja necessário para ler o bracket.
2. O organizador consegue selecionar um campeonato diferente entre os disponíveis localmente, sem que selecionar ou importar um sobrescreva silenciosamente os demais.
3. A tela apresenta somente suas etapas eliminatórias e permite escolher a chave quando houver mais de uma.
4. A chave exibe as rodadas em colunas conectadas, participantes, placares, byes, vencedores e jogos futuros com hierarquia visual inspirada na referência.
5. A visão de telão mostra o contexto completo da chave; navegação por abas/rodadas não esconde permanentemente os outros confrontos.
6. O botão fullscreen pede permissão via ação do usuário, reflete o estado real, responde ao Esc e tem fallback gracioso.
7. O layout continua utilizável em telas pequenas, preserva acessibilidade e não depende exclusivamente de cor.
8. Dados existentes no formato v1 continuam carregáveis após a mudança de persistência.
9. Build e testes passam; os fluxos de alternar campeonatos e visualizar chaves foram verificados.

## 6. Riscos e decisões pendentes

- **“Campeonato” pode significar etapa ou torneio completo.** A arquitetura atual permite apenas um torneio ativo e múltiplas etapas. A implementação precisa confirmar ou adotar a proposta deste plano: coleção de campeonatos locais com seleção individual.
- **Reestruturação da persistência:** migrar do registro único para coleção exige migração e cobertura de import/export. Fazer isso antes da UI do seletor.
- **Representação das fases:** imagem mostra rodadas de uma chave de eliminação simples. Chaves suíças são tabela de classificação/pareamentos, não bracket; devem permanecer fora dessa página até haver desenho de produto específico.
- **Entrar em fullscreen automaticamente:** navegadores bloqueiam fullscreen não solicitado por gesto do usuário. “Página em tela cheia” será o layout dedicado mais um botão para ativar fullscreen real.
- **Conectores e responsividade:** geometria de bracket pode ficar ilegível em celular. Manter um modo de navegação por rodada no viewport estreito, preservando a visão completa em desktop/telão.
- **JSON de torneio público existente:** confirmar se deve ser importado/seedado como exemplo ou continuar apenas como arquivo estático; o plano não o inclui automaticamente na coleção.

## 7. Implementação registrada

- Criada a rota `/brackets` com shell de apresentação sem navegação global e link “Chaves” na navegação padrão.
- A tela tem seletor de campeonatos locais, botão para criar campeonato, seletor condicional de chave eliminatória, alternância de tema e controle de fullscreen com tratamento de recusa/indisponibilidade. Importações passam a ser adicionadas como campeonatos separados.
- O store mantém uma coleção local no IndexedDB e fallback, persiste seleção e migra o documento legado ativo para coleção. A gravação limpa chaves obsoletas para que torneios removidos não reapareçam.
- O bracket agora desenha rodadas em colunas, resultados/byes/slots futuros e conectores SVG; a altura dos cartões se ajusta ao viewport e o conteúdo da chave fica em área rolável dentro da tela fixa. Em telas estreitas, a navegação por rodada permanece disponível.
- Ajuste posterior para telas grandes: colunas e conectores agora distribuem a largura do viewport; cartões, espaçamento e tipografia crescem com a altura/largura disponível, sem manter a chave limitada a um canvas de largura fixa. Na inspeção a 3840 × 2160, as quatro rodadas ocuparam a largura disponível sem rolagem horizontal, com cartões de 176 px e texto de 24 px; em 1920 × 1080 também couberam sem rolagem horizontal.
- Criados testes de componente para rodadas, conectores, vencedores, resultados e byes.
- A interface foi inspecionada visualmente em `/brackets` com o JSON de exemplo importado; o seletor mostrou múltiplos campeonatos e o bracket foi renderizado. Build reportado como concluído e testes em modo watch terminaram sem erros após correção do caso de teste do BYE.
