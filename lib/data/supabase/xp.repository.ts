// lib/data/supabase/xp.repository.ts
// XpRepository sobre Supabase: escrita via RPC award_xp (atômico/idempotente),
// leitura do histórico direto do ledger xp_events (RLS: só as próprias linhas).

import { DataLayerError } from '../errors'
import type { XpRepository } from '../repositories'
import type { DailyXp, XpAward, XpEvent, XpSource } from '../types'
import { supabase } from './client'
import { throwIfError, toDataLayerError } from './errors'

type XpEventRow = {
  id: string
  user_id: string
  amount: number
  source: XpSource
  source_id: string | null
  created_at: string
}

/** YYYY-MM-DD nos componentes locais da data (mesma regra do fake). */
function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function createSupabaseXpRepository(): XpRepository {
  return {
    async awardXp(award: XpAward): Promise<{ xpTotal: number; duplicate: boolean }> {
      if (!Number.isFinite(award.amount) || award.amount <= 0) {
        throw new DataLayerError('validation', 'amount deve ser > 0')
      }
      if (!award.idempotencyKey) {
        throw new DataLayerError('validation', 'idempotencyKey é obrigatória')
      }

      try {
        const { data, error } = await supabase.rpc('award_xp', {
          p_amount: award.amount,
          p_source: award.source,
          p_idempotency_key: award.idempotencyKey,
          p_source_id: award.sourceId ?? null,
        })
        throwIfError(error, 'award_xp')
        const result = data as { xp_total: number; duplicate: boolean }
        return { xpTotal: result.xp_total, duplicate: result.duplicate }
      } catch (err) {
        throw toDataLayerError(err, 'award_xp')
      }
    },

    async getDailyXp(userId: string, days: number): Promise<DailyXp[]> {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      start.setDate(start.getDate() - (days - 1))

      try {
        const { data, error } = await supabase
          .from('xp_events')
          .select('amount, created_at')
          .eq('user_id', userId)
          .gte('created_at', start.toISOString())
        throwIfError(error, 'getDailyXp')

        const totals = new Map<string, number>()
        for (const row of (data ?? []) as Array<Pick<XpEventRow, 'amount' | 'created_at'>>) {
          const key = toDateKey(new Date(row.created_at))
          totals.set(key, (totals.get(key) ?? 0) + row.amount)
        }

        const result: DailyXp[] = []
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const key = toDateKey(d)
          result.push({ date: key, xp: totals.get(key) ?? 0 })
        }
        return result
      } catch (err) {
        throw toDataLayerError(err, 'getDailyXp')
      }
    },

    async listEvents(userId: string, limit = 50): Promise<XpEvent[]> {
      try {
        const { data, error } = await supabase
          .from('xp_events')
          .select('id, user_id, amount, source, source_id, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)
        throwIfError(error, 'listEvents')

        return ((data ?? []) as XpEventRow[]).map((row) => ({
          id: row.id,
          userId: row.user_id,
          amount: row.amount,
          source: row.source,
          sourceId: row.source_id,
          createdAt: row.created_at,
        }))
      } catch (err) {
        throw toDataLayerError(err, 'listEvents')
      }
    },
  }
}
