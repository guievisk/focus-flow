-- 0001_xp_events.sql
-- Ledger de XP: um registro por ganho, append-only.
-- profiles.xp continua sendo o agregado (fonte de verdade do total);
-- xp_events é a fonte do histórico ("XP por dia", conquistas).

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount > 0),
  source text not null check (source in ('quiz', 'study_session', 'lesson', 'backfill')),
  source_id text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  -- Pilar da não-duplicação: retry com a mesma chave é no-op.
  constraint xp_events_user_idempotency_unique unique (user_id, idempotency_key)
);

-- Consulta dominante: histórico recente de um usuário.
create index if not exists xp_events_user_created_idx
  on public.xp_events (user_id, created_at desc);

alter table public.xp_events enable row level security;

-- Usuário lê apenas os próprios eventos.
-- (drop antes de create: `create policy` não aceita `if not exists`, e a
--  migração precisa ser segura para reexecução.)
drop policy if exists xp_events_select_own on public.xp_events;
create policy xp_events_select_own
  on public.xp_events
  for select
  using (user_id = auth.uid());

-- Sem policies de INSERT/UPDATE/DELETE: clientes não escrevem aqui.
-- Toda escrita passa pelos RPCs SECURITY DEFINER (0002_award_xp.sql).
