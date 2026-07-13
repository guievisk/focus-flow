// lib/data/memory/xp.repository.ts
// Fake em memória do XpRepository. Reproduz a semântica do RPC award_xp:
// crédito atômico, idempotente pela chave, ledger como fonte do histórico.

import { DataLayerError } from '../errors'
import type { XpRepository } from '../repositories'
import type { DailyXp, XpAward, XpEvent } from '../types'
import { toDateKey, type MemoryStore } from './store'

export function createMemoryXpRepository(store: MemoryStore, currentUserId: string): XpRepository {
  return {
    async awardXp(award: XpAward): Promise<{ xpTotal: number; duplicate: boolean }> {
      store.maybeFail('xp.awardXp')

      if (!Number.isFinite(award.amount) || award.amount <= 0) {
        throw new DataLayerError('validation', 'amount deve ser > 0')
      }
      if (!award.idempotencyKey) {
        throw new DataLayerError('validation', 'idempotencyKey é obrigatória')
      }

      const profile = store.ensureProfile(currentUserId)

      const existing = store.findEventByKey(currentUserId, award.idempotencyKey)
      if (existing) {
        return { xpTotal: profile.xp, duplicate: true }
      }

      store.xpEvents.push({
        id: store.nextId('xp'),
        userId: currentUserId,
        amount: award.amount,
        source: award.source,
        sourceId: award.sourceId ?? null,
        createdAt: store.clock().toISOString(),
        idempotencyKey: award.idempotencyKey,
      })
      profile.xp += award.amount

      return { xpTotal: profile.xp, duplicate: false }
    },

    async getDailyXp(userId: string, days: number): Promise<DailyXp[]> {
      store.maybeFail('xp.getDailyXp')

      const totals = new Map<string, number>()
      for (const e of store.xpEvents) {
        if (e.userId !== userId) continue
        const key = toDateKey(new Date(e.createdAt))
        totals.set(key, (totals.get(key) ?? 0) + e.amount)
      }

      const result: DailyXp[] = []
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(store.clock())
        d.setDate(d.getDate() - i)
        const key = toDateKey(d)
        result.push({ date: key, xp: totals.get(key) ?? 0 })
      }
      return result
    },

    async listEvents(userId: string, limit = 50): Promise<XpEvent[]> {
      store.maybeFail('xp.listEvents')
      return store.xpEvents
        .filter((e) => e.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map((e) => ({
          id: e.id,
          userId: e.userId,
          amount: e.amount,
          source: e.source,
          sourceId: e.sourceId,
          createdAt: e.createdAt,
        }))
    },
  }
}
