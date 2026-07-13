// lib/streak.ts
// Utilitários PUROS do foguinho (sem acesso a banco).
// A gravação de minutos/streak/XP é atômica no servidor, via
// StreakRepository.recordStudyActivity (lib/data/) — RPC record_study_activity.

export const DAILY_GOAL = 20 // meta de minutos por dia

// Retorna a data de hoje no formato YYYY-MM-DD
function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// Calcula se o foguinho está "aceso" hoje (meta batida)
export function isStreakActiveToday(profile: {
  minutes_today: number
  minutes_today_date: string | null
}): boolean {
  return profile.minutes_today_date === todayStr() && profile.minutes_today >= DAILY_GOAL
}
