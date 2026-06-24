// lib/age.ts
// Calcula a idade a partir de uma data de nascimento (string)

export function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// Decide se o painel dos pais deve aparecer
export function shouldShowParents(birthDate: string | null, wantsParental: boolean): boolean {
  const age = calcAge(birthDate)
  if (age === null) return false
  // Só aparece se for menor de 18 E tiver ativado o controle parental
  return age < 18 && wantsParental
}