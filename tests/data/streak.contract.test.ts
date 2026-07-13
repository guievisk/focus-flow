// tests/data/streak.contract.test.ts
// Contrato do StreakRepository (specs/001-.../contracts/data-layer.md, itens 4-5).
// Regras de streak idênticas às de lib/streak.ts original, agora atômicas.

import { describe, expect, it } from 'vitest'
import { createMemoryDataLayer } from '@/lib/data'

const USER = 'user-1'
const NOON = () => new Date('2026-07-08T12:00:00')

function layerWith(profile: Record<string, unknown> = {}) {
  return createMemoryDataLayer({
    currentUserId: USER,
    clock: NOON,
    profiles: [{ id: USER, ...profile }],
  })
}

describe('StreakRepository.recordStudyActivity', () => {
  it('credita minutos e XP juntos, atomicamente', async () => {
    const dl = layerWith({ xp: 100, totalMinutes: 40 })

    const res = await dl.streak.recordStudyActivity({ minutes: 10, xp: 30, idempotencyKey: 's1' })

    expect(res.xpTotal).toBe(130)
    expect(res.minutesToday).toBe(10)
    expect(res.goalHitToday).toBe(false)
    expect(res.duplicate).toBe(false)

    const p = await dl.profiles.getById(USER)
    expect(p?.xp).toBe(130)
    expect(p?.totalMinutes).toBe(50)
  })

  it('primeiro acesso sem perfil: inicializa e credita (edge case da spec)', async () => {
    const dl = createMemoryDataLayer({ currentUserId: USER, clock: NOON })

    const res = await dl.streak.recordStudyActivity({ minutes: 5, xp: 10, idempotencyKey: 's1' })

    expect(res.xpTotal).toBe(10)
    const p = await dl.profiles.getById(USER)
    expect(p).not.toBeNull()
    expect(p?.xp).toBe(10)
  })

  it('cruzar a meta (20 min) com streak de ontem incrementa a sequência', async () => {
    const dl = layerWith({ streakDays: 3, lastStreakDate: '2026-07-07' })

    const res = await dl.streak.recordStudyActivity({ minutes: 25, xp: 10, idempotencyKey: 's1' })

    expect(res.goalHitToday).toBe(true)
    expect(res.streakDays).toBe(4)
  })

  it('cruzar a meta de novo no mesmo dia mantém a sequência', async () => {
    const dl = layerWith({ streakDays: 4, lastStreakDate: '2026-07-08', minutesToday: 25, minutesTodayDate: '2026-07-08' })

    // meta já batida hoje: mais minutos não mudam o streak
    const res = await dl.streak.recordStudyActivity({ minutes: 30, xp: 10, idempotencyKey: 's2' })

    expect(res.streakDays).toBe(4)
    expect(res.minutesToday).toBe(55)
  })

  it('sequência quebrada reinicia em 1 ao bater a meta', async () => {
    const dl = layerWith({ streakDays: 9, lastStreakDate: '2026-07-01' })

    const res = await dl.streak.recordStudyActivity({ minutes: 20, xp: 10, idempotencyKey: 's1' })

    expect(res.streakDays).toBe(1)
  })

  it('minutos de outro dia zeram o contador de hoje', async () => {
    const dl = layerWith({ minutesToday: 18, minutesTodayDate: '2026-07-05' })

    const res = await dl.streak.recordStudyActivity({ minutes: 5, xp: 10, idempotencyKey: 's1' })

    expect(res.minutesToday).toBe(5)
    expect(res.goalHitToday).toBe(false)
  })

  it('duplicata (mesma chave) não aplica NADA — nem XP nem minutos nem streak', async () => {
    const dl = layerWith({ xp: 100 })

    const first = await dl.streak.recordStudyActivity({ minutes: 25, xp: 40, idempotencyKey: 's1' })
    const second = await dl.streak.recordStudyActivity({ minutes: 25, xp: 40, idempotencyKey: 's1' })

    expect(first.duplicate).toBe(false)
    expect(second.duplicate).toBe(true)
    expect(second.xpTotal).toBe(first.xpTotal)
    expect(second.minutesToday).toBe(first.minutesToday)
    expect(second.streakDays).toBe(first.streakDays)

    const p = await dl.profiles.getById(USER)
    expect(p?.xp).toBe(140)
    expect(p?.totalMinutes).toBe(25)
  })

  it('valida entradas (minutes > 0, xp > 0, chave obrigatória)', async () => {
    const dl = layerWith()
    await expect(
      dl.streak.recordStudyActivity({ minutes: 0, xp: 10, idempotencyKey: 's1' }),
    ).rejects.toMatchObject({ code: 'validation' })
    await expect(
      dl.streak.recordStudyActivity({ minutes: 10, xp: 0, idempotencyKey: 's2' }),
    ).rejects.toMatchObject({ code: 'validation' })
    await expect(
      dl.streak.recordStudyActivity({ minutes: 10, xp: 10, idempotencyKey: '' }),
    ).rejects.toMatchObject({ code: 'validation' })
  })

  it('o ganho da sessão aparece no histórico diário (SC-001/SC-002)', async () => {
    const dl = layerWith()

    await dl.streak.recordStudyActivity({ minutes: 10, xp: 30, idempotencyKey: 's1' })

    const daily = await dl.xp.getDailyXp(USER, 1)
    expect(daily[0]).toEqual({ date: '2026-07-08', xp: 30 })

    const events = await dl.xp.listEvents(USER)
    expect(events[0]).toMatchObject({ source: 'study_session', amount: 30 })
  })
})
