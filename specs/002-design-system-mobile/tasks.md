# Tasks: Design system Tailwind v4 + responsividade mobile + polish

**Input**: Design documents from `/specs/002-design-system-mobile/`

**Prerequisites**: plan.md ✅, spec.md ✅ (no research.md / data-model.md / contracts — feature is UI-only)

**Tests**: Nenhum teste novo é pedido pela spec. FR-007 exige **não-regressão** (17/17 vitest + `tsc` limpo), então os testes aparecem como *gates* de verificação, não como TDD.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 (design system), US2 (mobile), US3 (polish), US4 (lint)

---

## ⚠️ Correções ao diagnóstico da spec (medidas em 2026-07-11)

Duas premissas da spec estão **erradas** e as tasks abaixo corrigem:

| Spec diz | Realidade medida | Consequência |
|---|---|---|
| "Hoje não existe nenhum ícone" (US3.1 / FR-004) | `app/favicon.ico` **existe** — 25.931 bytes, ICO válido (16x16 + 32x32), datado de 19/mai | Não é "criar favicon". É **substituir o favicon padrão do create-next-app pelo logo do FocusFlow**. |
| 4 páginas quebradas (`friends`, `methods`, `chat`, `onboarding`) | **`app/parents/page.tsx` tem 47 `style={{}}` e 0 `@media`** — é o **pior** arquivo do projeto e não estava na spec. `components/ChatWindow.tsx` (16 / 0) idem. | São **5** páginas quebradas, não 4. Pela regra da própria spec (zero `@media` ⇒ responsividade impossível), `parents` está quebrada no mobile. |

`components/ui/` já existe, porém **vazio** — não há o que absorver lá; `Card.tsx` e `SweepCard.tsx` continuam na raiz de `components/`.

### Superfície real de estilo inline (fonte das tasks)

| Arquivo | `style={{` | `@media` | Status |
|---|---|---|---|
| `app/parents/page.tsx` | 47 | 0 | 🔴 quebrada (não estava na spec) |
| `app/friends/page.tsx` | 42 | 0 | 🔴 quebrada |
| `app/methods/page.tsx` | 25 | 0 | 🔴 quebrada |
| `app/chat/page.tsx` | 22 | 0 | 🔴 quebrada |
| `app/onboarding/page.tsx` | 17 | 0 | 🔴 quebrada |
| `components/ChatWindow.tsx` | 16 | 0 | 🔴 sustenta o chat |
| `app/study-session/page.tsx` | 114 | 1 | 🟡 funciona, refactor de coesão |
| `app/study/page.tsx` | 60 | 2 | 🟡 |
| `app/progress/page.tsx` | 39 | 2 | 🟡 |
| `app/profile/page.tsx` | 30 | 1 | 🟡 |
| `app/dashboard/page.tsx` | 24 | 2 | 🟡 |
| `app/page.tsx` | 15 | 1 | 🟡 |
| `components/layout/Sidebar.tsx` | 12 | 0 | 🟡 |
| `components/layout/AppShell.tsx` | 3 | 2 | 🟡 |

---

## Phase 1: Setup (baseline verificável)

**Purpose**: congelar o estado "verde" atual para que qualquer regressão seja detectável.

- [ ] T001 Registrar o baseline em `specs/002-design-system-mobile/baseline.md`: saída de `npx tsc --noEmit`, `npx vitest run` (17/17) e `npx eslint .` (0 erros / 7 warnings)
- [ ] T002 [P] Capturar screenshots de referência (desktop 1440px) das 14 telas listadas na tabela acima, em `specs/002-design-system-mobile/screenshots/before/`, para comparação visual pós-migração

---

## Phase 2: Foundational — ativar o Tailwind v4 (BLOQUEIA TUDO)

**Purpose**: hoje o Tailwind está instalado e **inerte**. Enquanto ele não emitir uma única classe utilitária, toda migração de página é reescrita no vazio.

**⚠️ CRÍTICO**: nenhuma task de US1/US2 pode começar antes do gate T005 passar.

> Estas tasks satisfazem as *acceptances* 1 e 2 de US1, mas vivem aqui porque **bloqueiam todas as histórias**.

- [ ] T003 Reescrever o topo de `app/globals.css`: trocar `@tailwind base; @tailwind components; @tailwind utilities;` por `@import "tailwindcss";` (sintaxe v4 — as diretivas v3 são ignoradas silenciosamente pelo v4, que é a causa de nada ser emitido)
- [ ] T004 Em `app/globals.css`, promover os tokens do `:root` a um bloco `@theme` com o prefixo que gera utilitários: `--color-p: #9333FF`, `--color-p2`, `--color-p3`, `--color-bg`, `--color-card`, `--color-ink`, etc. Manter o `:root` original para o CSS custom que ainda o referencia (`var(--p)`), evitando big-bang
- [ ] T005 **GATE**: rodar `npm run build` e confirmar que classes utilitárias (`.grid`, `.flex`, `.md\:grid-cols-2`) **aparecem** no CSS emitido em `.next/static/css/`. Hoje não aparecem. Se este gate falhar, **parar** — nada mais nesta feature funciona
- [ ] T006 Preservar explicitamente em `app/globals.css` o CSS de marca que o Tailwind **não** substitui: `@keyframes` (orb, sweep, glow-pulse), `.glass-card` e o `@import` da fonte Google Sans
- [ ] T007 [P] Verificar que `postcss.config.mjs` usa `@tailwindcss/postcss` (plugin v4) e não o pacote `tailwindcss` como plugin (padrão v3)

**Checkpoint**: Tailwind vivo e emitindo utilitários. US1 e US2 podem começar.

---

## Phase 3: User Story 1 — Design system unificado (P1) 🎯 MVP

**Goal**: primitivos visuais existem **uma vez**, não recopiados por página; identidade roxo/escuro preservada.

**Independent Test**: importar `Card`, `Button`, `Input` e `PageTitle` numa página de teste e ver os quatro renderizando com a identidade atual — sem que nenhuma página de produto tenha sido migrada ainda.

- [ ] T008 [P] [US1] Criar `components/ui/Button.tsx` — variantes `primary` / `secondary` / `ghost`, com alvo de toque mínimo de 44px (pré-requisito de SC-001/US2)
- [ ] T009 [P] [US1] Criar `components/ui/Input.tsx` — input e textarea com os tokens de borda/foco do tema
- [ ] T010 [P] [US1] Criar `components/ui/PageTitle.tsx` — título + subtítulo de página, absorvendo o padrão hoje repetido como `dash-title`
- [ ] T011 [US1] Criar `components/ui/Card.tsx` consolidando `components/Card.tsx` **e** `components/SweepCard.tsx` (variante `sweep` como prop, mantendo o hover `--mx/--my` do glass-card como inline **dinâmico** — este inline é legítimo e fica)
- [ ] T012 [US1] Criar `components/ui/index.ts` reexportando os quatro primitivos
- [ ] T013 [US1] Substituir os usos de `components/Card.tsx` e `components/SweepCard.tsx` pelos novos primitivos e **deletar** os dois arquivos antigos (depende de T011)

**Checkpoint**: design system existe e é importável. Nenhuma página quebrou (nada foi migrado ainda).

---

## Phase 4: User Story 2 — Mobile nas páginas quebradas (P1)

**Goal**: 375px sem scroll horizontal, sem texto cortado, sem alvo de toque < 44px.

**Independent Test**: abrir cada página em viewport de 375px e confirmar zero scroll horizontal e grid em 1 coluna.

**Ordem por dor** (maior superfície inline primeiro), **uma página por vez** — cada migração é um commit verificável.

- [ ] T014 [US2] Migrar `app/parents/page.tsx` (47 inline / 0 media — **o pior do projeto**): trocar `style={{}}` de layout (`display`, `grid*`, `flex*`, `width`, `padding`, `margin`) por utilitários com breakpoint (`md:`, `sm:`); validar em 375px
- [ ] T015 [US2] Migrar `app/friends/page.tsx` (42 / 0): grid de amigos colapsa para 1 coluna no mobile; validar em 375px
- [ ] T016 [US2] Migrar `app/chat/page.tsx` (22 / 0): o composer deve continuar acessível com o teclado virtual aberto (evitar `100vh` — usar `100dvh`); validar em 375px
- [ ] T017 [US2] Migrar `components/ChatWindow.tsx` (16 / 0) — sustenta o chat; sem esta task, T016 fica pela metade (depende de T016)
- [ ] T018 [US2] Migrar `app/methods/page.tsx` (25 / 0): cards de método em 1 coluna no mobile; validar em 375px
- [ ] T019 [US2] Migrar `app/onboarding/page.tsx` (17 / 0): passos e CTAs legíveis em 375px; validar
- [ ] T020 [US2] Verificar SC-002 nas 5 páginas migradas: `grep -o 'style={{' app/{parents,friends,chat,methods,onboarding}/page.tsx` não retorna nenhum inline de **layout** (dinâmico é permitido)
- [ ] T021 [US2] Verificar SC-001: as 5 páginas em 375px, zero scroll horizontal (`document.documentElement.scrollWidth <= window.innerWidth`)

**Checkpoint**: as páginas reportadas como quebradas funcionam no celular. **Este é o valor que o usuário pediu** — dá para parar e entregar aqui.

---

## Phase 5: User Story 1 (continuação) — coesão nas páginas que já funcionam (P1, prioridade menor)

**Goal**: um só modelo de estilo no app. Estas páginas **funcionam** — isto é refactor de coesão, não correção de bug. Risco de regressão visual é real, então vem depois do valor entregue na Phase 4.

- [ ] T022 [US1] Migrar `app/dashboard/page.tsx` (24 inline / bloco `<style>` com 2 `@media`) para utilitários + primitivos; remover o `<style>` da página
- [ ] T023 [US1] Migrar `app/page.tsx` (15 / 1) — landing
- [ ] T024 [US1] Migrar `app/profile/page.tsx` (30 / 1)
- [ ] T025 [US1] Migrar `app/progress/page.tsx` (39 / 2) — atenção aos gráficos recharts, que recebem estilo por prop e não por CSS
- [ ] T026 [US1] Migrar `app/study/page.tsx` (60 / 2)
- [ ] T027 [US1] Migrar `app/study-session/page.tsx` (114 / 1 — **maior arquivo inline do projeto**; considerar quebrar em subcomponentes durante a migração)
- [ ] T028 [US1] Migrar `components/layout/AppShell.tsx` (3 / 2) e `components/layout/Sidebar.tsx` (12 / 0) — o sidebar precisa de comportamento mobile (drawer/colapso), hoje inexistente
- [ ] T029 [P] [US1] Migrar os componentes menores: `AnimatedBg.tsx`, `AuthGuard.tsx`, `AvatarUpload.tsx`, `FlowMascot.tsx`, `Streakflame.tsx`
- [ ] T030 [US1] Verificar SC-005 comparando com os screenshots de T002: identidade roxo `#9333FF` sobre `#0B0612` preservada em todas as telas

**Checkpoint**: um único modelo de estilo em todo o app.

---

## Phase 6: User Story 3 — Polish (P2)

**Goal**: favicon do produto e avatar do Google visíveis.

**Independent Test**: aba do browser mostra o logo do FocusFlow; após login Google, o sidebar mostra a foto da conta.

- [ ] T031 [P] [US3] **Substituir** `app/favicon.ico` (hoje é o ícone padrão do create-next-app, 25.931 bytes, de 19/mai) por um ICO gerado a partir de `public/logo.png`. O Next 16 injeta o `<link rel="icon">` sozinho — **não** declarar em `metadata`. ⚠️ A spec afirma que o arquivo não existe; ele existe, apenas é o ícone errado
- [ ] T032 [US3] **Diagnosticar** o avatar do Google com login Google real, instrumentando `components/layout/Sidebar.tsx:44-48`. A cadeia de fallback (`profile.avatar_url → user_metadata.avatar_url → picture → inicial`) **já existe** — a task é descobrir onde ela quebra, não reimplementar. Ordem de suspeita: (a) tabela `profiles` ausente ⇒ `loadProfile` falha ⇒ `profile = null` e o fallback para `user_metadata` não está sendo exercitado; (b) `<img>` cru com URL `lh3.googleusercontent.com` bloqueado
- [ ] T033 [US3] Corrigir a causa encontrada em T032. Se for (a) e a raiz for o schema ausente, **registrar o achado e apontar para 001/T007** — não migrar banco nesta feature (fora de escopo). Se for (b), migrar para `next/image` com `remotePatterns` em `next.config.ts` (depende de T032)

**Checkpoint**: FR-004 e FR-005 satisfeitos — ou, no caso do avatar, a causa está provada e atribuída à feature 001.

---

## Phase 7: User Story 4 — Zerar os warnings de lint (P2)

**Goal**: `npx eslint .` retorna 0 erros **e** 0 warnings (FR-006 / SC-003).

**Independent Test**: `npx eslint .` sai limpo.

- [ ] T034 [P] [US4] Corrigir `react-hooks/exhaustive-deps` em `app/dashboard/page.tsx:104` (dependência `user` faltando)
- [ ] T035 [P] [US4] Corrigir `react-hooks/exhaustive-deps` em `app/progress/page.tsx:92` (dependência `user` faltando)
- [ ] T036 [US4] Corrigir `react-hooks/exhaustive-deps` em `components/AuthContext.tsx:121` e os 2 `no-unused-vars` (`_status`, `_studyingTopic`) em `components/AuthContext.tsx:129` — remover as variáveis mortas em vez de suprimir
- [ ] T037 [US4] Resolver `no-img-element` em `app/page.tsx:174` migrando para `next/image`
- [ ] T038 [US4] Resolver `no-img-element` em `components/layout/Sidebar.tsx:175` — **coordenar com T033**: se o avatar migrar para `next/image`, este warning morre junto. Não resolver isoladamente antes de T032 (depende de T032)

**Checkpoint**: lint limpo.

---

## Phase 8: Polish & não-regressão (gates finais)

- [ ] T039 Rodar `npx tsc --noEmit` — deve sair limpo (FR-007)
- [ ] T040 Rodar `npx vitest run` — 17/17 devem continuar passando (FR-007). Nenhum teste toca CSS, então uma quebra aqui significa que a migração alterou lógica, não estilo
- [ ] T041 Rodar `npx eslint .` — 0 erros / 0 warnings (SC-003)
- [ ] T042 Rodar `npm run build` — deve passar (SC-004)
- [ ] T043 Varredura final de SC-002: nenhum `style={{}}` de **layout** sobrou em nenhuma página; o que restar deve ser dinâmico e justificável (hover `--mx/--my`, cor calculada em runtime)
- [ ] T044 Atualizar `spec.md` corrigindo as duas premissas erradas (favicon existente; `parents` como 5ª página quebrada), para a spec não continuar mentindo depois de mergeada

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: sem dependências
- **Phase 2 (Foundational)**: depende da Phase 1 — **BLOQUEIA TODAS as histórias**. O gate é **T005**
- **Phase 3 (US1 primitivos)**: depende de T005
- **Phase 4 (US2 mobile)**: depende de T005; usa os primitivos da Phase 3 (especialmente `Button`/T008 pelo alvo de toque de 44px)
- **Phase 5 (US1 coesão)**: depende da Phase 4 — deliberadamente **depois** do valor entregue, porque é refactor de páginas que já funcionam
- **Phase 6 (US3)** e **Phase 7 (US4)**: independentes das Phases 3–5; podem rodar em paralelo com elas
- **Phase 8**: depende de tudo que se pretende entregar

### Dependência crítica entre histórias

**T032 → T033 → T038**: o diagnóstico do avatar (US3) e o warning `no-img-element` do Sidebar (US4) são o **mesmo** problema visto de dois ângulos. Resolver T038 isoladamente antes de T032 provavelmente desfaz o diagnóstico.

**T016 → T017**: migrar `app/chat/page.tsx` sem migrar `components/ChatWindow.tsx` deixa o chat pela metade.

### Parallel Opportunities

- T008, T009, T010 (primitivos independentes, arquivos diferentes)
- T034, T035 (arquivos diferentes)
- T031 (favicon) é independente de tudo
- T029 (componentes menores)
- ❌ As migrações de página (T014–T019, T022–T028) **não** são paralelas na prática: mexem no mesmo `globals.css` compartilhado e a verificação visual precisa ser uma-por-vez para isolar regressão

---

## Parallel Example: Phase 3 (primitivos)

```bash
Task: "Criar components/ui/Button.tsx com variantes e alvo de toque 44px"
Task: "Criar components/ui/Input.tsx com tokens de borda/foco"
Task: "Criar components/ui/PageTitle.tsx absorvendo o padrão dash-title"
```

---

## Implementation Strategy

### MVP — o que o usuário realmente pediu

1. Phase 1 (baseline) → Phase 2 (**gate T005** — Tailwind vivo)
2. Phase 3 (primitivos)
3. Phase 4 (as 5 páginas quebradas no mobile)
4. **PARAR E VALIDAR** em 375px. Isto já entrega "o mobile não quebra mais" e "o app parece coeso" nas telas que doem.

### Entrega incremental

- Phase 4 é entregável sozinha (mobile corrigido)
- Phase 6 + Phase 7 são entregáveis sozinhas (polish + lint), em paralelo
- Phase 5 é a mais arriscada (reescreve páginas que **funcionam**) e a menos urgente — vem por último, uma página por commit

### Regra de ouro desta feature

Se **T005 não passar**, nada mais importa: o Tailwind continua inerte e toda classe utilitária escrita nas 30 tasks seguintes é texto morto no HTML. Este gate não é negociável.
