# FocusFlow — Documentação do projeto

Plataforma de micro-aprendizado com IA para estudantes (com foco em pedagogia
ADHD-friendly). O aluno escolhe um tema, a IA diagnostica o nível dele, monta um
plano de aula, ensina passo a passo e valida com exercícios. Tudo que ele faz
vira XP, minutos de estudo e ofensiva (streak) diária.

Este documento é o ponto de entrada. Documentos complementares:

| Documento | Cobre |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Decisões de escalabilidade: cache Redis, trade-offs, gargalos |
| [`supabase/README.md`](./supabase/README.md) | Política de migrações e diagnóstico do banco |
| [`specs/001-xp-persistence-3d-ui/`](./specs/001-xp-persistence-3d-ui/) | Spec completa da persistência de XP + camada de dados |
| [`specs/002-design-system-mobile/`](./specs/002-design-system-mobile/) | Spec do design system Tailwind v4 + mobile |
| [`load-tests/`](./load-tests/) | Baseline e resultados dos testes de carga (k6) |

---

## 1. Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2.6 (App Router), React 19.2.4 |
| Linguagem | TypeScript 5 |
| Banco / Auth | Supabase (Postgres + Auth + RLS + Realtime) |
| Cache | Upstash Redis (via HTTP/REST) |
| IA | Groq — `llama-3.3-70b-versatile` |
| Estilo | CSS inline + `<style>` por página; Tailwind v4 instalado mas **inerte** (ver §10) |
| Gráficos | Recharts |
| Animação | Framer Motion, Lottie, Spline (3D) |
| Ícones | lucide-react |
| Testes | Vitest 4 (`tests/**/*.test.ts`, ambiente node) |
| Deploy | Vercel (região iad1) |

---

## 2. Como rodar

```bash
npm install
npm run dev      # http://localhost:3000
```

Scripts disponíveis:

| Script | Faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (gate da Vercel) |
| `npm run start` | Serve o build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (17 testes de contrato da camada de dados) |

### Variáveis de ambiente

Crie `.env.local` na raiz (já coberto pelo `.gitignore` via `.env*`):

| Variável | Usada em | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente browser e server (`lib/data/supabase/client.ts`, `lib/server.ts`, `app/auth/callback`) | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Idem | Sim |
| `GROQ_API_KEY` | Todas as rotas de IA | Sim |
| `UPSTASH_REDIS_REST_URL` | `lib/redis.ts` (via `Redis.fromEnv()`) | Só para o cache |
| `UPSTASH_REDIS_REST_TOKEN` | Idem | Só para o cache |

O Redis é **fail-open**: toda chamada está em `.catch(() => null)`. Sem as
variáveis do Upstash, o cache simplesmente não funciona e a app vai direto ao
Postgres — mais lenta, mas não quebra.

O redirect de OAuth usa `window.location.origin`, então funciona em local e em
produção sem configuração extra.

---

## 3. Estrutura de pastas

```
app/                      Rotas (App Router)
  page.tsx                Landing pública (login/signup)
  layout.tsx              AuthProvider + MethodProvider
  dashboard|study|study-session|progress|
  methods|friends|chat|parents|profile|onboarding/
  api/                    Rotas serverless (§5)
  auth/callback/          Troca do code OAuth por sessão (cookies SSR)

components/
  AuthContext.tsx         Sessão + perfil global (§6)
  AuthGuard.tsx           Redireciona não-logado / sem-perfil
  layout/AppShell.tsx     Casca autenticada (sidebar + topbar mobile)
  layout/Sidebar.tsx
  AvatarUpload, ChatWindow, FlowMascot, Card, SweepCard, AnimatedBg,
  Streakflame, MethodContext, three/SplineScene.tsx (WIP, não importado)

lib/
  data/                   Camada de dados (§7) — a única que deveria falar com o banco
    types.ts              Tipos de domínio (camelCase)
    repositories.ts       Interfaces (contratos)
    index.ts              getDataLayer() / createMemoryDataLayer()
    errors.ts             DataLayerError + isRetryable
    supabase/             Implementação real
    memory/               Fake em memória (usado pelos testes)
  supabase.ts             Re-export do client browser
  server.ts               Client Supabase server-side (cookies)
  redis.ts                Client Upstash
  streak.ts, age.ts       Regras puras (meta diária, idade)
  friends.ts, chat.ts     Acesso direto ao Supabase (fora da camada de dados — §7)
  usePresence.ts, useFriendsPresence.ts   Realtime presence

supabase/
  migrations/             SQL versionado, append-only (§8)
  diagnostics/00_diagnose.sql   Somente-leitura, rode antes de migrar
  APPLY_PENDING.sql       Bundle 0001–0004 para colar no SQL Editor

tests/data/               Testes de contrato (streak, xp) contra o fake em memória
load-tests/               Scripts k6 + resultados medidos
specs/                    Specs Speckit (001, 002)
```

---

## 4. Páginas

Todas as páginas internas são `'use client'` e envolvidas por `AppShell`, que
por sua vez aplica o `AuthGuard`.

| Rota | O que faz |
|---|---|
| `/` | Landing pública. Login/signup (email+senha e Google OAuth), features, cena 3D |
| `/onboarding` | Primeiro acesso: nome de exibição, data de nascimento, opção de acompanhamento parental. Faz `upsert` em `profiles` |
| `/dashboard` | Visão geral: XP, minutos, meta diária (20 min), gráfico de atividade, quizzes recentes |
| `/study` | Quiz gerado por IA. Escolhe tema + nível + nº de questões, responde contra o relógio, ganha XP |
| `/study-session` | Sessão de aula completa: diagnóstico → nível → plano de 5 passos → ensino passo a passo → exercício → feedback |
| `/progress` | Histórico: XP por dia, quizzes por dificuldade, conquistas |
| `/methods` | Catálogo de métodos de estudo (Pomodoro, Feynman, Cornell, Active Recall, Repetição Espaçada, Interleaving). Escolha salva em `localStorage` |
| `/friends` | Código de convite, pedidos de amizade, lista de amigos com presença em tempo real, chat |
| `/chat` | FlowBot — chat livre com a IA |
| `/parents` | Painel de acompanhamento parental (**dados hardcoded** — ver §10) |
| `/profile` | Edita nome de exibição, telefone e avatar |

### Regras de XP (onde os números vivem)

| Fluxo | Fórmula | Arquivo |
|---|---|---|
| Quiz | `acertos × xpPorQuestão + 20 de bônus se gabaritar`, onde xpPorQuestão = 8 (fácil) / 12 (médio) / 18 (difícil) | `app/study/page.tsx:63-64` |
| Sessão de estudo | `nº de passos × 10` XP, minutos = soma dos `estimatedMinutes` do plano | `app/study-session/page.tsx:222-223` |
| Meta diária | 20 minutos (constante `DAILY_GOAL`, duplicada em `lib/streak.ts`, `app/dashboard/page.tsx` e no RPC SQL) | — |

---

## 5. API

Todas as rotas de IA usam Groq `llama-3.3-70b-versatile`, fazem retry (2-3
tentativas com temperatura decrescente) e forçam `response_format: json_object`
quando esperam JSON. Nenhuma delas exige autenticação.

| Rota | Método | Body | Resposta |
|---|---|---|---|
| `/api/chat` | POST | `{ messages: [{role, content}] }` | `{ reply }` — FlowBot, responde no idioma do aluno |
| `/api/level-check` | POST | `{ topic }` | `{ questions: [4 questões calibradas], levelLabels }` |
| `/api/lesson-plan` | POST | `{ topic, level: 'iniciante'\|'intermediario'\|'avancado' }` | `{ steps: [{title, description, estimatedMinutes}] }` — exatamente 5 |
| `/api/lesson-step` | POST | `{ topic, level, stepTitle, stepDescription, attemptNumber }` | `{ content: { explanation, examples, exercise } }`. `attemptNumber > 0` força uma explicação diferente |
| `/api/check-answer` | POST | `{ topic, stepTitle, exercise, studentAnswer }` | `{ result: { correct, feedback } }`. Múltipla escolha corrige localmente e só pede o texto à IA; free-text a IA julga |
| `/api/generate-quiz` | POST | `{ topic, level, count }` (5–20, default 5) | `{ questions: [{q, opts, correct, exp}] }` |
| `/api/study-guide` | POST | `{ method, topic }` | `{ guide }` — plano de estudo no método escolhido |
| `/api/profile` | GET | — | `{ profile, cached }`. Autenticada (cookies). Cache Redis 300s em `profile:{id}` |
| `/api/profile` | DELETE | — | `{ invalidated: true }`. Invalida o cache do próprio perfil |
| `/api/quiz` | POST | `{ messages }` | `{ reply }` — **rota quebrada, ver §10** |
| `/api/health` | GET | — | `{ status, supabase: {connected, latency_ms, profiles_count}, timestamp, cached }`. Cache Redis 30s |
| `/auth/callback` | GET | `?code=` | Troca o code OAuth por sessão via cookies e redireciona para `/dashboard` |

---

## 6. Autenticação e sessão

O estado de auth vive todo em `components/AuthContext.tsx`, exposto por
`useAuth()`: `{ user, profile, loading, signOut, refreshProfile, updateStatus }`.

**Fluxo de boot:**

1. `supabase.auth.getSession()` resolve a sessão inicial e carrega o perfil.
2. `onAuthStateChange` reage a login/logout. A chamada de `loadProfile` está
   dentro de um `setTimeout(…, 0)` **de propósito**: chamar o cliente Supabase
   direto de dentro do callback causa deadlock e trava o dashboard em loading
   infinito (corrigido no commit `5c1b46b`). Não remova o `setTimeout`.
3. Um heartbeat atualiza `profiles.last_seen` a cada 30s enquanto houver usuário.

**Fetch do perfil:** `components/AuthContext.tsx:58` (`loadProfile`) — é a leitura
canônica; o resto do app consome via `useAuth().profile` ou `refreshProfile()`.

**Guarda de rota** (`components/AuthGuard.tsx`): sem usuário → `/`; com usuário
mas sem perfil → `/onboarding`; com perfil e em `/onboarding` → `/dashboard`.

**Presence:** canal Realtime `global-presence` com key = userId; cada cliente faz
`track({ userId, status: 'idle'|'studying', studyingTopic, onlineAt })`.

---

## 7. Camada de dados

Motivação (spec 001, User Story 2): o Supabase é o provedor atual, mas existe a
intenção de trocar de banco. O objetivo é que a migração futura mexa só em
`lib/data/`, sem tocar em telas.

**Contratos** (`lib/data/repositories.ts`): `ProfileRepository`, `XpRepository`,
`StreakRepository`, `QuizRepository`, `FriendsRepository`, `ChatRepository`,
reunidos no tipo `DataLayer`.

**Duas implementações:**
- `getDataLayer()` — Supabase, singleton preguiçoso.
- `createMemoryDataLayer()` — fake em memória, usado pelos testes. Prova o
  desacoplamento: os 17 testes rodam sem nenhum Supabase.

**Erros:** tudo vira `DataLayerError` com um `code`
(`network | conflict | not_found | unauthorized | validation | unknown`).
Só `network` é `retryable` — as telas usam `isRetryable(e)` para decidir entre
oferecer "tentar de novo" e falhar de vez.

**Idempotência:** `awardXp` e `recordStudyActivity` exigem uma `idempotencyKey`
(UUID gerado no cliente por atividade). Retry com a mesma chave devolve
`duplicate: true` e não credita nada. É o que torna seguro o botão "tentar
de novo" depois de uma falha de rede.

### Estado real da migração (importante)

A spec 001 exige que **nenhuma tela acesse o banco diretamente** (FR-005/SC-003),
e o `supabase/README.md` chama isso de "regra de lint". **Essa regra não existe**
— `eslint.config.mjs` não tem nenhum `no-restricted-imports`. Hoje o estado é
misto:

| Consome via camada de dados | Acessa o Supabase direto |
|---|---|
| `app/study` (quiz + XP) | `components/AuthContext.tsx` (perfil, last_seen) |
| `app/study-session` (streak) | `app/profile`, `app/onboarding`, `components/AvatarUpload` |
| `app/progress` (XP diário, quizzes) | `app/dashboard`, `app/page.tsx` |
| | `lib/friends.ts`, `lib/chat.ts` |

E em `lib/data/index.ts`, os repositórios `profiles`, `friends` e `chat` da
implementação Supabase são stubs que lançam `DataLayerError` ("ainda não
implementado — T026/T027/T028"). A camada está completa para XP, streak e
quizzes; o resto ainda não migrou.

---

## 8. Banco de dados

Fonte da verdade dos contratos:
[`specs/001-xp-persistence-3d-ui/contracts/database-rpc.md`](./specs/001-xp-persistence-3d-ui/contracts/database-rpc.md)
e [`data-model.md`](./specs/001-xp-persistence-3d-ui/data-model.md).

```
profiles 1 ──── * xp_events      (ledger append-only de todo ganho de XP)
profiles 1 ──── * quiz_results   (existente; origem dos eventos source='quiz')
profiles 1 ──── * friendships
profiles 1 ──── * messages
```

### `profiles`

Além dos campos de identidade (`full_name`, `display_name`, `birth_date`,
`phone`, `avatar_url`, `parent_email`, `wants_parental`, `invite_code`,
`last_seen`, `studying_topic`), carrega os campos de gamificação: `xp`,
`total_minutes`, `streak_days`, `last_streak_date`, `minutes_today`,
`minutes_today_date`.

**Invariante:** os campos de gamificação **só mudam via RPC**. `profiles.xp` é o
agregado materializado e a fonte de verdade do total exibido em todas as telas.

### `xp_events`

Ledger append-only. Colunas: `id`, `user_id`, `amount` (CHECK > 0), `source`
(`quiz|study_session|lesson|backfill`), `source_id`, `idempotency_key`,
`created_at`.

- `UNIQUE (user_id, idempotency_key)` — o pilar da não-duplicação.
- Índice `(user_id, created_at DESC)` — consulta dominante (histórico recente).
- RLS: `SELECT` só do próprio usuário. **Sem** policy de INSERT/UPDATE/DELETE —
  clientes não escrevem aqui; toda escrita passa pelos RPCs `SECURITY DEFINER`.

### RPCs

Ambos derivam o usuário de `auth.uid()` (nunca de parâmetro — isso corrige o
`add_xp` legado, que aceitava `p_user_id` do cliente), gravam evento e agregado
na mesma transação, e tratam conflito de chave como resposta normal com
`duplicate: true`. Execução concedida só a `authenticated`.

**`award_xp(p_amount, p_source, p_idempotency_key, p_source_id)`**
→ `{ xp_total, duplicate }`. `source` ∈ (`quiz`, `lesson`).

**`record_study_activity(p_minutes, p_xp, p_idempotency_key, p_tz)`**
→ `{ xp_total, streak_days, minutes_today, goal_hit_today, duplicate }`.
Faz minutos do dia + meta diária (20 min) + streak + XP numa transação, com
`SELECT … FOR UPDATE` no perfil para serializar duas abas concorrentes. A data é
calculada no fuso do usuário (`p_tz`, default `America/Sao_Paulo`), não em UTC —
o aluno estudando às 23h não pode ter a sessão contada no dia seguinte. O cliente
envia o fuso real via `Intl.DateTimeFormat().resolvedOptions().timeZone`.

Lógica da streak: ao **cruzar** a meta pela primeira vez no dia, se o último dia
com meta batida foi ontem, incrementa; se já foi hoje, mantém; caso contrário,
reinicia em 1.

### Migrações

Política **append-only**: nunca edite uma migração aplicada — crie uma nova.
Aplicar em ordem numérica pelo SQL Editor do Supabase (ou `supabase db push`).

| Arquivo | O que faz |
|---|---|
| `0000_base_schema.sql` | **Não escrito** — baseline (`profiles`, `quiz_results`, `friendships`, `messages`), criado à mão antes do SQL ser versionado. Rode `diagnostics/00_diagnose.sql` para saber o que já existe |
| `0001_xp_events.sql` | Tabela `xp_events` + RLS + índices |
| `0002_award_xp.sql` | RPCs `award_xp` e `record_study_activity` |
| `0003_backfill.sql` | Backfill do histórico a partir de `quiz_results`. **Não altera `profiles.xp`** (FR-011/SC-006) |
| `0004_fix_record_study_activity_date_cast.sql` | **Corrige bug de 0002** — ver abaixo |
| `0005_drop_add_xp.sql` | **Não escrito** — remove o RPC legado `add_xp`. Aplicar só depois do deploy do código que usa `award_xp` |

Divergência esperada e aceita: `SUM(xp_events.amount) <= profiles.xp` para
usuários antigos, porque o XP de sessões anteriores nunca teve registro
individual. O histórico é completo daqui pra frente.

**O bug da 0004** (achado em teste E2E contra o banco real): em `0002`, as
variáveis `v_today`/`v_last` são `text` (para comparar com as colunas convertidas
via `::text` no SELECT), mas o UPDATE final gravava esses valores direto em
`minutes_today_date` e `last_streak_date`, que são `date`. O Postgres não faz
essa coerção implícita num UPDATE, então a função falhava **sempre** com
`42804` — nenhuma sessão de estudo registrava minutos nem streak. A 0004
adiciona o cast explícito (`v_today::date`).

**Antes de aplicar em produção:** anote o XP total de uma conta de teste e
confira depois que nada mudou (critério SC-006).

---

## 9. Cache e performance

Detalhes completos e trade-offs em [`ARCHITECTURE.md`](./ARCHITECTURE.md).

Padrão **cache-aside** com Upstash Redis: tenta o Redis; em miss, busca no
Postgres e popula com TTL. Upstash foi escolhido por expor Redis via HTTP/REST —
um client TCP tradicional (ioredis) mantém conexão persistente, inadequada para
o modelo serverless da Vercel.

| Chave | TTL | Onde |
|---|---|---|
| `health:status` | 30s | `app/api/health/route.ts` |
| `profile:{userId}` | 300s | `app/api/profile/route.ts` (DELETE invalida) |

Resultado medido no `/api/health` (k6, 5→20→50→100 VUs, 3m30s):

| Métrica | Sem cache | Com cache | Ganho |
|---|---|---|---|
| HTTP P95 | 2130ms | 211ms | ~10x |
| HTTP Max | 38.57s | 703ms | ~54x |
| Supabase P95 | 1828ms | 421ms | ~4x |
| Throughput | 18.6/s | 26.5/s | ~1.4x |
| Error rate | 0.19% | 0.00% | zerou |

O ganho não está na mediana (que já era razoável) e sim no **long tail**: o
gargalo era o connection pool do Supabase free tier saturando sob concorrência.

**Gargalos conhecidos:**
1. **Groq é o teto principal** — free tier ~100k tokens/dia. Os endpoints de IA
   geram conteúdo único por request, então não são cacheáveis. É o limitador de
   quantos usuários geram conteúdo ao mesmo tempo.
2. **Supabase free tier** — o cache alivia leituras, mas escritas (XP, quizzes)
   ainda vão ao banco.

---

## 10. Estado atual e dívidas conhecidas

Gates verdes: `tsc --noEmit` limpo, 17/17 testes Vitest passando, `next build`
gerando 23 rotas.

Itens abertos, do mais grave para o menos:

1. **`/api/quiz` está quebrada.** O system prompt da rota é um texto de anotação
   sobre i18n que sobrou no lugar da instrução real (`app/api/quiz/route.ts:1087`).
   A rota é uma cópia de `/api/chat` e aparentemente não é chamada por nenhuma
   tela — candidata a deleção.
2. **`/parents` exibe dados hardcoded.** `weekData` e `hourData` são constantes
   fixas no arquivo; o painel parental não lê o banco.
3. **A fronteira da camada de dados não é imposta** (§7). A regra de lint que a
   spec e o `supabase/README.md` mencionam não existe. Metade das telas ainda
   acessa o Supabase direto, e `profiles`/`friends`/`chat` na implementação
   Supabase são stubs que lançam erro.
4. **Migrações `0000` e `0005` não escritas.** O schema base nunca foi
   versionado; o RPC legado `add_xp` continua vivo em produção.
5. **Tailwind v4 está instalado mas inerte** (spec 002). O `globals.css` usa
   diretivas v3 e nenhum componente usa utilitário Tailwind. Como consequência,
   `friends`, `methods`, `chat` e `onboarding` são estilizadas 100% com
   `style={{}}` inline — que não aceita `@media` — e por isso estão quebradas no
   celular. As outras páginas usam `<style>` + `@media` manual e funcionam. São
   dois modelos de estilo convivendo.
6. **`components/three/SplineScene.tsx` é WIP** e não está importado em lugar
   nenhum (task T035 da spec 001 ainda aberta).
7. **A constante da meta diária (20 min) está triplicada** — `lib/streak.ts`,
   `app/dashboard/page.tsx` e o RPC SQL. Mudar exige tocar nos três.
8. **`.specify/memory/constitution.md` é template não preenchido.**

---

## 11. Deploy

Vercel, região iad1, deploy automático a partir do `main`. O gate é o
`next build`. As cinco variáveis de ambiente da §2 precisam estar configuradas
no projeto Vercel.

Ordem correta de um deploy que envolva banco:

1. Rode `supabase/diagnostics/00_diagnose.sql` (somente-leitura) para ver o
   estado real do banco.
2. Anote o XP total de uma conta de teste (verificação SC-006).
3. Aplique as migrações pendentes em ordem — `supabase/APPLY_PENDING.sql` já
   traz o bundle 0001–0004 pronto para colar no SQL Editor.
4. Confira que o XP da conta de teste não mudou.
5. Faça o deploy do código.

Se `award_xp` aparecer como `AUSENTE` no diagnóstico, o app **não credita XP
nenhum**: o quiz salva o resultado mas o total fica parado em zero, e
dashboard/progress ficam vazios.

---

## 12. Convenções

- **Nada de comentários no código** — o commit `413cbbd` removeu todos
  deliberadamente. O SQL é a exceção: as migrações são fortemente comentadas,
  porque registram o porquê das decisões.
- **Domínio em camelCase, banco em snake_case.** A tradução acontece só dentro
  de `lib/data/supabase/*` (`toDomain`).
- **Migrações são append-only.** Nunca edite uma já aplicada.
- **Toda escrita de XP precisa de `idempotencyKey`.**
- **Next.js 16 tem breaking changes** em relação a versões anteriores. Consulte
  `node_modules/next/dist/docs/` antes de escrever código de rota
  (ver `AGENTS.md`).
- O projeto usa [Speckit](./.specify/) para specs: `spec.md` → `plan.md` →
  `tasks.md` por feature, em `specs/NNN-nome/`.
