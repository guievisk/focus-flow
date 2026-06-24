// lib/streak.ts
// Lógica do foguinho: registra minutos estudados e atualiza a sequência

import { supabase } from '@/lib/supabase'

const DAILY_GOAL = 20 // meta de minutos por dia

// Retorna a data de hoje no formato YYYY-MM-DD
function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// Retorna a data de ontem no formato YYYY-MM-DD
function yesterdayStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

/*
 🧠 FUNÇÃO PRINCIPAL
    Chamada toda vez que o aluno estuda X minutos.
    Ela soma os minutos do dia e, se bater a meta, atualiza o foguinho.
*/
export async function addStudyMinutes(
  userId: string,
  minutes: number,
  xpGained: number = 0
) {
  // Busca o perfil atual (agora também total_minutes e xp)
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_days, last_streak_date, minutes_today, minutes_today_date, total_minutes, xp')
    .eq('id', userId)
    .single()

  if (!profile) return

  const today = todayStr()
  const yesterday = yesterdayStr()

  // Se os minutos guardados são de outro dia, zera o contador de hoje
  let minutesToday = profile.minutes_today_date === today
    ? profile.minutes_today
    : 0

  const goalAlreadyHitToday = minutesToday >= DAILY_GOAL
  minutesToday += minutes

  let streak = profile.streak_days
  let lastStreakDate = profile.last_streak_date

  // Acabou de bater a meta hoje (e ainda não tinha batido)?
  if (!goalAlreadyHitToday && minutesToday >= DAILY_GOAL) {
    if (lastStreakDate === yesterday) {
      streak = streak + 1            // continuou a sequência
    } else if (lastStreakDate === today) {
      // já contou hoje → mantém
    } else {
      streak = 1                     // quebrou ou é o 1º dia → reinicia
    }
    lastStreakDate = today
  }

  // Salva tudo (agora somando total_minutes e xp de verdade)
  await supabase
    .from('profiles')
    .update({
      minutes_today: minutesToday,
      minutes_today_date: today,
      streak_days: streak,
      last_streak_date: lastStreakDate,
      total_minutes: (profile.total_minutes ?? 0) + minutes,
      xp: (profile.xp ?? 0) + xpGained,
    })
    .eq('id', userId)
}
// Calcula se o foguinho está "aceso" hoje (meta batida)
export function isStreakActiveToday(profile: {
  minutes_today: number
  minutes_today_date: string | null
}): boolean {
  const today = todayStr()
  return profile.minutes_today_date === today && profile.minutes_today >= DAILY_GOAL
}

export { DAILY_GOAL }