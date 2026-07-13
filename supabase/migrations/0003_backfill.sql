-- 0003_backfill.sql
-- Popula o histórico (xp_events) a partir dos quizzes já gravados.
--
-- IMPORTANTE: NÃO altera profiles.xp — os totais atuais dos usuários são
-- preservados exatamente como estão (FR-011 / SC-006). É esperado que
-- SUM(xp_events.amount) <= profiles.xp para usuários antigos, porque o XP
-- de sessões de estudo anteriores nunca teve registro individual.
--
-- Idempotente: re-execução conflita na unique key e não insere nada.

insert into public.xp_events
  (user_id, amount, source, source_id, idempotency_key, created_at)
select
  q.user_id,
  q.xp_earned,
  'backfill',
  q.id::text,
  'backfill-quiz-' || q.id::text,
  q.created_at
from public.quiz_results q
where coalesce(q.xp_earned, 0) > 0
on conflict (user_id, idempotency_key) do nothing;
