# Quickstart — Validação da feature 001-xp-persistence-3d-ui

Roteiro para provar, ponta a ponta, que a feature funciona. Referências: [spec.md](./spec.md) (SC-001…SC-006), [contracts/](./contracts/), [data-model.md](./data-model.md).

## Pré-requisitos

- Node 20+, `npm install`
- `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Migrações aplicadas no projeto Supabase, **em ordem**: `supabase/migrations/0001_xp_events.sql`, `0002_award_xp.sql`, `0003_backfill.sql` (via SQL Editor do dashboard ou `supabase db push`)
- Conta de teste com XP existente (para validar preservação — SC-006): anote o XP total ANTES de aplicar as migrações

## Comandos

```bash
npm run dev      # app em http://localhost:3000
npm run lint     # inclui a verificação arquitetural (SC-003)
npx vitest run   # testes de contrato da camada de dados (fake em memória)
npm run build    # build de produção deve passar (gate da Vercel)
```

## Validações

### 1. Preservação de dados (SC-006 / FR-011) — PRIMEIRO

Após aplicar as migrações, logar com a conta antiga: XP total, streak e minutos idênticos aos anotados. O gráfico "XP por dia" mostra o histórico de quizzes antigos (backfill).

### 2. XP persistido e consistente (SC-001 / SC-002 / FR-001–003)

1. Anote o XP total. Complete um **quiz** — o XP exibido soma o ganho.
2. Recarregue (F5): total idêntico em dashboard, perfil, progresso e sidebar.
3. Complete uma **sessão de estudo** (lição): total soma 10/passo **e** o gráfico "XP por dia" do dia corrente reflete o ganho (antes da feature, XP de sessão não aparecia no gráfico).
4. Duas abas logadas: ganhe XP em cada uma quase ao mesmo tempo; após recarregar, o total é a SOMA dos dois ganhos (nada sobrescrito).

### 3. Idempotência / falha de rede (FR-004)

1. DevTools → Network → "Offline" ao concluir uma atividade: a UI informa a falha e oferece nova tentativa (não perde o ganho silenciosamente).
2. Volte "Online" e repita a tentativa: o XP entra **uma única vez**.
3. Automatizado: `npx vitest run` cobre a semântica (mesma `idempotencyKey` duas vezes ⇒ um crédito — contrato item 1).

### 4. Fronteira da camada de dados (SC-003 / FR-005)

```bash
npm run lint
```

Deve passar. Prova negativa: adicione `import { supabase } from '@/lib/supabase'` (ou `@supabase/supabase-js`) em qualquer arquivo de `app/` ou `components/` → o lint DEVE falhar. Desfaça.

Prova do desacoplamento (FR-006 / User Story 2): a suite Vitest roda os fluxos principais inteiramente no `createMemoryDataLayer()` — nenhum Supabase envolvido.

### 5. Landing 3D (SC-004 / FR-007)

1. Abra `/` em banda larga: poster estático aparece imediatamente; a cena Spline fica interativa (reage ao mouse) em ≤ 3s.
2. DevTools → Network → "Slow 3G" + recarregar: o poster elegante permanece e a página continua utilizável (login funciona) mesmo sem a cena carregar.
3. Touch: no modo dispositivo móvel do DevTools, a cena responde ao toque.

### 6. Reduced motion e fluidez (FR-009 / FR-010 / SC-005)

1. DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce" → recarregue: a cena 3D NÃO monta (poster no lugar) e microanimações intensas ficam desativadas.
2. Navegue por dashboard → estudo → progresso no modo mobile (CPU throttling 4x): sem travamentos perceptíveis nas telas de estudo.

### 7. Redesign coeso (FR-008)

Passar pelas telas internas: tokens visuais consistentes (cores, cartões, tipografia), mascote Flow e tom PT-BR preservados, áreas de leitura de estudo sem poluição visual.

## Critérios de saída

Todos os itens acima verdes + `npm run build` limpo. Qualquer divergência de XP entre telas, crédito duplicado ou tela quebrada sem WebGL é bloqueante.
