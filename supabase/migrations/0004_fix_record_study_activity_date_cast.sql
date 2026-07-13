-- 0004_fix_record_study_activity_date_cast.sql
--
-- Correção de bug encontrado no teste E2E contra o banco real:
--
--   ERRO 42804: column "minutes_today_date" is of type date
--               but expression is of type text
--
-- Em 0002, v_today/v_yesterday/v_last são `text` (para poder comparar com as
-- colunas convertidas via ::text no SELECT), mas o UPDATE final grava esses
-- valores direto em `minutes_today_date` e `last_streak_date`, que são `date`.
-- O Postgres não faz essa coerção implícita num UPDATE, então a função falhava
-- SEMPRE: nenhuma sessão de estudo registrava minutos nem streak.
--
-- Correção: cast explícito para `date` na escrita. A lógica é idêntica a 0002.

create or replace function public.record_study_activity(
  p_minutes integer,
  p_xp integer,
  p_idempotency_key text,
  p_tz text default 'America/Sao_Paulo'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  c_goal constant integer := 20;
  v_today text;
  v_yesterday text;
  v_inserted boolean;
  v_minutes_today integer;
  v_goal_already boolean;
  v_streak integer;
  v_last text;
  v_total integer;
  r record;
begin
  if v_user is null then
    raise exception 'record_study_activity: not authenticated';
  end if;
  if coalesce(p_minutes, 0) <= 0 then
    raise exception 'record_study_activity: minutes must be > 0';
  end if;
  if coalesce(p_xp, 0) <= 0 then
    raise exception 'record_study_activity: xp must be > 0';
  end if;
  if coalesce(p_idempotency_key, '') = '' then
    raise exception 'record_study_activity: idempotency_key required';
  end if;

  -- Data local do usuário (não UTC: o brasileiro estudando à noite não pode
  -- ter a sessão contada no dia seguinte).
  v_today := to_char((now() at time zone p_tz)::date, 'YYYY-MM-DD');
  v_yesterday := to_char((now() at time zone p_tz)::date - 1, 'YYYY-MM-DD');

  insert into public.profiles (id) values (v_user)
  on conflict (id) do nothing;

  -- A chave cobre a atividade INTEIRA (XP e minutos): inserir o evento antes
  -- de qualquer efeito garante que a duplicata não aplica nada.
  insert into public.xp_events (user_id, amount, source, idempotency_key)
  values (v_user, p_xp, 'study_session', p_idempotency_key)
  on conflict (user_id, idempotency_key) do nothing;
  v_inserted := found;

  -- Lock da linha do perfil: serializa duas abas concorrentes.
  select coalesce(minutes_today, 0)    as minutes_today,
         minutes_today_date::text      as minutes_date,
         coalesce(streak_days, 0)      as streak_days,
         last_streak_date::text        as last_date,
         coalesce(xp, 0)               as xp
    into r
    from public.profiles
   where id = v_user
     for update;

  if not v_inserted then
    return jsonb_build_object(
      'xp_total',       r.xp,
      'streak_days',    r.streak_days,
      'minutes_today',  case when r.minutes_date = v_today then r.minutes_today else 0 end,
      'goal_hit_today', (r.minutes_date = v_today and r.minutes_today >= c_goal),
      'duplicate',      true
    );
  end if;

  v_minutes_today := case when r.minutes_date = v_today then r.minutes_today else 0 end;
  v_goal_already  := v_minutes_today >= c_goal;
  v_minutes_today := v_minutes_today + p_minutes;
  v_streak        := r.streak_days;
  v_last          := r.last_date;

  -- Cruzou a meta hoje pela primeira vez?
  if (not v_goal_already) and v_minutes_today >= c_goal then
    if v_last = v_yesterday then
      v_streak := v_streak + 1;      -- continuou a sequência
    elsif v_last = v_today then
      null;                          -- já contou hoje
    else
      v_streak := 1;                 -- quebrou ou é o 1º dia
    end if;
    v_last := v_today;
  end if;

  -- AQUI o bug de 0002: text -> date precisa de cast explícito.
  update public.profiles
     set xp                 = coalesce(xp, 0) + p_xp,
         total_minutes      = coalesce(total_minutes, 0) + p_minutes,
         minutes_today      = v_minutes_today,
         minutes_today_date = v_today::date,
         streak_days        = v_streak,
         last_streak_date   = v_last::date
   where id = v_user
   returning xp into v_total;

  return jsonb_build_object(
    'xp_total',       v_total,
    'streak_days',    v_streak,
    'minutes_today',  v_minutes_today,
    'goal_hit_today', v_minutes_today >= c_goal,
    'duplicate',      false
  );
end;
$$;

revoke execute on function public.record_study_activity(integer, integer, text, text) from public, anon;
grant execute on function public.record_study_activity(integer, integer, text, text) to authenticated;
