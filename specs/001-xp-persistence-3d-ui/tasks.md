# Tasks: Persistência de XP confiável + Redesign visual 3D

**Input**: Design documents from `/specs/001-xp-persistence-3d-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUÍDOS — a spec exige testes de contrato (User Story 2, Independent Test: "um repositório fake em memória consegue rodar os fluxos principais em teste"; research.md D9).

**Ordem definida pelo usuário**: (1) XP e tudo sobre XP → (2) front end com Spline → (3) ensino da IA *(fora desta spec — ver "Fora do escopo" no fim)* → (4) polimento geral.

**Organization**: Tasks agrupadas por user story. US1 (XP) inclui a fatia da camada de dados necessária para XP; US2 completa o desacoplamento; US3 é o front end 3D.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[MANUAL]**: Exige ação humana fora do código (dashboard Supabase, editor Spline)

## Path Conventions

Projeto Next.js único na raiz: `app/`, `components/`, `lib/`, `supabase/`, `tests/` (conforme plan.md → Project Structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependências e estrutura para todas as fases

- [X] T001 Instalar dependências: `npm i @splinetool/react-spline @splinetool/runtime` e `npm i -D vitest`; adicionar script `"test": "vitest run"` em `package.json` (verificar peer deps com React 19.2/Next 16.2 — fallback no research.md D7)
- [X] T002 [P] Criar `vitest.config.ts` na raiz com alias `@/` espelhando `tsconfig.json`
- [X] T003 [P] Criar diretório `supabase/migrations/` com `supabase/README.md` documentando ordem de aplicação e política append-only

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: banco (ledger + RPCs) e esqueleto da camada de dados — nada de user story antes disso

**⚠️ CRITICAL**: T004–T007 seguem [data-model.md](./data-model.md) e [contracts/database-rpc.md](./contracts/database-rpc.md) à risca

- [X] T004 Escrever migração `supabase/migrations/0001_xp_events.sql`: tabela `xp_events` (colunas, `CHECK amount > 0`, `UNIQUE (user_id, idempotency_key)`, índice `(user_id, created_at DESC)`), RLS (SELECT próprio; sem policy de escrita)
- [X] T005 Escrever migração `supabase/migrations/0002_award_xp.sql`: funções `award_xp` e `record_study_activity` (SECURITY DEFINER, `auth.uid()`, upsert de perfil, idempotência, retorno jsonb) conforme contracts/database-rpc.md; GRANT para `authenticated`, REVOKE de `anon`
- [X] T006 Escrever migração `supabase/migrations/0003_backfill.sql`: um `xp_events` por linha de `quizzes` (`source='backfill'`, `idempotency_key='backfill-quiz-'||id`, `created_at` preservado, `ON CONFLICT DO NOTHING`); **NÃO altera `profiles.xp`**
- [ ] T007 [MANUAL] Anotar XP total/streak de uma conta de teste (quickstart §Pré-requisitos) e aplicar 0001→0002→0003 no dashboard Supabase; conferir preservação (SC-006, quickstart §1)
- [X] T008 [P] Criar `lib/data/types.ts` com tipos de domínio (Profile, XpEvent, XpAward, StudyActivity, StudyActivityResult, DailyXp, XpSource, Unsubscribe + tipos migrados de friends/chat/presence) conforme contracts/data-layer.md
- [X] T009 [P] Criar `lib/data/errors.ts` com `DataLayerError` (`code`, `retryable`)
- [X] T010 Criar `lib/data/repositories.ts` com as 6 interfaces (ProfileRepository, XpRepository, StreakRepository, QuizRepository, FriendsRepository, ChatRepository) conforme contracts/data-layer.md (depende de T008, T009)
- [X] T011 Criar `lib/data/supabase/client.ts` (move o `createBrowserClient` de `lib/supabase.ts`); transformar `lib/supabase.ts` em re-export temporário com comentário de depreciação (removido em T031)
- [X] T012 Criar `lib/data/index.ts` com `getDataLayer()` (Supabase) e `createMemoryDataLayer(seed?)`, mais `lib/data/memory/store.ts` (estado em memória compartilhado pelos fakes)

**Checkpoint**: banco migrado, contratos compilando — user stories liberadas

---

## Phase 3: User Story 1 - XP sempre salvo e consistente (Priority: P1) 🎯 MVP

**Goal**: todo ganho de XP (quiz, sessão, lição) persiste atomicamente, sem duplicação, com histórico completo e o MESMO total em todas as telas.

**Independent Test**: quickstart §2 e §3 — completar quiz e sessão, recarregar, conferir total + gráfico "XP por dia"; teste de duas abas; teste offline/retry sem crédito duplo.

### Tests for User Story 1 (escrever ANTES da implementação, devem FALHAR)

- [X] T013 [P] [US1] Teste de contrato `tests/data/xp.contract.test.ts`: `awardXp` idempotente (mesma chave ⇒ 1 crédito, mesmo `xpTotal`), rejeita `amount <= 0`, `getDailyXp` reflete o ganho no dia (contrato itens 1–3, 6)
- [X] T014 [P] [US1] Teste de contrato `tests/data/streak.contract.test.ts`: `recordStudyActivity` — regras de streak (ontem +1 / hoje mantém / senão 1), meta 20 min, primeiro acesso inicializa perfil, duplicata é no-op (contrato itens 4–5)

### Implementation for User Story 1

- [X] T015 [P] [US1] Fakes em memória `lib/data/memory/xp.repository.ts`, `lib/data/memory/streak.repository.ts` e `lib/data/memory/quiz.repository.ts` (fazem T013/T014 passarem; simulação de falha transitória para item 6 do contrato)
- [X] T016 [P] [US1] Implementações Supabase `lib/data/supabase/xp.repository.ts` (RPC `award_xp`; `getDailyXp` agregando `xp_events` por dia local), `lib/data/supabase/streak.repository.ts` (RPC `record_study_activity`) e `lib/data/supabase/quiz.repository.ts` (insert em `quizzes` + `listRecent`); mapear erros para `DataLayerError`
- [X] T017 [US1] Registrar os repositórios reais/fakes em `lib/data/index.ts` (substituir stubs de T012)
- [X] T018 [US1] Migrar fluxo de quiz em `app/study/page.tsx`: gerar `idempotencyKey` (UUID) por quiz concluído, `quizzes.saveResult()` + `xp.awardXp({source:'quiz', sourceId: quizId, …})` via camada; remover import de `@/lib/supabase` e o `rpc('add_xp')`
- [X] T019 [US1] Migrar sessão de estudo em `app/study-session/page.tsx`: `idempotencyKey` por sessão, `streak.recordStudyActivity({minutes, xp, …})`; remover chamada a `addStudyMinutes`
- [X] T020 [US1] Reduzir `lib/streak.ts` a utilitários puros (`isStreakActiveToday`, `DAILY_GOAL`) sem acesso a banco; remover `addStudyMinutes`
- [X] T021 [US1] Reescrever "XP por dia" em `app/progress/page.tsx` para `xp.getDailyXp(userId, 7)` (fonte: `xp_events`) e lista de quizzes via `quizzes.listRecent()`; remover import direto do Supabase
- [X] T022 [US1] UX de falha/retry (FR-004): em `app/study/page.tsx` e `app/study-session/page.tsx`, quando `DataLayerError.retryable` — aviso claro + botão "Tentar de novo" reutilizando a MESMA `idempotencyKey`; ganho nunca se perde em silêncio
- [X] T023 [US1] Atualizar exibições de total para a fonte única (FR-002): conferir dashboard/sidebar/perfil/progresso lendo `profile.xp` vindo do refresh pós-gravação (`refreshProfile` do AuthContext após award/record)

**Checkpoint**: `npx vitest run` verde + quickstart §1–3 verdes — XP confiável de ponta a ponta (MVP entregável)

---

## Phase 4: User Story 2 - Camada de dados desacoplada (Priority: P2)

**Goal**: NENHUM arquivo fora de `lib/data/` importa o cliente do banco; troca de provedor = trocar implementações; lint vira gate permanente.

**Independent Test**: quickstart §4 — `npm run lint` passa; prova negativa falha; suite Vitest roda fluxos no fake sem Supabase.

### Tests for User Story 2

- [ ] T024 [P] [US2] Teste de contrato `tests/data/profile.contract.test.ts`: `getById`, `updateIdentity` (só campos de identidade — tentar campo de XP nem compila), perfil inexistente ⇒ null
- [ ] T025 [P] [US2] Testes de contrato `tests/data/friends.contract.test.ts` e `tests/data/chat.contract.test.ts`: fluxo convite→aceite→lista, limite MAX_AMIGOS, mensagens enviar/listar/subscribe (fake emite callback)

### Implementation for User Story 2

- [ ] T026 [P] [US2] `ProfileRepository`: `lib/data/supabase/profile.repository.ts` + `lib/data/memory/profile.repository.ts`
- [ ] T027 [P] [US2] `FriendsRepository`: mover lógica de `lib/friends.ts` para `lib/data/supabase/friends.repository.ts` (+ fake), encapsulando presença (`usePresence`/`useFriendsPresence` → `subscribePresence`)
- [ ] T028 [P] [US2] `ChatRepository`: mover `lib/chat.ts` para `lib/data/supabase/chat.repository.ts` (+ fake) com `subscribeMessages` encapsulando o canal realtime
- [ ] T029 [US2] Criar `lib/data/supabase/auth.gateway.ts`: wrapper dos métodos de auth usados (session, onAuthStateChange, signIn/signOut/signUp) exposto via `lib/data/index.ts` — auth continua Supabase (Assumption da spec) mas telas não importam o cliente
- [ ] T030 [US2] Migrar consumidores para a camada: `components/AuthContext.tsx`, `components/AvatarUpload.tsx`, `app/page.tsx`, `app/onboarding/page.tsx`, `app/dashboard/page.tsx`, `app/profile/page.tsx`, `app/friends/page.tsx`, `app/chat/page.tsx`, hooks `lib/usePresence.ts`/`lib/useFriendsPresence.ts` (movidos para consumir repos)
- [ ] T031 [US2] Remover `lib/supabase.ts`, `lib/friends.ts`, `lib/chat.ts` (absorvidos); rodar `npm run build` para confirmar zero referências órfãs
- [ ] T032 [US2] Adicionar regra em `eslint.config.mjs`: `no-restricted-imports` proibindo `@/lib/supabase*` e `@supabase/*` fora de `lib/data/**` (SC-003); rodar `npm run lint` e provar a detecção com a prova negativa do quickstart §4

**Checkpoint**: lint como gate arquitetural + fluxos principais rodando no fake — US1 e US2 verificáveis independentemente

---

## Phase 5: User Story 3 - Redesign visual com 3D interativo / Spline (Priority: P3)

**Goal**: landing memorável com cena Spline interativa (fallback elegante) e telas internas com visual coeso e polido — "o melhor front end possível" sem sacrificar fluidez em celular intermediário.

**Independent Test**: quickstart §5–7 — landing interativa ≤3s, fallback em Slow 3G, reduced-motion respeitado, navegação fluida com CPU 4x.

### Implementation for User Story 3

- [ ] T033 [MANUAL] [US3] Criar/ajustar a cena 3D no editor Spline (interação mouse/touch configurada na cena), exportar via "Code → React" e fornecer a URL do `.splinecode`; exportar também uma imagem estática da cena para o poster
- [ ] T034 [P] [US3] Adicionar poster de fallback em `public/posters/landing-hero.webp` (imagem exportada do Spline ou composição com a identidade atual)
- [ ] T035 [US3] Criar `components/three/SplineScene.tsx` (`'use client'`): `next/dynamic(..., { ssr: false })`, poster imediato → swap no `onLoad`, fallback definitivo em `onError`/timeout ~4s/sem WebGL, não monta com `prefers-reduced-motion` (research.md D7)
- [ ] T036 [P] [US3] Consolidar tokens de design em `app/globals.css` (Tailwind 4 `@theme`: cores, raios, sombras, tipografia) preservando identidade Flow/PT-BR
- [ ] T037 [US3] Redesenhar landing `app/page.tsx`: hero com `<SplineScene>` + card de login refinado; `<link rel="preload">` do `.splinecode`; runtime Spline carregado SOMENTE nesta rota
- [ ] T038 [US3] Polimento coeso das telas internas com acentos 3D estáticos (assets exportados do Spline, não runtime): `app/dashboard/page.tsx`, `app/study/page.tsx`, `app/progress/page.tsx`, `app/profile/page.tsx` — microanimações framer-motion com `useReducedMotion` (FR-008/FR-009)
- [ ] T039 [US3] Verificação de desempenho: conferir que o chunk do Spline não entra nas rotas internas (`npm run build` — tamanho por rota), rodar quickstart §5–6 (Slow 3G, reduced-motion, CPU 4x)

**Checkpoint**: landing 3D no ar com fallback; app coeso e fluido — todas as user stories entregues

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: "polindo o site inteiro e arrumando tudo" (item 4 da sua ordem)

- [ ] T040 [P] Corrigir endpoint morto: renomear `app/api/study-guide/roude.ts` → `route.ts` e validar o fluxo que o consome
- [ ] T041 [P] Escrever migração `supabase/migrations/0004_drop_add_xp.sql` removendo o RPC legado `add_xp` (só após T018 em produção); [MANUAL] aplicar no dashboard
- [ ] T042 [P] Atualizar `README.md` com a seção de arquitetura (ledger de XP, camada de dados, decisões D1–D9) — vitrine de portfólio
- [ ] T043 Varredura de consistência visual e de texto (PT-BR, estados vazios, loading states) em todas as telas restantes: `app/methods/page.tsx`, `app/parents/page.tsx`, `app/friends/page.tsx`, `app/chat/page.tsx`, `app/onboarding/page.tsx`
- [ ] T044 Validação final completa: quickstart §1–7 + `npm run lint` + `npx vitest run` + `npm run build` limpos

---

## Fora do escopo desta feature (registrado a pedido do usuário)

**"Melhorar o ensino da IA"** (item 3 da sua ordem) não está na spec 001 — envolve prompts/rotas de IA (`app/api/lesson-*`, `check-answer`, `chat`), outra área de requisitos. Próximo passo recomendado após a US1 (ou quando preferir): `/speckit-specify` para criar a feature `002-ai-teaching` (qualidade pedagógica das lições, progressão de dificuldade, feedback de respostas). Não misturar aqui preserva a testabilidade independente das stories.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende de Setup — BLOQUEIA todas as stories; T007 (aplicar migrações) bloqueia T016 e o teste real de US1
- **US1 (Phase 3)**: depende de Phase 2 — é o MVP e a prioridade nº 1 do usuário
- **US2 (Phase 4)**: depende de Phase 2; T030 toca telas que US1 também toca (T018/T019/T021) — executar após US1 para evitar conflito de arquivo
- **US3 (Phase 5)**: depende de Phase 1 (deps Spline) e de T033 (cena criada pelo usuário); tecnicamente independente de US1/US2, mas ordenada depois por decisão do usuário ("primeiro o XP")
- **Polish (Phase 6)**: T041 depende de T018 em produção; demais dependem das stories desejadas concluídas

### Within Each User Story

- Testes de contrato (T013/T014, T024/T025) escritos ANTES e falhando
- Fakes fazem os testes passarem → implementação Supabase → migração das telas → UX

### Parallel Opportunities

- Phase 1: T002 ∥ T003 (após T001)
- Phase 2: T004 ∥ T005 ∥ T006 (arquivos SQL distintos); T008 ∥ T009
- US1: T013 ∥ T014; depois T015 ∥ T016
- US2: T024 ∥ T025; T026 ∥ T027 ∥ T028
- US3: T034 ∥ T036 enquanto T033 (manual, do usuário) avança; T033 pode começar a qualquer momento — é o item de maior lead time
- Polish: T040 ∥ T041 ∥ T042

---

## Parallel Example: User Story 1

```bash
# Testes de contrato juntos (devem falhar antes da implementação):
Task: "Teste de contrato de XP em tests/data/xp.contract.test.ts"
Task: "Teste de contrato de streak em tests/data/streak.contract.test.ts"

# Implementações em paralelo depois:
Task: "Fakes em memória em lib/data/memory/{xp,streak,quiz}.repository.ts"
Task: "Implementações Supabase em lib/data/supabase/{xp,streak,quiz}.repository.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (Setup) → Phase 2 (Foundational — inclui aplicar migrações no Supabase, T007 manual)
2. Phase 3 (US1): XP atômico, idempotente, com histórico — **parar e validar** (quickstart §1–3)
3. Deploy na Vercel: o produto deixa de "perder XP" — maior ganho de utilidade percebida

### Incremental Delivery

1. MVP (acima) → deploy
2. US2: desacoplamento completo + lint gate → deploy (invisível ao usuário, ouro para o portfólio)
3. US3: landing Spline + polimento → deploy (o "uau" visual) — **começar T033 [MANUAL] cedo**, pois a criação da cena no editor Spline é o caminho crítico
4. Phase 6: polimento geral e validação final
5. Em seguida: `/speckit-specify 002-ai-teaching` (ensino da IA)

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente; [MANUAL] = T007, T033, parte de T041
- Total: 44 tasks (Setup 3, Foundational 9, US1 11, US2 9, US3 7, Polish 5)
- Commit por task ou grupo lógico; parar em qualquer checkpoint para validar a story
- Não iniciar US2/T030 antes de fechar US1 (mesmos arquivos de tela)
