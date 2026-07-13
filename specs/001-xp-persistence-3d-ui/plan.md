# Implementation Plan: Persistência de XP confiável + Redesign visual 3D

**Branch**: `001-xp-persistence-3d-ui` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-xp-persistence-3d-ui/spec.md`

**Contexto adicional do usuário (plan)**: projeto de portfólio para contratação — a qualidade percebida importa tanto quanto a funcionalidade. Prioridades declaradas: (1) SaaS realmente útil, (2) "backend belíssimo" (arquitetura de dados exemplar, legível por recrutadores/tech leads), (3) Spline para interações 3D no site.

## Summary

O FocusFlow hoje grava XP de forma inconsistente: quizzes usam um RPC `add_xp` + tabela `quizzes`, sessões de estudo usam read-modify-write não-atômico em `lib/streak.ts`, e o gráfico "XP por dia" lê apenas de `quizzes` — XP de sessão soma no total mas nunca aparece no histórico. Além disso, 13 arquivos de páginas/componentes importam o cliente Supabase diretamente.

A entrega tem três frentes, em ordem de dependência:

1. **Ledger de XP + escrita atômica (P1)**: nova tabela `xp_events` como fonte única de histórico, RPCs Postgres atômicos e idempotentes (`award_xp`, `record_study_activity`) que inserem o evento e incrementam `profiles.xp` na mesma transação, com backfill dos dados existentes.
2. **Camada de repositórios (P2)**: contratos TypeScript (`ProfileRepository`, `XpRepository`, `StreakRepository`, `QuizRepository`, `FriendsRepository`, `ChatRepository`) em `lib/data/`, implementação Supabase isolada, fake em memória para testes, e regra de lint que proíbe importar `@/lib/supabase` fora de `lib/data/` (torna SC-003 verificável no CI).
3. **Redesign 3D (P3)**: cena Spline interativa na landing via wrapper `<SplineScene>` (lazy, `ssr: false`, poster estático de fallback, timeout, `prefers-reduced-motion`), acentos 3D pontuais e polimento visual nas telas internas.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19.2.4, Next.js 16.2.6 (App Router)

**Primary Dependencies**: `@supabase/supabase-js` 2.x + `@supabase/ssr` (auth + Postgres), `framer-motion` 12, Tailwind CSS 4, `recharts` 3, `lottie-react`, `@anthropic-ai/sdk` / `groq-sdk` (rotas de IA). **A adicionar**: `@splinetool/react-spline` + `@splinetool/runtime` (cena 3D); `vitest` (dev, testes da camada de dados).

**Storage**: Supabase Postgres, acessado exclusivamente via camada de repositórios em `lib/data/`. Escritas de XP/streak via RPCs Postgres (transacionais). RLS permanece a fronteira de segurança.

**Testing**: Vitest — testes de contrato dos repositórios rodando contra o fake em memória; regra ESLint `no-restricted-imports` como verificação arquitetural (SC-003); validação manual roteirizada em `quickstart.md`.

**Target Platform**: Web (Vercel), desktop + celulares intermediários; navegadores evergreen. Degradação graciosa sem WebGL.

**Project Type**: Web app — projeto Next.js único (App Router), sem backend separado. O "backend" é a camada de dados + SQL versionado em `supabase/` + rotas de IA existentes em `app/api/`.

**Performance Goals**: Landing interativa (cena 3D respondendo) ≤ 3s em banda larga (SC-004); runtime Spline carregado só na landing e sob demanda; telas de estudo sem regressão de fluidez (SC-005); animações respeitam `prefers-reduced-motion` (FR-009).

**Constraints**:
- Nenhuma importação do cliente de banco fora de `lib/data/` (FR-005, verificado por lint).
- XP nunca perdido nem duplicado: incremento atômico no servidor + chave de idempotência (FR-001/FR-004, edge case de duas abas).
- Migração preserva 100% do XP/progresso existente (FR-011/SC-006): backfill aditivo, sem `UPDATE` destrutivo em `profiles.xp`.
- App hoje é 100% client-side (23 arquivos `'use client'`, auth via `AuthContext` no browser). Esta feature **não** migra auth para cookies/SSR — os repositórios são contratos independentes de transporte, então essa evolução fica possível sem retrabalho (ver research.md, D5).

**Scale/Scope**: SaaS de portfólio, ~12 telas, base pequena de usuários reais; escopo de ~6 repositórios, 2 RPCs, 1 tabela nova, 1 cena Spline na landing + polimento de telas internas.

**Observações desta versão do Next.js** (docs em `node_modules/next/dist/docs/`, que divergem do conhecimento prévio):
- Mutação de dados idiomática é via Server Functions (`'use server'`); route handlers continuam válidos. Não aplicável de imediato (app client-side), mas os contratos dos repositórios devem permitir implementação server-side futura.
- `next/dynamic` com `ssr: false` só funciona dentro de Client Components — o wrapper `<SplineScene>` deve ser ele próprio `'use client'`.
- Existe validação `unstable_instant` + `cacheComponents` para navegação instantânea; `next.config.ts` atual está vazio e o app é client-side, então **fora do escopo**, mas o redesign não deve introduzir padrões que bloqueiem adoção futura.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` ainda é o template não preenchido — **não há princípios ratificados para este projeto**, portanto não há gates específicos a violar. Gate: **PASS (vacuoso)**.

Na ausência de constituição, este plano se autoimpõe três princípios mínimos (candidatos a constituição futura via `/speckit-constitution`):

1. **Fonte de verdade no servidor**: nenhum valor de XP/streak calculado apenas no cliente é persistido sem passar por RPC atômico.
2. **Fronteira de dados única**: todo acesso a dados passa por `lib/data/`; violações quebram o lint.
3. **Degradação graciosa**: todo recurso visual pesado (3D, animação) tem fallback e respeita `prefers-reduced-motion`.

**Re-check pós-Phase 1**: PASS — o design (data-model, contracts) não introduz projetos extras, frameworks novos além do Spline (exigido pela spec) e Vitest (necessário para o teste de contrato exigido pela User Story 2).

## Project Structure

### Documentation (this feature)

```text
specs/001-xp-persistence-3d-ui/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões técnicas (D1–D8)
├── data-model.md        # Phase 1 — entidades, tabela xp_events, migração/backfill
├── quickstart.md        # Phase 1 — roteiro de validação ponta a ponta
├── contracts/
│   ├── data-layer.md    # Contratos TypeScript dos repositórios
│   └── database-rpc.md  # Contratos SQL dos RPCs atômicos
└── tasks.md             # Phase 2 (/speckit-tasks — ainda não criado)
```

### Source Code (repository root)

```text
app/                          # App Router (Next.js 16) — telas existentes
├── page.tsx                  # Landing/login → recebe a cena Spline (P3)
├── dashboard/ profile/ progress/ study/ study-session/  # telas que exibem/geram XP
├── friends/ chat/ methods/ onboarding/ parents/ auth/
└── api/                      # rotas de IA existentes (chat, quiz, lesson-*)
    └── study-guide/roude.ts  # ⚠ typo pré-existente (roude→route): endpoint morto; corrigir na implementação

components/
├── AuthContext.tsx           # perfil/XP em contexto — passa a ler via repositórios
├── three/                    # NOVO (P3)
│   ├── SplineScene.tsx       # wrapper client: lazy, fallback, timeout, reduced-motion
│   └── posters/              # imagens estáticas de fallback (ou em public/)
└── ...                       # demais componentes (polimento visual in place)

lib/
├── data/                     # NOVO — única fronteira com o banco (P2)
│   ├── types.ts              # entidades de domínio (Profile, XpEvent, QuizResult…)
│   ├── repositories.ts       # interfaces (contratos) — ver contracts/data-layer.md
│   ├── supabase/             # implementação Supabase (client + repos + RPC calls)
│   │   ├── client.ts         # absorve o atual lib/supabase.ts
│   │   └── *.repository.ts
│   ├── memory/               # fake em memória (testes de contrato)
│   └── index.ts              # fábrica/provider dos repositórios
├── streak.ts                 # lógica migra para RPC record_study_activity + repo
└── supabase.ts               # REMOVIDO ao final (absorvido por lib/data/supabase/)

supabase/                     # NOVO — SQL versionado ("backend belíssimo")
└── migrations/
    ├── 0001_xp_events.sql    # tabela xp_events + RLS + índices
    ├── 0002_award_xp.sql     # RPCs award_xp / record_study_activity
    └── 0003_backfill.sql     # backfill de histórico a partir de quizzes

tests/
└── data/                     # Vitest — contrato dos repositórios (roda no fake)
```

**Structure Decision**: mantém o projeto Next.js único já existente (app/, components/, lib/). O desacoplamento pedido pela spec vira o novo módulo `lib/data/` (contratos + implementações), o SQL do banco passa a ser versionado em `supabase/migrations/`, e o 3D fica contido em `components/three/`. Nenhum workspace/monorepo novo — complexidade mínima para um projeto solo de portfólio.

## Complexity Tracking

> Preencher apenas se o Constitution Check tivesse violações — não há constituição ratificada e nenhum princípio autoimposto é violado.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

Nota: o padrão Repository (6 interfaces) não é over-engineering aqui — é requisito funcional explícito da spec (FR-005/FR-006, User Story 2) motivado pela intenção real de trocar de provedor de banco.

## Addendum — Schema baseline (2026-07-11)

### O problema

O plano original tratou o schema base (`profiles`, `quiz_results`, `friendships`, `messages`) como **pré-existente no Supabase** e versionou só o delta da feature (`0001`–`0003`). Duas consequências:

1. **Não há SQL versionado do baseline.** `0001` referencia `public.profiles`, `0003` referencia `public.quiz_results` — nenhum arquivo do repo cria essas tabelas. Um ambiente novo não sobe.
2. **T007 (aplicar `0001`→`0002`→`0003`) nunca foi confirmado.** Enquanto isso não roda, `award_xp`/`record_study_activity` não existem, todo `supabase.rpc(...)` de `lib/data/supabase/` falha, e a UI degrada exatamente como observado: quiz não credita, XP fica em zero, dashboard e progress vazios.

Isto é uma lacuna de **plano**, não de código: `lib/data/` já está correto contra o contrato em `contracts/database-rpc.md`.

### Restrição operacional

Ninguém consegue aplicar isso a partir do repositório: `.env.local` só tem `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` (sem service-role, sem connection string) e não há `supabase` CLI nem `psql` no ambiente. **Toda migração é aplicada à mão no SQL Editor do dashboard.** Isso torna o passo de diagnóstico obrigatório: é a única forma de saber o estado real do banco.

### Sequência de remediação

| Passo | Artefato | Estado |
|---|---|---|
| 1 | `supabase/diagnostics/00_diagnose.sql` — somente-leitura; reporta tabelas, colunas faltantes, funções, RLS/policies, contagens, sinais de cada migração, bucket `avatars`, trigger de signup, coerência `profiles.xp` × `sum(xp_events.amount)` | **pronto — aguardando execução** |
| 2 | `supabase/migrations/0000_base_schema.sql` — baseline idempotente (`create table if not exists`) das 4 tabelas + RLS + índices | **bloqueado pelo passo 1** |
| 3 | Aplicar `0000`→`0001`→`0002`→`0003` (é o T007) | bloqueado |
| 4 | `supabase/migrations/0004_drop_add_xp.sql` (T041) — o legado `add_xp` já não é chamado por nenhum código atual | bloqueado |

O passo 2 é deliberadamente **escrito só depois do diagnóstico**: se as tabelas já existirem em produção com colunas divergentes, um `0000` escrito às cegas ou não faz nada (o `if not exists` engole a divergência) ou conflita. O output do diagnóstico decide entre *criar o baseline* e *escrever um `0000_align_base_schema.sql` que só adiciona o que falta*.

### Colunas que o baseline precisa cobrir (levantadas do código)

- `profiles`: `id`, `full_name`, `display_name`, `birth_date`, `wants_parental`, `parent_email`, `phone`, `avatar_url`, `invite_code`, `last_seen`, `studying_topic`, `xp`, `total_minutes`, `streak_days`, `last_streak_date`, `minutes_today`, `minutes_today_date` (`lib/data/types.ts#Profile`)
- `quiz_results`: `id`, `user_id`, `topic`, `difficulty`, `total_questions`, `correct_answers`, `xp_earned`, `created_at` (`lib/data/supabase/quiz.repository.ts`, `app/dashboard/page.tsx`)
- `friendships`: `id`, `user_a`, `user_b`, `status`, `requested_by`, `created_at`, `accepted_at` (`lib/friends.ts`)
- `messages`: `id`, `sender_id`, `receiver_id`, `content`, `created_at`, `read_at` (`lib/chat.ts`)
