# Research — 001-xp-persistence-3d-ui

**Phase 0 do /speckit-plan** | Data: 2026-07-08

Estado atual verificado no código (base das decisões):

- XP de **quiz** (`app/study/page.tsx`): insere em `quizzes` com `xp_earned` **e** chama `supabase.rpc('add_xp', …)` — duas escritas separadas, sem transação nem idempotência (recarregar/duplo clique pode duplicar; falha entre as duas deixa inconsistente).
- XP de **sessão de estudo** (`app/study-session/page.tsx` → `lib/streak.ts#addStudyMinutes`): read-modify-write no cliente (`select` → soma em JS → `update`) — não-atômico (duas abas se sobrescrevem, edge case da spec) e **não gera registro de histórico**, então o gráfico "XP por dia" (`app/progress/page.tsx`, que lê só de `quizzes`) ignora XP de sessão. É a causa-raiz da divergência entre telas (SC-002).
- **13 arquivos** de `app/`, `components/` e `lib/` importam `@/lib/supabase` diretamente (viola FR-005).
- Cliente único: `createBrowserClient` (`@supabase/ssr`) — app inteiramente client-side, auth no browser via `AuthContext`.
- Endpoint morto pré-existente: `app/api/study-guide/roude.ts` (typo de `route.ts`).

---

## D1 — Ledger de XP: tabela `xp_events` + incremento atômico

**Decision**: criar tabela `xp_events` (id, user_id, amount, source, source_id, idempotency_key, created_at) como fonte única de histórico. Toda concessão de XP passa por RPC Postgres que, **na mesma transação**: (1) insere o evento, (2) incrementa `profiles.xp`. Unicidade em `(user_id, idempotency_key)` garante idempotência: retry após falha de rede não duplica crédito (FR-001/FR-004).

**Rationale**: resolve de uma vez os três defeitos verificados — atomicidade (edge case duas abas: `UPDATE profiles SET xp = xp + amount` é atômico no Postgres), duplicação (chave de idempotência gerada no cliente por atividade, ex.: UUID da sessão/quiz) e histórico completo (o gráfico "XP por dia" passa a ler de `xp_events`, cobrindo sessões e quizzes). `profiles.xp` vira agregado materializado do ledger — padrão event-sourcing simplificado, legível e defensável em portfólio.

**Alternatives considered**:
- *Só corrigir o `update` com RPC de incremento (sem tabela de eventos)*: resolve atomicidade mas não o histórico (FR-003 exige data/quantidade/origem) nem a idempotência.
- *Calcular XP total sempre por `SUM(xp_events)`*: mais puro, porém exige backfill perfeito de todo o passado (impossível — XP de sessões antigas nunca foi registrado como evento) e encarece leituras frequentes (sidebar). O agregado em `profiles.xp` preserva os totais atuais por construção (FR-011).

## D2 — RPCs: `award_xp` e `record_study_activity`

**Decision**: dois RPCs `SECURITY DEFINER` com `auth.uid()` como fonte do usuário (nunca parâmetro do cliente):
- `award_xp(amount, source, source_id, idempotency_key)` — genérico (quiz, lição); retorna o novo total. Substitui o `add_xp` atual (que é mantido durante a transição e depois removido).
- `record_study_activity(minutes, xp, idempotency_key)` — versão transacional da lógica de `lib/streak.ts` (minutos do dia, meta diária, streak) **mais** o ganho de XP via mesmo mecanismo do ledger. Toda a decisão de streak (comparação de datas) migra do JS para o SQL, eliminando o read-modify-write.

**Rationale**: streak + minutos + XP mudam juntos numa sessão concluída; separá-los em várias chamadas recria a janela de inconsistência. `auth.uid()` no servidor fecha o buraco de um cliente creditar XP para outro usuário. Primeiro acesso sem perfil: o RPC faz upsert do perfil (edge case da spec).

**Alternatives considered**:
- *Server Actions do Next.js fazendo a orquestração*: idiomático nesta versão do Next (docs `07-mutating-data`), mas exigiria migrar a sessão de auth para cookies (`@supabase/ssr` server client) — mudança transversal que a spec não pede. Fica viabilizado pelo D5 sem ser feito agora.
- *Manter lógica de streak no cliente e só atomizar o XP*: deixa o edge case de duas abas vivo para streak/minutos.

## D3 — Backfill e compatibilidade de dados existentes

**Decision**: migração em três passos, todos aditivos: (1) criar `xp_events` + RLS (select próprio; insert **apenas** via RPC); (2) backfill de eventos históricos a partir de `quizzes` (`xp_earned`, `created_at`, source='quiz', source_id=quiz.id); (3) **não** recalcular `profiles.xp` — o total atual é preservado como está (FR-011/SC-006). A diferença entre `profiles.xp` e `SUM(xp_events)` é esperada (sessões antigas sem registro) e documentada.

**Rationale**: zero risco de perda de progresso; o gráfico "XP por dia" fica correto do deploy em diante e aproveita o histórico de quizzes que já existe.

**Alternatives considered**: *recalcular totais a partir do backfill* — reduziria o XP de usuários que ganharam XP por sessões (dados nunca registrados), violando FR-011 diretamente.

## D4 — Camada de repositórios em `lib/data/`

**Decision**: interfaces por agregado — `ProfileRepository`, `XpRepository`, `StreakRepository`, `QuizRepository`, `FriendsRepository`, `ChatRepository` (contratos em `contracts/data-layer.md`) — com duas implementações: `supabase/` (produção) e `memory/` (fake para testes de contrato). Acesso via fábrica única (`lib/data/index.ts`); telas e hooks recebem os repositórios, nunca o cliente. Tipos de domínio próprios em `lib/data/types.ts` (sem tipos do Supabase vazando).

**Rationale**: é o requisito FR-005/FR-006 na forma mais simples que funciona. O fake em memória viabiliza o Independent Test da User Story 2 ("um repositório fake consegue rodar os fluxos principais") e os testes de Vitest sem banco.

**Alternatives considered**:
- *Um "DataService" único*: menos arquivos, mas vira god-object; contratos por agregado são mais fáceis de migrar um a um para outro provedor.
- *ORM (Drizzle/Prisma) já agora*: seria a real preparação de migração, mas troca o problema (reescrever queries + auth + RLS) sem ser pedido; a spec explicitamente deixa a troca de banco fora do escopo.

## D5 — Fronteira transporte-agnóstica (evolução futura sem retrabalho)

**Decision**: os contratos dos repositórios são `async` e não expõem nada do Supabase (nem `PostgrestError`, nem realtime). Realtime/presence (`usePresence`, `useFriendsPresence`, chat subscription) é encapsulado como métodos `subscribe*(callback): Unsubscribe` nos contratos correspondentes.

**Rationale**: permite trocar a implementação por Server Actions/route handlers (padrão idiomático do Next 16) ou outro banco depois, tela nenhuma muda. É o argumento "backend belíssimo" para portfólio: fronteira limpa + SQL versionado + testes de contrato.

**Alternatives considered**: *deixar realtime fora da camada* (importando o client direto nos hooks) — violaria SC-003 (zero importações fora da camada).

## D6 — Verificação arquitetural automatizada (SC-003)

**Decision**: regra ESLint `no-restricted-imports` (flat config, `eslint.config.mjs` já existe) proibindo `@/lib/supabase*` e `@supabase/*` fora de `lib/data/`. Roda no `npm run lint` (já parte do build da Vercel).

**Rationale**: SC-003 pede inspeção automatizada; lint falhando quebra o deploy — o requisito vira gate permanente, não checagem manual.

**Alternatives considered**: *script grep custom* — funciona, mas ESLint já está no pipeline e dá erro no editor em tempo real.

## D7 — Spline na landing: wrapper com fallback

**Decision**: adicionar `@splinetool/react-spline` (+ `@splinetool/runtime`) e criar `components/three/SplineScene.tsx` (`'use client'`):
- `next/dynamic(() => import('@splinetool/react-spline'), { ssr: false })` — o runtime WebGL só existe no browser; `ssr:false` dentro de Client Component conforme docs desta versão do Next (`lazy-loading.md`).
- **Poster estático primeiro**: imagem/gradiente elegante renderiza imediatamente; a cena troca o poster quando `onLoad` dispara. Se `onError`, timeout (~4s sem load) ou ausência de WebGL → permanece o poster (SC-004, edge case navegador sem aceleração).
- `prefers-reduced-motion` → nem monta a cena; mostra o poster (FR-009).
- Carregamento sob demanda (`IntersectionObserver`/montagem só na landing) para não pesar o restante do app.
- Cena hospedada via URL do Spline (export "Code → React") com `preload` do arquivo `.splinecode` na landing.

**Rationale**: Spline é decisão registrada na spec (ferramenta do dono do produto, foco portfólio). O runtime é pesado (ordem de MB) — por isso fica restrito à landing, lazy, com fallback que mantém a página utilizável em 3G/celular fraco. Interatividade mouse/touch vem da própria cena Spline (eventos configurados no editor), atendendo FR-007 sem código extra.

**Alternatives considered**:
- *React Three Fiber/Three.js*: mais controle e bundle potencialmente menor, mas curva maior e o usuário quer justamente o workflow visual do Spline para iterar o design.
- *Vídeo/Lottie de fundo*: sem interatividade real ao cursor — não cumpre FR-007.
- *Verificar na implementação*: compatibilidade exata da versão do `@splinetool/react-spline` com React 19.2/Next 16.2 (peer deps) — se houver atrito, fallback é carregar `@splinetool/runtime` puro num `<canvas>` (API `Application`), mantendo o mesmo wrapper.

## D8 — Redesign das telas internas (acentos, não reescrita)

**Decision**: refinamento coeso in place: tokens de design (cores/sombras/raios) consolidados no `globals.css` (Tailwind 4 `@theme`), microanimações com `framer-motion` (já instalado) usando `useReducedMotion`, acentos 3D pontuais (ex.: elemento Spline leve ou render estático/imagem exportada do Spline no dashboard), tipografia e cartões padronizados (`Card.tsx`/`SweepCard.tsx`). Identidade (mascote Flow, tom lúdico PT-BR) preservada conforme Assumptions da spec.

**Rationale**: FR-008/FR-010 pedem coesão e fluidez, não nova identidade. Cenas WebGL adicionais em telas de estudo comprometeriam desempenho em celular intermediário (SC-005) — acentos 3D internos entram como imagens/vídeos exportados do Spline, não runtime ao vivo, salvo em pontos de baixo custo comprovado.

**Alternatives considered**: *runtime Spline em todas as telas* — custo de memória/bateria alto em mobile e risco direto a SC-005.

## D9 — Testes

**Decision**: Vitest (dev dependency) com testes de contrato dos repositórios: cada suite roda contra o fake `memory/` (rápido, sem rede) validando semântica dos contratos — inclusive idempotência de `awardXp` e consistência total = soma dos eventos. Verificação da implementação Supabase fica no roteiro manual do `quickstart.md` (projeto solo, sem CI de banco).

**Rationale**: é o mínimo que prova FR-005/FR-006 (User Story 2 Independent Test) e o comportamento de idempotência sem infraestrutura de teste pesada.

**Alternatives considered**: *Playwright e2e* — valor real, custo alto para o escopo; o `quickstart.md` cobre a validação ponta a ponta manualmente. Pode entrar depois.

---

Todos os NEEDS CLARIFICATION do Technical Context foram resolvidos (Testing → D9; detalhes de Spline → D7; estratégia de migração → D3).
