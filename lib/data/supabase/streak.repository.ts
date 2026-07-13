// lib/data/supabase/streak.repository.ts
// StreakRepository sobre Supabase: RPC record_study_activity faz minutos +
// meta diária + streak + XP numa única transação (substitui lib/streak.ts).

import { DataLayerError } from '../errors'
import type { StreakRepository } from '../repositories'
import type { StudyActivity, StudyActivityResult } from '../types'
import { supabase } from './client'
import { throwIfError, toDataLayerError } from './errors'

function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
  } catch {
    return 'America/Sao_Paulo'
  }
}

export function createSupabaseStreakRepository(): StreakRepository {
  return {
    async recordStudyActivity(activity: StudyActivity): Promise<StudyActivityResult> {
      if (!Number.isFinite(activity.minutes) || activity.minutes <= 0) {
        throw new DataLayerError('validation', 'minutes deve ser > 0')
      }
      if (!Number.isFinite(activity.xp) || activity.xp <= 0) {
        throw new DataLayerError('validation', 'xp deve ser > 0')
      }
      if (!activity.idempotencyKey) {
        throw new DataLayerError('validation', 'idempotencyKey é obrigatória')
      }

      try {
        const { data, error } = await supabase.rpc('record_study_activity', {
          p_minutes: activity.minutes,
          p_xp: activity.xp,
          p_idempotency_key: activity.idempotencyKey,
          p_tz: localTimeZone(),
        })
        throwIfError(error, 'record_study_activity')

        const result = data as {
          xp_total: number
          streak_days: number
          minutes_today: number
          goal_hit_today: boolean
          duplicate: boolean
        }
        return {
          xpTotal: result.xp_total,
          streakDays: result.streak_days,
          minutesToday: result.minutes_today,
          goalHitToday: result.goal_hit_today,
          duplicate: result.duplicate,
        }
      } catch (err) {
        throw toDataLayerError(err, 'record_study_activity')
      }
    },
  }
}
