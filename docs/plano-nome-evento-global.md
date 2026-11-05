# Plano: nome do evento como variável global

Objetivo: centralizar o título "Tournament Manager" em uma única configuração, para que o nome do evento possa ser trocado em um só lugar.

**Status: executado em 2026-11-05.** O README mantém o nome atual do projeto; `index.html` mantém o título como fallback anterior ao bootstrap. Os identificadores técnicos listados abaixo permanecem inalterados.

## 1. Ocorrências de título visível (devem usar a variável)

| Arquivo | Linha | Uso atual |
| --- | --- | --- |
| `src/index.html` | 5 | `<title>Tournament Manager</title>` |
| `src/app/shared/layout/app-header/app-header.component.html` | 2 | `aria-label="Tournament Manager — início"` e texto da marca `Tournament<span class="brand-light">Manager</span>` |
| `src/app/shared/layout/app-footer/app-footer.component.html` | 1 | `Tournament Manager` no rodapé |
| `README.md` | 1 | `# Tournament Manager` (documentação; atualização manual) |

Observações:
- A marca do header mantém o destaque em duas partes (`brand-light`); a configuração expõe o nome completo, a sigla (`TM`) e as partes estilizadas.
- Os specs do Header, Footer e App verificam o nome configurado, incluindo a substituição do token por uma configuração customizada.

## Implementação realizada

- `src/app/core/app-config.ts` exporta `EVENT_NAME`, `EVENT_SHORT_NAME`, `DEFAULT_APP_CONFIG` e o token `APP_CONFIG`, incluindo as partes estilizadas da marca.
- `src/app/app.config.ts` registra a configuração padrão; Header e Footer recebem o mesmo token.
- `src/app/app.ts` define `document.title` por meio do serviço `Title` do Angular.
- A suíte executou 75 testes: 71 passaram e 4 falharam em specs de Admin, Bracket Display e Bracket Legend, fora das áreas alteradas. O build de produção passou.

## 2. Ocorrências que NÃO devem mudar (identificadores técnicos)

Alterá-las apagaria os dados já salvos no navegador dos usuários.

| Arquivo | Identificador |
| --- | --- |
| `src/app/core/tournament-store.service.ts` (l. 5, 9, 10, 11, 260) | banco IndexedDB `tournament-manager`, chaves `tournament-manager-document-v1`, `-tournaments-v1`, `-selected-id`, canal `tournament-manager-updates` |
| `src/app/app.ts` (l. 32, 37) | chave `tournament-manager-theme` |
| `e2e/tournament-flows.spec.ts` (l. 35-38) | mesmas chaves de localStorage |
| `package.json` (l. 2) | nome do pacote npm |

Decisão: manter esses valores fixos, sem relação com o nome do evento. Se no futuro o nome do evento isolar os dados por evento, tratar como plano separado com migração.

## 3. Design proposto

1. Criar `src/app/core/app-config.ts` com:
   ```ts
   export const EVENT_NAME = 'Tournament Manager';
   export const EVENT_SHORT_NAME = 'TM';
   ```
   Opcional: `EVENT_NAME_PARTS = ['Tournament', 'Manager']` para o destaque visual do header.
2. Expor via injeção para os templates: `InjectionToken<AppConfig>` provido em `src/app/app.config.ts`, ou campo `readonly eventName = EVENT_NAME` nos componentes Header e Footer. Preferir o token por manter componentes de apresentação desacoplados e facilitar testes.
3. `index.html`: o `<title>` é estático. Definir via `Title` do `@angular/platform-browser` no construtor de `App` (`src/app/app.ts`), mantendo o texto estático como fallback antes do bootstrap.
4. Header: substituir o `aria-label`, a sigla e o texto da marca por bindings.
5. Footer: substituir o texto por binding.
6. README: ajustar o título manualmente, ou deixar com o nome do projeto, já que não é runtime.

## 4. Testes

- Header: adicionar asserção de que a marca e o `aria-label` contêm o nome configurado.
- Footer: asserção do nome no rodapé.
- App: asserção de que `document.title` é igual a `EVENT_NAME`.
- Teste com token sobrescrito (`{ provide: APP_CONFIG, useValue: { eventName: 'Copa X' } }`) para provar a flexibilidade.
- E2E: nenhuma alteração necessária (chaves técnicas permanecem).

## 5. Ordem de execução

1. Criar `app-config.ts` e o provider em `app.config.ts`.
2. Atualizar Header, Footer e título do documento em `App`.
3. Adicionar/ajustar specs.
4. `npm test` e `npm run build`.
5. Atualizar `README.md` e `AGENTS.md` (nome/estrutura) se necessário.

## 6. Pontos em aberto

- O nome deve ser editável em runtime pelo Admin (persistido) ou apenas por constante em build? Este plano cobre apenas a constante.
- Manter o destaque em duas cores no header ou usar o nome em um único estilo.
- Texto da sigla (`TM`): derivar automaticamente das iniciais ou configurar manualmente.
