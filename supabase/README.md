# Banco de dados — FocusFlow (Supabase/Postgres)

SQL versionado do projeto. O código da aplicação NUNCA acessa o banco fora de `lib/data/` (regra de lint), e as colunas de gamificação (`profiles.xp`, `streak_days`, `minutes_*`, `total_minutes`) só mudam pelos RPCs definidos aqui.

## Migrações (`migrations/`)

Política **append-only**: nunca edite uma migração já aplicada — crie uma nova.

Aplicar em ordem numérica, via SQL Editor do dashboard do Supabase (ou `supabase db push` se usar o CLI):

| Arquivo | O que faz |
|---|---|
| `0000_base_schema.sql` | **AINDA NÃO ESCRITO** — baseline (`profiles`, `quiz_results`, `friendships`, `messages`). Depende do resultado de `diagnostics/00_diagnose.sql`: as tabelas podem já existir no projeto Supabase, criadas à mão antes do SQL ser versionado |
| `0001_xp_events.sql` | Ledger `xp_events` (histórico de todo ganho de XP) + RLS + índices |
| `0002_award_xp.sql` | RPCs atômicos `award_xp` e `record_study_activity` |
| `0003_backfill.sql` | Backfill do histórico a partir de `quiz_results` (não altera totais) |
| `0004_fix_record_study_activity_date_cast.sql` | **Corrige bug de 0002**: `v_today` (text) gravado direto em `minutes_today_date` (date) fazia a função falhar sempre com `42804` — nenhuma sessão de estudo registrava minutos nem streak. Achado em teste E2E contra o banco real |
| `0005_drop_add_xp.sql` | **AINDA NÃO ESCRITO** — remove o RPC legado `add_xp`; aplicar SOMENTE após o deploy do código que usa `award_xp` |

## Diagnóstico (`diagnostics/`)

Antes de aplicar qualquer migração, rode `diagnostics/00_diagnose.sql` no SQL Editor. É **somente-leitura** (só lê catálogo e faz `COUNT`) e responde: quais tabelas/colunas existem, se `award_xp`/`record_study_activity` estão lá, se o `add_xp` legado sobreviveu, se a RLS está ligada, e se `profiles.xp` bate com a soma do ledger.

Se `award_xp` aparecer como `AUSENTE`, o app **não credita XP nenhum** — o quiz salva o resultado mas o total fica parado em zero, e dashboard/progress ficam vazios.

## Aplicando

Antes de aplicar em produção: anote o XP total de uma conta de teste e confira depois que nada mudou (critério SC-006 — `specs/001-xp-persistence-3d-ui/quickstart.md`).

## Desenho (resumo)

- `xp_events` é **append-only** e a fonte do gráfico "XP por dia"; `profiles.xp` é o agregado materializado (fonte de verdade do total).
- Idempotência: `UNIQUE (user_id, idempotency_key)` — retry de rede com a mesma chave nunca duplica crédito.
- RPCs são `SECURITY DEFINER` e usam `auth.uid()`; clientes não têm policy de escrita em `xp_events`.

Detalhes: `specs/001-xp-persistence-3d-ui/contracts/database-rpc.md` e `data-model.md`.
