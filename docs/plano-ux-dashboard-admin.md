# Plano de UX — Dashboard de telão e administração

**Status:** proposta para revisão, ainda não implementada.

## 1. Direção definida com o usuário

- O dashboard é prioritariamente para espectadores e será exibido em uma TV/telão grande.
- Dar destaque a partidas em andamento, classificação suíça e chave eliminatória.
- Exibir para cada jogador o retrospecto agregado de vitórias e derrotas no torneio e, em partidas ao vivo, o placar de jogos da série MD3/MD5.
- A fase suíça e a eliminatória continuam separadas. O organizador escolhe quando iniciar a eliminatória e pode selecionar os classificados do suíço ou gerar/ajustar seeds.
- Tema escuro como padrão, com controle explícito para alternar para o tema claro.
- Simplificar o Admin para tornar o lançamento de resultados rápido e reduzir erros.
- Suportar bem TV/telão, desktop, tablet e celular.
- Referência estética: e-sports/Clash Royale, sem referência visual específica fornecida.

## 2. Princípios de UX

1. **Uma hierarquia distinta por público:** dashboard de leitura à distância; admin orientado a tarefas e formulários; configuração de torneio com passos claros.
2. **Priorizar estado e ação:** status ao vivo, rodada e placar no início do dashboard; controles de lançamento e confirmação no Admin.
3. **Legibilidade em distância:** fonte grande, alto contraste, poucos detalhes pequenos, espaços generosos e cartões consistentes. Não depender apenas de cor para indicar vitória/estado.
4. **Previsibilidade:** manter etapa suíça e eliminatória identificáveis e independentes; criar a eliminatória somente após confirmação explícita dos classificados/seeds.
5. **Acessibilidade:** navegação por teclado, foco visível, rótulos descritivos, mensagens de validação e alternativas aos gestos de arrastar e soltar.
6. **Persistência transparente:** indicar que o MVP usa dados locais do navegador e que atualização entre dispositivos não está disponível.

## 3. Dashboard público / modo telão

### Hierarquia recomendada

1. Cabeçalho compacto com nome do torneio, jogo, etapa/rodada atual, status de atualização e controle de tema.
2. Faixa de partidas ao vivo em primeiro plano. Se não houver partidas em andamento, mostrar próximas partidas pendentes; se não houver, mostrar resultados recentes.
3. Resumo conciso: jogadores inscritos, partidas concluídas e etapa atual.
4. Área principal por formato:
   - **Suíço:** tabela de classificação com posição, jogador, retrospecto agregado de vitórias-derrotas, pontos e situação da rodada.
   - **Eliminação simples:** chave legível em desktop/telão, com vencedores e partidas pendentes; em celular, converter as rodadas em painéis/accordion ou lista ordenada, evitando uma chave horizontal impossível de ler.
5. Indicadores de atualização e vazio/erro discretos, sem cobrir placares.

### Partida ao vivo

Cada cartão deverá privilegiar:

- nomes dos dois jogadores;
- placar de jogos da série atual, por exemplo `1–0` em MD3;
- rótulo MD3 ou MD5;
- rodada e estado (ao vivo, pendente, encerrada);
- destaque visual não dependente somente de cor para o jogador à frente/vencedor.

Para o retrospecto agregado, mostrar vitórias-derrotas no torneio, calculadas sobre séries finalizadas de todas as etapas selecionadas do torneio. A série MD3/MD5 permanece um placar separado do retrospecto agregado. Não contar uma série em andamento como vitória ou derrota até sua confirmação.

### Layout responsivo

- **TV/telão:** modo de visualização de largura ampla, tipografia escalável, placares dominantes e duas áreas simultâneas quando houver espaço. Opção de tela cheia pode ser adicionada sem esconder comandos de saída/tema.
- **Desktop/tablet:** layout em colunas com partidas ao vivo e classificação visíveis sem rolagem excessiva; chave acessível abaixo ou em aba de formato.
- **Celular:** uma coluna, partidas ao vivo no topo, tabela simplificada com rolagem controlada e chave em lista por rodadas.

Recomendação: adicionar rota pública opcional `/display` ou alternância “Modo telão” no dashboard. A decisão de rota evita a navegação administrativa aparecer em projeção e permite um layout limpo; deve continuar sendo a mesma fonte de estado local.

## 4. Tema escuro e claro

- Tema escuro como padrão inicial para a experiência de telão; oferecer botão acessível para tema claro/escuro.
- Definir tokens CSS para fundo, superfícies, texto, texto secundário, bordas, acento, sucesso, alerta e erro; os componentes não devem codificar cores individuais fora dos tokens sem necessidade.
- Aplicar tema de forma consistente a Dashboard, Admin e configuração.
- Persistir preferência localmente, sem alterá-la durante importação do JSON do torneio.
- Garantir contraste de texto e estados de foco nos dois temas; suportar `prefers-reduced-motion` e evitar animações piscantes em ambiente de evento.

## 5. Promoção de suíço para eliminatória

A eliminatória é uma nova etapa derivada dos participantes selecionados, nunca uma conversão destrutiva da etapa suíça.

### Fluxo recomendado

1. O suíço precisa ter resultados suficientes para gerar uma classificação atual.
2. No gerenciamento de torneio, escolher **Criar eliminatória a partir do suíço**.
3. Selecionar participantes classificados com opção rápida “Top N” e seleção/remoção manual de jogadores.
4. Escolher MD3/MD5 para a nova etapa.
5. Selecionar seed:
   - **Usar classificação:** seeds seguem a classificação suíça exibida;
   - **Sortear seeds:** participantes selecionados são embaralhados;
   - **Ajustar manualmente:** reordenar seeds com controles acessíveis de subir/descer ou seleção numérica, não apenas drag-and-drop.
6. Mostrar prévia da primeira rodada e pedir confirmação antes de salvar.
7. Guardar na etapa eliminatória a origem da classificação e a ordem de seeds, para transparência e exportação JSON.

A primeira versão não deve escolher automaticamente quantos avançam nem impor desempates não confirmados. Se houver empate no corte do Top N, sinalizar e solicitar decisão/ordem manual do organizador antes de gerar a chave. Depois de criada, a eliminatória não acompanha alterações subsequentes do suíço automaticamente; avisar isso no fluxo.

## 6. Simplificação do painel Admin

### Objetivos

- Encontrar rapidamente a partida que precisa de atualização.
- Lançar placar com poucos passos e entender erros sem ambiguidade.
- Evitar exibir todas as rodadas antigas com igual peso.

### Ajustes recomendados

- Cabeçalho com etapa selecionada, filtro de formato, rodada atual e contadores “pendentes / ao vivo / concluídas”.
- Mostrar primeiro partidas pendentes e em andamento; concluídas ficam recolhidas por padrão, mas podem ser abertas para correção explícita.
- Filtro por etapa e rodada, com ação para localizar partida/jogador.
- Formulário de placar compacto, com alvo MD3=2 ou MD5=3 visível e validação junto aos campos.
- Botão claro “Confirmar resultado”; confirmação bem-sucedida indica vencedor e atualização do dashboard.
- Correção de resultado concluído exige ação deliberada e aviso de que pode alterar progressão da chave; recalcular slots posteriores com segurança.
- Navegação por teclado entre partidas; controles com rótulos incluindo nomes dos jogadores.
- Como alternativa para eventos, permitir atualizar o placar da série sem finalizar até o organizador confirmar explicitamente o vencedor.

## 7. Lacunas da implementação atual a endereçar

- `calculateStandings()` calcula pontos/partidas apenas por etapa e não fornece retrospecto agregado de vitórias/derrotas.
- O modelo de partida guarda resultado da série (ex.: 2–1), não eventos individuais das partidas que compõem a MD3/MD5. Para o pedido atual, isso é suficiente para mostrar o placar da série, mas não para guardar duração, replay ou histórico por jogo.
- A tela atual do Admin lista todas as rodadas, sem foco/prioridade para partidas pendentes.
- A criação de etapa embaralha participantes e não oferece origem/ordem de seed.
- A chave eliminatória é desenhada como lista de partidas, não como bracket gráfico otimizado para telão.
- O tema atual é claro e estilos usam cores fixas, então será necessário estabelecer tokens compartilhados antes do tema alternável.
- O dashboard não deve indicar atualização remota/global: no MVP os dados são locais, compartilhados entre abas do mesmo navegador.

## 8. Fases de implementação sugeridas

### Fase A — Modelo e cálculos

- Adicionar origem/seed de etapa e vínculo opcional à etapa suíça de origem.
- Criar funções testadas para retrospecto agregado por jogador, placar de série em andamento e classificação.
- Definir escopo do agregado (todas as etapas do torneio, com cada série concluída contada uma vez) e estados/byes que não contam como partida jogada.
- Validar atualização/correção de resultado sem deixar partidas dependentes inválidas.

### Fase B — Sistema visual e temas

- Refatorar as cores globais para tokens CSS e introduzir tema escuro padrão e tema claro alternável.
- Implementar controle de tema no shell e persistência local da preferência.
- Aplicar e testar os temas em cada rota, inclusive estados vazios, formulários, tabelas e foco acessível.

### Fase C — Dashboard de espectadores

- Reordenar a hierarquia do dashboard com partidas ao vivo/próximas em destaque.
- Adicionar retrospecto vitórias-derrotas e placar de série MD3/MD5 sem misturar as métricas.
- Criar visualização de chave por rodada responsiva e layout para TV/telão.
- Definir se modo telão será uma rota separada e implementar atualização visual da tela sem recarga.

### Fase D — Fluxo de classificação e seeds

- Criar o fluxo de seleção Top N e seleção manual a partir da classificação suíça.
- Adicionar seleção de MD e três opções de seed (classificação, sorteio, manual).
- Mostrar prévia, conflitos de desempate e confirmação antes de criar a eliminatória.
- Cobrir persistência e exportação JSON dos dados de origem/seeds.

### Fase E — Admin simplificado e validação final

- Filtrar e priorizar partidas abertas; agrupar concluídas recolhidas.
- Simplificar entrada de placar e mensagens; separar salvar placar de confirmar resultado quando aplicável.
- Adicionar proteção a correções com impacto em chave e foco por teclado.
- Testar por tamanhos: celular, desktop e TV/telão; validar os fluxos principais com testes unitários e integração.

## 9. Critérios de aceite visual/funcional

1. Em TV/telão, partidas ao vivo e seus placares são a informação mais proeminente, legíveis à distância.
2. Cada jogador mostra retrospecto agregado do torneio sem confundi-lo com o placar da série em andamento.
3. O usuário alterna tema escuro/claro; escolha persiste após recarregar e as páginas mantêm contraste/foco adequados.
4. Dashboard adapta tabela/chave sem overflow horizontal incontrolável no celular.
5. O organizador cria a eliminatória a partir de participantes do suíço sem perder a etapa original, pode usar Top N, seleção manual e selecionar método/ordem de seed.
6. Empates no corte de classificação ou critérios não definidos são apresentados para decisão, não resolvidos por regra implícita.
7. O Admin apresenta partidas que precisam de ação primeiro; confirmar ou corrigir resultado é explícito e valida MD3/MD5.
8. Quando disponível, o estado local alterado pelo Admin reflete-se no dashboard aberto sem refresh manual; limites de sincronização local ficam visíveis na documentação.
9. Testes cobrem cálculos agregados, qualificação/seeds, placares MD3/MD5, alteração de resultados e persistência do tema.

## 10. Decisões para confirmar antes da implementação

1. **Requisito de retrospecto:** a contagem de vitórias/derrotas deve incluir todas as partidas/séries finalizadas nas etapas do torneio, inclusive a eliminatória, ou apenas a fase suíça? A recomendação é incluir todas e manter também a classificação suíça separada.
2. **Fonte do placar MD3/MD5:** o Admin deve informar apenas vitórias do confronto (ex.: 2–1) ou registrar cada jogo individual e atualizar esse placar progressivamente? A recomendação para simplificar é manter o score atual de série, com confirmação explícita de encerramento; histórico jogo-a-jogo pode ficar para fase posterior.
3. **Modo telão:** prefere uma rota pública dedicada, sem navegação Admin, ou um botão “Modo telão” que amplia o dashboard atual?
4. **Classificação final:** quando vários jogadores tiverem o mesmo retrospecto/pontuação suíça no corte do Top N, quem decide a vaga/seed? Recomendação: seleção manual pelo admin sem inventar desempate.
5. **Sorteio de seeds:** o sorteio deve embaralhar a ordem de todos os classificados, ou apenas sortear dentro dos agrupamentos de seeds (ex.: cabeças de chave)? Sem regra fornecida, recomendação inicial: embaralhar os selecionados, com prévia antes da confirmação.

## 11. Fora de escopo atual

- Atualizações entre dispositivos/usuários: exige backend e autorização compartilhada.
- Autenticação real do Admin: controle visual no frontend não protege dados locais.
- Telemetria, áudio/animação de estádio ou estatísticas oficiais por jogo.
- Regras oficiais de desempate ou de pareamento de Clash Royale sem definição do organizador.
- Uso de logos, imagens, fontes ou outros assets proprietários de Clash Royale sem autorização; a direção será temática e original, não cópia de sua interface/artes.
