-- 00_diagnose.sql — DIAGNÓSTICO SOMENTE-LEITURA (não altera nada).
--
-- Cole INTEIRO no SQL Editor do Supabase e rode. Copie a saída de volta.
-- Responde: o schema base existe? as migrações 0001–0003 rodaram?
-- o RPC legado add_xp ainda está lá? RLS está ligada? tem dado gravado?
--
-- Nenhum comando aqui escreve: só lê catálogo (pg_class/pg_proc/pg_policies),
-- storage.buckets e COUNT(*). Seguro rodar em produção.

with
-- ---------------------------------------------------------------------------
-- Expectativas: o que o código de FocusFlow exige do banco.
-- ---------------------------------------------------------------------------
esperado_tabela(tabela, origem) as (values
  ('profiles',     'schema base (AuthContext, onboarding, profile, friends)'),
  ('quiz_results', 'schema base (study, dashboard, quiz.repository)'),
  ('friendships',  'schema base (lib/friends.ts)'),
  ('messages',     'schema base (lib/chat.ts)'),
  ('xp_events',    'migração 0001_xp_events.sql')
),

esperado_coluna(tabela, coluna) as (values
  ('profiles','id'), ('profiles','full_name'), ('profiles','display_name'),
  ('profiles','birth_date'), ('profiles','wants_parental'), ('profiles','parent_email'),
  ('profiles','phone'), ('profiles','avatar_url'), ('profiles','invite_code'),
  ('profiles','last_seen'), ('profiles','studying_topic'),
  ('profiles','xp'), ('profiles','total_minutes'), ('profiles','streak_days'),
  ('profiles','last_streak_date'), ('profiles','minutes_today'), ('profiles','minutes_today_date'),

  ('quiz_results','id'), ('quiz_results','user_id'), ('quiz_results','topic'),
  ('quiz_results','difficulty'), ('quiz_results','total_questions'),
  ('quiz_results','correct_answers'), ('quiz_results','xp_earned'), ('quiz_results','created_at'),

  ('xp_events','id'), ('xp_events','user_id'), ('xp_events','amount'),
  ('xp_events','source'), ('xp_events','source_id'), ('xp_events','idempotency_key'),
  ('xp_events','created_at'),

  ('friendships','id'), ('friendships','user_a'), ('friendships','user_b'),
  ('friendships','status'), ('friendships','requested_by'),
  ('friendships','created_at'), ('friendships','accepted_at'),

  ('messages','id'), ('messages','sender_id'), ('messages','receiver_id'),
  ('messages','content'), ('messages','created_at'), ('messages','read_at')
),

esperado_funcao(fn, origem) as (values
  ('award_xp',             'migração 0002 — ESPERADO existir'),
  ('record_study_activity','migração 0002 — ESPERADO existir'),
  ('add_xp',               'RPC legado — nenhum código atual chama; remover em 0004')
),

-- ---------------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------------
r_tabelas as (
  select 1 as ord, 'TABELAS' as secao, e.tabela as item,
         case when c.oid is null then 'FALTA' else 'OK' end as status,
         case when c.oid is null then e.origem
              else 'rls=' || c.relrowsecurity::text end as detalhe
  from esperado_tabela e
  left join pg_class c
    on c.relname = e.tabela
   and c.relnamespace = 'public'::regnamespace
   and c.relkind = 'r'
),

-- ---------------------------------------------------------------------------
-- 2. Colunas (só reporta as que faltam, para a saída não virar um mural)
-- ---------------------------------------------------------------------------
r_colunas as (
  select 2 as ord, 'COLUNAS FALTANDO' as secao,
         e.tabela || '.' || e.coluna as item,
         case when to_regclass('public.' || e.tabela) is null
              then 'TABELA INEXISTENTE' else 'FALTA' end as status,
         'coluna exigida pelo código' as detalhe
  from esperado_coluna e
  left join information_schema.columns c
    on c.table_schema = 'public'
   and c.table_name  = e.tabela
   and c.column_name = e.coluna
  where c.column_name is null
),

-- ---------------------------------------------------------------------------
-- 3. Funções / RPCs
-- ---------------------------------------------------------------------------
r_funcoes as (
  select 3 as ord, 'FUNCOES' as secao, e.fn as item,
         case when p.oid is null then 'AUSENTE' else 'EXISTE' end as status,
         coalesce(
           'args(' || pg_get_function_identity_arguments(p.oid) || ')'
             || case when p.prosecdef then ' SECURITY DEFINER' else ' SECURITY INVOKER' end,
           e.origem
         ) as detalhe
  from esperado_funcao e
  left join pg_proc p
    on p.proname = e.fn
   and p.pronamespace = 'public'::regnamespace
),

-- ---------------------------------------------------------------------------
-- 4. RLS / policies por tabela
-- ---------------------------------------------------------------------------
r_policies as (
  select 4 as ord, 'POLICIES' as secao, e.tabela as item,
         case
           when to_regclass('public.' || e.tabela) is null then 'TABELA INEXISTENTE'
           when count(p.policyname) = 0 then 'NENHUMA'
           else 'OK'
         end as status,
         count(p.policyname)::text || ' policy(ies): '
           || coalesce(string_agg(p.policyname || '/' || p.cmd, ', ' order by p.policyname), '—')
           as detalhe
  from esperado_tabela e
  left join pg_policies p
    on p.schemaname = 'public' and p.tablename = e.tabela
  group by e.tabela
),

-- ---------------------------------------------------------------------------
-- 5. Volume de dados (COUNT dinâmico e seguro — só em tabela que existe)
-- ---------------------------------------------------------------------------
r_counts as (
  select 5 as ord, 'LINHAS' as secao, e.tabela as item,
         'INFO' as status,
         coalesce(
           (xpath(
              '/row/c/text()',
              query_to_xml(
                format('select count(*) as c from public.%I', e.tabela),
                false, true, ''
              )
            ))[1]::text,
           'tabela inexistente'
         ) as detalhe
  from esperado_tabela e
  where to_regclass('public.' || e.tabela) is not null
),

-- ---------------------------------------------------------------------------
-- 6. Sinais de que as migrações 0001–0003 realmente rodaram
-- ---------------------------------------------------------------------------
r_migracoes as (
  select 6 as ord, 'MIGRACOES' as secao, '0001_xp_events' as item,
         case when to_regclass('public.xp_events') is null then 'NAO RODOU' else 'RODOU' end as status,
         'cria tabela xp_events' as detalhe
  union all
  select 6, 'MIGRACOES', '0002_award_xp',
         case when exists (
                select 1 from pg_proc
                 where proname in ('award_xp','record_study_activity')
                   and pronamespace = 'public'::regnamespace
              ) then 'RODOU' else 'NAO RODOU' end,
         'cria RPCs award_xp + record_study_activity'
  union all
  select 6, 'MIGRACOES', '0003_backfill',
         case
           when to_regclass('public.xp_events') is null then 'NAO RODOU'
           when exists (select 1 from public.xp_events where source = 'backfill') then 'RODOU'
           else 'NAO RODOU (ou nao havia quiz antigo p/ backfill)'
         end,
         'insere xp_events com source=backfill'
),

-- ---------------------------------------------------------------------------
-- 7. Dependências de infraestrutura
-- ---------------------------------------------------------------------------
r_infra as (
  select 7 as ord, 'INFRA' as secao, 'gen_random_uuid()' as item,
         case when exists (select 1 from pg_proc where proname = 'gen_random_uuid')
              then 'OK' else 'AUSENTE' end as status,
         'exigido pelo default de xp_events.id (extensão pgcrypto)' as detalhe
  union all
  select 7, 'INFRA', 'storage bucket "avatars"',
         case when exists (select 1 from storage.buckets where id = 'avatars')
              then 'OK' else 'AUSENTE' end,
         'exigido por components/AvatarUpload.tsx'
  union all
  select 7, 'INFRA', 'trigger em auth.users -> profiles',
         case when exists (
                select 1 from pg_trigger t
                 join pg_class c on c.oid = t.tgrelid
                 join pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal
              ) then 'EXISTE' else 'AUSENTE' end,
         'cria a linha de profiles no signup; se ausente, o perfil so nasce via upsert do onboarding'
),

-- ---------------------------------------------------------------------------
-- 8. Coerência XP: profiles.xp vs. soma do ledger
-- ---------------------------------------------------------------------------
r_xp as (
  select 8 as ord, 'XP' as secao, 'profiles.xp total' as item, 'INFO' as status,
         coalesce(
           (xpath('/row/c/text()',
             query_to_xml('select coalesce(sum(xp),0) as c from public.profiles', false, true, '')
           ))[1]::text, 'sem tabela'
         ) as detalhe
  where to_regclass('public.profiles') is not null
  union all
  select 8, 'XP', 'usuarios com xp > 0', 'INFO',
         coalesce(
           (xpath('/row/c/text()',
             query_to_xml('select count(*) as c from public.profiles where coalesce(xp,0) > 0', false, true, '')
           ))[1]::text, 'sem tabela'
         )
  where to_regclass('public.profiles') is not null
  union all
  select 8, 'XP', 'soma xp_events.amount', 'INFO',
         coalesce(
           (xpath('/row/c/text()',
             query_to_xml('select coalesce(sum(amount),0) as c from public.xp_events', false, true, '')
           ))[1]::text, 'sem tabela'
         )
  where to_regclass('public.xp_events') is not null
)

select secao, item, status, detalhe
from (
  select * from r_tabelas
  union all select * from r_colunas
  union all select * from r_funcoes
  union all select * from r_policies
  union all select * from r_counts
  union all select * from r_migracoes
  union all select * from r_infra
  union all select * from r_xp
) t
order by ord, item;
