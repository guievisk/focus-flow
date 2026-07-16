
export function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function shouldShowParents(birthDate: string | null, wantsParental: boolean): boolean {
  const age = calcAge(birthDate)
  if (age === null) return false
  return age < 18 && wantsParental
}