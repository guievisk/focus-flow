# Data Model — 001-xp-persistence-3d-ui

**Phase 1 do /speckit-plan** | Decisões de base: [research.md](./research.md) D1–D3

## Visão geral

```text
profiles 1 ──── * xp_events        (ledger: todo ganho de XP)
profiles 1 ──── * quizzes          (existente; origem de eventos source='quiz')
profiles 1 ──── * friendships      (existente, inalterada)
profiles 1 ──── * messages         (existente, inalterada)
```

`profiles.xp` é o **agregado materializado** do ledger: único valor lido pelas telas (FR-002). `xp_events` é a **fonte de histórico** (FR-003) — alimenta "XP por dia" e conquistas.

## Entidades

### `profiles` (existente — sem mudança estrutural)

Campos relevantes já em produção (conforme `components/AuthContext.tsx` e `lib/streak.ts`):

| Campo | Tipo | Papel nesta feature |
|---|---|---|
| `id` | uuid (= auth.uid) | PK |
| `xp` | int | **Fonte de verdade do XP total** — só muda via RPC (incremento atômico) |
| `total_minutes` | int | Agregado de minutos — só muda via `record_study_activity` |
| `streak_days` | int | Sequência — só muda via `record_study_activity` |
| `last_streak_date` | date/text | Controle da sequência |
| `minutes_today`, `minutes_today_date` | int, date/text | Meta diária (20 min) |
| demais campos | — | Inalterados (identidade, social, presença) |

**Regra nova (invariante)**: nenhuma escrita direta de cliente em `xp`, `total_minutes`, `streak_days`, `last_streak_date`, `minutes_today*` — esses campos só mudam pelos RPCs. Reforçar via RLS/grant (update de perfil pelo cliente restrito às colunas de identidade) ou, no mínimo, por convenção da camada de dados + revisão.

### `xp_events` (NOVA)

| Campo | Tipo | Regras |
|---|---|---|
| `id` | uuid, default `gen_random_uuid()` | PK |
| `user_id` | uuid, NOT NULL, FK → profiles(id) | dono do evento; sempre `auth.uid()` no RPC |
| `amount` | int, NOT NULL, CHECK `amount > 0` | XP concedido (sem débitos nesta feature) |
| `source` | text, NOT NULL, CHECK em (`'quiz'`, `'study_session'`, `'lesson'`, `'backfill'`) | origem (FR-003) |
| `source_id` | uuid/text, NULL | referência à origem (ex.: `quizzes.id`) |
| `idempotency_key` | text, NOT NULL | gerada no cliente por atividade (UUID) |
| `created_at` | timestamptz, default `now()` | data do ganho (gráfico por dia) |

**Constraints/índices**:
- `UNIQUE (user_id, idempotency_key)` — pilar da não-duplicação (FR-001/FR-004). Retry com a mesma chave é no-op que retorna o total atual.
- Índice `(user_id, created_at DESC)` — consulta do histórico por período.

**RLS**: `SELECT` apenas do próprio usuário (`user_id = auth.uid()`); **sem** policy de `INSERT/UPDATE/DELETE` para clientes — escrita só pelos RPCs `SECURITY DEFINER`.

**Estados**: evento é imutável após inserido (append-only). Não há transições.

### `quizzes` (existente — inalterada)

Continua registrando `xp_earned` por quiz (leitura de detalhe). A concessão do XP passa a ser feita pelo RPC `award_xp` com `source='quiz'`, `source_id = quizzes.id`, na mesma ação do usuário. O gráfico "XP por dia" **deixa de ler daqui** e passa a ler de `xp_events` (cobrindo também sessões).

## Validação (mapeamento para requisitos)

| Regra | Requisito |
|---|---|
| Incremento de `profiles.xp` na mesma transação do insert em `xp_events` | FR-001 |
| `UNIQUE (user_id, idempotency_key)` + retorno idempotente | FR-001, FR-004 |
| `auth.uid()` como user_id no RPC (nunca parâmetro) | segurança (spec: fonte de verdade única) |
| Upsert de perfil no RPC quando não existe | edge case "primeiro acesso" |
| `amount > 0` | sanidade do ledger |

## Migração (ordem e reversibilidade)

1. **`0001_xp_events.sql`** — cria tabela, constraints, índices, RLS. Aditiva; rollback = drop table.
2. **`0002_award_xp.sql`** — cria `award_xp` e `record_study_activity` (contratos em [contracts/database-rpc.md](./contracts/database-rpc.md)). Mantém `add_xp` existente intocado durante a transição; removido em migração posterior à troca do código.
3. **`0003_backfill.sql`** — insere em `xp_events` um evento por linha de `quizzes` (`amount = xp_earned`, `source='backfill'`, `source_id = id`, `created_at` preservado, `idempotency_key = 'backfill-quiz-' || id`). **Não altera `profiles.xp`** (FR-011/SC-006 — totais atuais preservados por construção). Idempotente: re-execução conflita na unique key e ignora (`ON CONFLICT DO NOTHING`).

Divergência esperada e aceita: `SUM(xp_events.amount) <= profiles.xp` para usuários antigos (XP de sessões anteriores nunca teve registro individual). O histórico é completo daqui para frente.
