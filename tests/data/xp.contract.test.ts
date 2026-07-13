// tests/data/xp.contract.test.ts
// Contrato do XpRepository (specs/001-.../contracts/data-layer.md, itens 1-3 e 6).
// Roda contra o fake em memória — a semântica vale para QUALQUER implementação.

import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryDataLayer, type MemoryDataLayer } from '@/lib/data'
import { DataLayerError } from '@/lib/data/errors'

const USER = 'user-1'

let dl: MemoryDataLayer

beforeEach(() => {
  dl = createMemoryDataLayer({
    currentUserId: USER,
    clock: () => new Date('2026-07-08T12:00:00'),
    profiles: [{ id: USER, xp: 100 }],
  })
})

describe('XpRepository.awardXp', () => {
  it('credita XP atomicamente e retorna o novo total', async () => {
    const res = await dl.xp.awardXp({
      amount: 50,
      source: 'quiz',
      sourceId: 'quiz-abc',
      idempotencyKey: 'k1',
    })
    expect(res.xpTotal).toBe(150)
    expect(res.duplicate).toBe(false)
  })

  it('é idempotente: a mesma chave credita UMA vez e retorna o mesmo total', async () => {
    const first = await dl.xp.awardXp({ amount: 50, source: 'quiz', idempotencyKey: 'k1' })
    const second = await dl.xp.awardXp({ amount: 50, source: 'quiz', idempotencyKey: 'k1' })

    expect(first.xpTotal).toBe(150)
    expect(second.xpTotal).toBe(150)
    expect(second.duplicate).toBe(true)

    const profile = await dl.profiles.getById(USER)
    expect(profile?.xp).toBe(150)
  })

  it('rejeita amount <= 0', async () => {
    await expect(
      dl.xp.awardXp({ amount: 0, source: 'quiz', idempotencyKey: 'k1' }),
    ).rejects.toMatchObject({ code: 'validation' })
    await expect(
      dl.xp.awardXp({ amount: -10, source: 'lesson', idempotencyKey: 'k2' }),
    ).rejects.toMatchObject({ code: 'validation' })
  })

  it('exige idempotencyKey', async () => {
    await expect(
      dl.xp.awardXp({ amount: 10, source: 'quiz', idempotencyKey: '' }),
    ).rejects.toMatchObject({ code: 'validation' })
  })

  it('falha transitória é retryable e o retry com a MESMA chave não duplica', async () => {
    dl.store.failNextOps.add('xp.awardXp')

    let caught: unknown
    try {
      await dl.xp.awardXp({ amount: 50, source: 'quiz', idempotencyKey: 'k1' })
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(DataLayerError)
    expect((caught as DataLayerError).retryable).toBe(true)

    // Retry do usuário (mesma chave): credita exatamente uma vez.
    const retry = await dl.xp.awardXp({ amount: 50, source: 'quiz', idempotencyKey: 'k1' })
    expect(retry.xpTotal).toBe(150)

    const profile = await dl.profiles.getById(USER)
    expect(profile?.xp).toBe(150)
  })
})

describe('XpRepository.getDailyXp (histórico consistente com o total — SC-001/SC-002)', () => {
  it('reflete o ganho no dia corrente', async () => {
    await dl.xp.awardXp({ amount: 30, source: 'quiz', idempotencyKey: 'k1' })
    await dl.xp.awardXp({ amount: 20, source: 'lesson', idempotencyKey: 'k2' })

    const daily = await dl.xp.getDailyXp(USER, 7)
    expect(daily).toHaveLength(7)

    const today = daily[daily.length - 1]
    expect(today.date).toBe('2026-07-08')
    expect(today.xp).toBe(50)

    // dias sem ganho vêm zerados (gráfico contínuo)
    expect(daily[0].xp).toBe(0)
  })

  it('não conta ganho duplicado no histórico', async () => {
    await dl.xp.awardXp({ amount: 30, source: 'quiz', idempotencyKey: 'k1' })
    await dl.xp.awardXp({ amount: 30, source: 'quiz', idempotencyKey: 'k1' })

    const daily = await dl.xp.getDailyXp(USER, 1)
    expect(daily[0].xp).toBe(30)
  })
})

describe('XpRepository.listEvents', () => {
  it('registra origem e referência de cada ganho (FR-003)', async () => {
    await dl.xp.awardXp({ amount: 25, source: 'quiz', sourceId: 'quiz-9', idempotencyKey: 'k1' })

    const events = await dl.xp.listEvents(USER)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      userId: USER,
      amount: 25,
      source: 'quiz',
      sourceId: 'quiz-9',
    })
    expect(events[0].createdAt).toBeTruthy()
  })
})
