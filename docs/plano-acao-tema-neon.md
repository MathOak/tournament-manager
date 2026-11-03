# Plano de ação — tema escuro neon para Tournament Manager

**Status:** executado em 2026-11-03.

## 1. Objetivo

Atualizar o sistema visual existente para uma identidade escura de e-sports, usando fundos azul-marinho/roxo profundos, magenta como destaque principal, ciano para interação, azul elétrico como apoio e dourado para badges especiais. Aplicar os tokens de forma consistente no dashboard, modo telão, jogadores, configuração do torneio e Admin.

A mudança é visual: não deve alterar regras de torneio, persistência, navegação ou cálculos de resultados.

## 2. Levantamento do estado atual

- O projeto já importa Tailwind CSS 4 em `src/styles.css`, mas não há `tailwind.config.js` nem um tema Tailwind próprio. A folha global é o ponto central dos estilos; os componentes usam classes CSS próprias, não utilitários Tailwind como base da apresentação.
- `src/styles.css` reúne os tokens e estilos de todas as telas. Há variáveis de superfície/texto/acento, porém a paleta é híbrida: roxo antigo, valores claros hardcoded e cores semânticas fixas coexistem com os valores do tema escuro.
- O tema escuro já é o padrão: `src/app/app.ts` escolhe `dark` quando não há preferência salva; o controle da barra superior alterna tema e guarda a escolha em `localStorage`.
- O tema claro também está implementado em `src/styles.css` e faz parte da proposta de UX em `docs/plano-ux-dashboard-admin.md`; portanto, este plano preserva a alternância claro/escuro. A nova identidade escura será a referência principal.
- As páginas existentes incluem dashboard/telão, jogadores, torneio e Admin. Compartilham classes globais como `.panel`, `.button-primary`, `.status-pill`, `.rank` e `.live-match-card`.
- `src/app/app.css` está vazio. A maior parte das cores está em `src/styles.css`, inclusive regras de layout para as telas e estilos inline em termos de cores.
- A documentação de UX já recomenda tokens compartilhados, dark mode padrão, contraste, foco visível, responsividade e redução de animações. Este plano detalha a paleta visual solicitada sem reabrir os requisitos funcionais daquele documento.

## 3. Direção visual proposta

### Tokens semânticos

| Token proposto | Valor de referência | Aplicação |
|---|---|---|
| `--page` / fundo principal | `#0a091e` | Fundo geral; pode receber gradiente sutil para `#0e122b` |
| `--surface` | `#151833` | Cards, painéis, navegação e containers |
| `--surface-raised` | `#1e2246` | Superfícies elevadas, hover e áreas internas |
| `--border` | `#2d3561` | Bordas, divisores e linhas de tabela; reservar `#384378` para ênfase |
| `--accent-primary` | `#e6007e` | Destaques magenta, detalhes de marca, títulos/eyebrows selecionados e hover |
| `--accent-interactive` | `#00d2ff` | Links, foco e controles interativos |
| `--accent-support` | `#1c75bc` | Indicadores e elementos auxiliares em azul elétrico |
| `--badge-highlight` | `#ffcc00` | Badges especiais, com texto escuro |
| `--text` | `#ffffff` | Títulos e conteúdo principal |
| `--text-secondary` | `#cbd5e1` | Texto de corpo e informação secundária |
| `--text-muted` | `#64748b` | Legendas, metadados e conteúdo de baixa prioridade |
| `--field` | derivado de `#151833` | Campos de formulário, com borda e foco perceptíveis |

Centralizar também tokens semânticos para sucesso, aviso e erro. Esses estados não devem ser substituídos por magenta/ciano/dourado quando isso prejudicar o significado; devem permanecer distinguíveis, consistentes entre as telas e identificados por texto/ícone além da cor.

### Gradientes

- **Hero / destaque de página:** radial ou diagonal com magenta e ciano em baixa opacidade, terminando no fundo escuro. Usar principalmente no cabeçalho do dashboard e no modo telão, sem reduzir legibilidade.
- **CTA principal:** linear da esquerda para a direita de ciano a magenta. Usar texto escuro se a avaliação de contraste indicar que texto branco não fica legível no trecho ciano; manter foco visível e hover sem depender apenas de mudança de cor.
- Evitar aplicar gradiente em todos os cards ou em áreas extensas; reservar o efeito para hierarquia e ação principal.

## 4. Plano de execução

### Etapa 1 — Consolidar tokens do tema

**Alvos:** `src/styles.css` e, se necessário para integração com utilities Tailwind, o bloco `@theme` CSS-first do Tailwind 4.

1. Substituir os tokens de roxo e neutros atuais por nomes semânticos de fundo, superfície, borda, texto, acento, foco, sucesso, aviso e erro.
2. Definir o dark como padrão efetivo e mapear os valores da paleta de referência. Definir o light como override equivalente, se mantido, em vez de deixar estilos antigos claros vazarem para o dark.
3. Se a implementação usar utilitários Tailwind para cores, mapear os tokens com `@theme` do Tailwind 4. Não adicionar `tailwind.config.js` por inércia; manter CSS custom properties como fonte da verdade.
4. Remover ou converter declarações de cor hardcoded que contradigam os tokens, incluindo superfícies brancas, tons roxos antigos e bordas claras. Preservar exceções semânticas intencionais e documentá-las.

### Etapa 2 — Atualizar componentes compartilhados

**Alvos:** barra superior, navegação, botões, painéis, tabelas, formulários, badges, estados vazios e notificações, todos atualmente estilizados em `src/styles.css`.

1. Aplicar superfícies escuras e bordas azul/roxo sutis em `.topbar`, `.panel`, `.stat-card`, `.empty-state`, `.toast`, tabelas e cartões de partida.
2. Aplicar ciano a links, seleção/foco e elementos interativos; magenta a detalhes de destaque e estados de hover de ação.
3. Aplicar o gradiente ciano→magenta aos CTAs primários, preservando estados `hover`, `focus-visible`, `disabled` e contraste.
4. Criar uma classe explícita para badge especial/destaque, com fundo dourado e texto escuro. Não converter automaticamente badges de estado (por exemplo, concluído, ao vivo ou pendente) em badges dourados.
5. Atualizar campos e controles para fundo escuro, placeholder legível e foco ciano visível; manter mensagens de erro/sucesso distinguíveis.

### Etapa 3 — Aplicar identidade nas páginas

**Alvos:** templates de `src/app/features/dashboard/`, `players/`, `tournament/` e `admin/`, mais o modo telão.

1. Revisar visualmente todas as classes existentes após a troca dos tokens, garantindo que títulos, subtítulos, dados e ícones tenham hierarquia coerente.
2. Usar magenta em destaques de marca e títulos selecionados, não em todo título; manter a tipografia principal branca para leitura.
3. Usar ciano para links e tags interativas/convencionais; reservar o dourado para itens explicitamente marcados como destaque.
4. Ajustar o cabeçalho hero e os cartões ao vivo para receber o gradiente de referência de forma sutil. Preservar a diferença visual entre ao vivo, próxima, concluída e pendente.
5. Confirmar que dashboard e modo telão mantêm placares legíveis à distância e que o tema também cobre a navegação, formulários e conteúdo de administração.

### Etapa 4 — Acessibilidade e responsividade

1. Verificar contraste de texto, links, botões, badges e foco nos temas escuro e claro. Ajustar combinações quando ciano ou cinza muted não alcançarem legibilidade suficiente.
2. Em botões ciano/dourado, usar texto escuro quando necessário para contraste; não presumir que branco seja legível sobre amarelo ou ciano.
3. Não comunicar status apenas por cor: preservar rótulos como “AO VIVO”, “Concluída” e ícones/indicadores textuais.
4. Revisar estados hover, focus-visible, disabled, erro e sucesso com teclado; não remover o contorno de foco existente.
5. Conferir breakpoints para celular, desktop e telão, evitando que os efeitos/gradientes prejudiquem leitura ou responsividade.

### Etapa 5 — Validação

1. Executar `npm run build` e `npm test`.
2. Inspecionar manualmente todas as rotas (`/`, `/display`, `/players`, `/tournament`, `/admin`) no dark e no light.
3. Conferir estados com conteúdo real e vazio, botões desabilitados, resultados ao vivo/concluídos, campos com foco, toast e badge dourado.
4. Verificar larguras pequenas (a partir de 320 px), desktop e resolução de telão; confirmar ausência de overflow causado pela troca visual.
5. Atualizar `docs/plano-ux-dashboard-admin.md` somente se a implementação alterar a direção já acordada (dark padrão, alternância de tema, acessibilidade ou experiência do telão). Manter este documento como plano executável, não como declaração de funcionalidade já entregue.

## 5. Critérios de aceite

- O tema escuro usa a paleta escura azul/roxa como padrão, com magenta e ciano nos papéis definidos e bordas sutis.
- A preferência por claro/escuro continua alternável e persistente, conforme o comportamento existente e a decisão de UX documentada.
- CTAs principais usam o gradiente ciano→magenta; o destaque hero incorpora magenta/ciano sobre fundo escuro sem comprometer conteúdo.
- Há uma variante específica de badge dourado com texto escuro para itens de destaque, sem confundir estados operacionais.
- Não restam cores antigas hardcoded que criem superfícies brancas ou acentos roxos incompatíveis no tema escuro, salvo exceções semânticas justificadas.
- Textos, controles e estados de foco permanecem legíveis e acessíveis nas telas e temas suportados.
- Dashboard, modo telão, jogadores, configuração e Admin apresentam o mesmo sistema visual, sem mudanças funcionais.
- Build e testes passam após a implementação.

## 6. Riscos e decisões

- **Muitos estilos globais e cores hardcoded:** a conversão pode deixar estilos residuais inconsistentes. Mitigar fazendo uma busca final por cores literais e revisando toda a folha, não apenas os tokens do topo.
- **Tema claro existente:** a solicitação exige dark mode padrão, mas não pede remover o tema claro. Este plano mantém o toggle e propõe adaptar o tema claro; confirmar antes de removê-lo ou tornar o dark obrigatório.
- **Contraste dos destaques:** cores neon e dourado podem falhar em certas combinações de texto/fundo. Ajustar cor do texto e estados, em vez de usar a paleta sem verificar contraste.
- **Tailwind 4:** não foi encontrada configuração JavaScript do Tailwind. Preferir tokens em CSS e só usar `@theme` para expor tokens a utilities, evitando configuração redundante.
- **Escopo funcional:** não há badge “Destaque” associado a um requisito de domínio identificado. A implementação deve criar o estilo reutilizável e só colocá-lo em um elemento quando houver significado de produto definido; não inventar um novo estado de torneio.

## 7. Execução registrada

- Tokens semânticos dark-first e mapeamentos `@theme` do Tailwind 4 adicionados em `src/styles.css`; o dark mode continua sendo o padrão e a alternância clara/escura foi preservada.
- Superfícies, bordas, navegação, formulários, links, estados e CTAs foram adaptados à nova paleta. Hero e botões principais usam gradientes magenta/ciano; o estilo `.badge-highlight` está disponível com fundo dourado e texto escuro.
- O dourado ficou reservado ao badge de destaque e a avisos; estados de partida usam seus indicadores próprios. Não foi aplicado um badge “Destaque” a um item do produto porque não existe atualmente esse conceito nos dados ou requisitos.
- Inspeção visual feita no dashboard, tela de jogadores e Admin em navegador, nos temas escuro e claro.
- `npm run build`: concluído com sucesso.
- Testes: 2 arquivos aprovados, 10 testes aprovados.
