# Contrato — RPCs do banco (Postgres/Supabase)

Funções `SECURITY DEFINER` chamadas exclusivamente pela camada de dados (`lib/data/supabase/`). O usuário vem SEMPRE de `auth.uid()` — nunca de parâmetro. Migrações em `supabase/migrations/` (ver [data-model.md](../data-model.md)).

## `award_xp(p_amount int, p_source text, p_source_id text, p_idempotency_key text) → jsonb`

Concede XP de forma atômica e idempotente.

**Semântica (transação única):**
1. Valida `p_amount > 0` e `p_source` no enum permitido; `auth.uid()` não nulo (senão `RAISE`).
2. Garante que o perfil existe (`INSERT ... ON CONFLICT DO NOTHING` com defaults).
3. `INSERT INTO xp_events (user_id, amount, source, source_id, idempotency_key)`.
   - Conflito em `(user_id, idempotency_key)` ⇒ **no-op**: NÃO incrementa de novo; segue ao passo 5.
4. `UPDATE profiles SET xp = xp + p_amount WHERE id = auth.uid()`.
5. Retorna `{ "xp_total": <profiles.xp atual>, "duplicate": <bool> }`.

**Garantias:** FR-001 (atômico, sem duplicação), FR-004 (retry seguro), edge case duas abas (incremento no servidor), edge case primeiro acesso (upsert do perfil).

## `record_study_activity(p_minutes int, p_xp int, p_idempotency_key text) → jsonb`

Registra uma sessão de estudo concluída: minutos do dia, meta diária (20 min), streak e XP — tudo numa transação. Substitui a lógica JS de `lib/streak.ts#addStudyMinutes`.

**Semântica (transação única):**
1. Valida `p_minutes > 0`, `p_xp > 0`, `auth.uid()` não nulo. Upsert do perfil como acima.
2. Idempotência: o contrato EXIGE `p_xp > 0` (no produto atual toda sessão concluída concede XP — 10 por passo). Insere `xp_events (source='study_session')` com a chave; conflito na unique key ⇒ retorna o estado atual com `"duplicate": true` **sem aplicar nenhum efeito** (nem minutos — a chave cobre a atividade inteira, e o insert do evento acontece antes de qualquer update).
3. Recalcula, com data local do usuário (`p_tz text default 'America/Sao_Paulo'` como 4º parâmetro opcional): `minutes_today` (zera se `minutes_today_date` ≠ hoje), soma minutos; se cruzou a meta hoje pela primeira vez: `streak_days` = streak+1 se `last_streak_date` = ontem, mantém se = hoje, senão 1; atualiza `last_streak_date`.
4. `UPDATE profiles SET xp = xp + p_xp, total_minutes = total_minutes + p_minutes, minutes_today = ..., minutes_today_date = ..., streak_days = ..., last_streak_date = ...`.
5. Retorna `{ "xp_total", "streak_days", "minutes_today", "goal_hit_today", "duplicate" }`.

**Nota de fidelidade:** o código atual usa `toISOString()` (UTC) para "hoje" — o RPC preserva o comportamento por data configurável via `p_tz`, melhorando o caso do usuário brasileiro à noite (era um bug latente; documentar na implementação).

## Permissões

- `GRANT EXECUTE` em ambas para `authenticated`; `REVOKE` de `anon`.
- `xp_events`: RLS `SELECT USING (user_id = auth.uid())`; nenhuma policy de escrita (só os RPCs escrevem).
- `add_xp` (legado): mantido até o código migrar; removido em migração final da feature.

## Erros (mapeamento para `DataLayerError`)

| Condição no banco | Código na camada |
|---|---|
| `RAISE` de validação (amount, auth) | `unknown` (bug do cliente — não retry) |
| Falha de rede/timeout | `network`, `retryable: true` — UI oferece retry com a MESMA idempotency_key (FR-004) |
| Conflito de idempotência | **não é erro** — resposta normal com `duplicate: true` |
