
import { DataLayerError } from '../errors'
import type { StreakRepository } from '../repositories'
import type { StudyActivity, StudyActivityResult } from '../types'
import type { MemoryStore } from './store'

export const DAILY_GOAL_MINUTES = 20

export function createMemoryStreakRepository(
  store: MemoryStore,
  currentUserId: string,
): StreakRepository {
  return {
    async recordStudyActivity(activity: StudyActivity): Promise<StudyActivityResult> {
      store.maybeFail('streak.recordStudyActivity')

      if (!Number.isFinite(activity.minutes) || activity.minutes <= 0) {
        throw new DataLayerError('validation', 'minutes deve ser > 0')
      }
      if (!Number.isFinite(activity.xp) || activity.xp <= 0) {
        throw new DataLayerError('validation', 'xp deve ser > 0')
      }
      if (!activity.idempotencyKey) {
        throw new DataLayerError('validation', 'idempotencyKey é obrigatória')
      }

      const profile = store.ensureProfile(currentUserId)
      const today = store.today()

      const existing = store.findEventByKey(currentUserId, activity.idempotencyKey)
      if (existing) {
        const minutesToday = profile.minutesTodayDate === today ? profile.minutesToday : 0
        return {
          xpTotal: profile.xp,
          streakDays: profile.streakDays,
          minutesToday,
          goalHitToday: minutesToday >= DAILY_GOAL_MINUTES,
          duplicate: true,
        }
      }

      store.xpEvents.push({
        id: store.nextId('xp'),
        userId: currentUserId,
        amount: activity.xp,
        source: 'study_session',
        sourceId: null,
        createdAt: store.clock().toISOString(),
        idempotencyKey: activity.idempotencyKey,
      })

      const minutesBefore = profile.minutesTodayDate === today ? profile.minutesToday : 0
      const minutesToday = minutesBefore + activity.minutes
      const crossedGoalNow =
        minutesBefore < DAILY_GOAL_MINUTES && minutesToday >= DAILY_GOAL_MINUTES

      if (crossedGoalNow) {
        if (profile.lastStreakDate === store.yesterday()) {
          profile.streakDays += 1
        } else if (profile.lastStreakDate !== today) {
          profile.streakDays = 1
        }
        profile.lastStreakDate = today
      }

      profile.xp += activity.xp
      profile.totalMinutes += activity.minutes
      profile.minutesToday = minutesToday
      profile.minutesTodayDate = today

      return {
        xpTotal: profile.xp,
        streakDays: profile.streakDays,
        minutesToday,
        goalHitToday: minutesToday >= DAILY_GOAL_MINUTES,
        duplicate: false,
      }
    },
  }
}
