
export const DAILY_GOAL = 20

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function isStreakActiveToday(profile: {
  minutes_today: number
  minutes_today_date: string | null
}): boolean {
  return profile.minutes_today_date === todayStr() && profile.minutes_today >= DAILY_GOAL
}
