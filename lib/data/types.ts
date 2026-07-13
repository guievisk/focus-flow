// lib/data/types.ts
// Tipos de domínio da aplicação — independentes do provedor de banco.
// Nenhum tipo do Supabase (ou de outro provedor) pode aparecer aqui.

export type Profile = {
  id: string
  fullName: string | null
  displayName: string | null
  birthDate: string | null
  wantsParental: boolean
  parentEmail: string | null
  phone: string | null
  xp: number
  totalMinutes: number
  streakDays: number
  lastStreakDate: string | null
  minutesToday: number
  minutesTodayDate: string | null
  avatarUrl: string | null
  inviteCode: string | null
  lastSeen: string | null
  studyingTopic: string | null
}

/** Campos de perfil que o cliente pode editar diretamente.
 *  XP, streak e minutos NUNCA entram aqui — só mudam via RPCs atômicos. */
export type ProfileIdentityPatch = Partial<Pick<Profile,
  | 'fullName' | 'displayName' | 'birthDate' | 'wantsParental'
  | 'parentEmail' | 'phone' | 'avatarUrl' | 'studyingTopic' | 'lastSeen'
>>

export type XpSource = 'quiz' | 'study_session' | 'lesson' | 'backfill'

export type XpEvent = {
  id: string
  userId: string
  amount: number
  source: XpSource
  sourceId: string | null
  createdAt: string // ISO
}

export type XpAward = {
  amount: number // > 0
  source: 'quiz' | 'lesson'
  sourceId?: string
  /** UUID gerado UMA vez por atividade; retries reutilizam a MESMA chave. */
  idempotencyKey: string
}

export type StudyActivity = {
  minutes: number // > 0
  xp: number // > 0
  /** UUID gerado UMA vez por sessão concluída; cobre XP e minutos. */
  idempotencyKey: string
}

export type StudyActivityResult = {
  xpTotal: number
  streakDays: number
  minutesToday: number
  goalHitToday: boolean
  /** true quando a idempotencyKey já tinha sido usada (nada foi aplicado). */
  duplicate: boolean
}

export type DailyXp = {
  /** Dia local no formato YYYY-MM-DD. */
  date: string
  xp: number
}

export type QuizResultInput = {
  topic: string
  difficulty: string
  totalQuestions: number
  correctAnswers: number
  xpEarned: number
}

export type QuizResult = QuizResultInput & {
  id: string
  createdAt: string
}

export type FriendshipStatus = 'pending' | 'accepted'

export type FriendWithProfile = {
  friendshipId: string
  status: FriendshipStatus
  friendId: string
  friendName: string
  friendAvatar: string | null
  inviteCode: string
  requestedBy: string
  createdAt: string
  lastSeen: string | null
}

export type PresenceStatus = 'idle' | 'studying'

export type FriendPresence = {
  friendId: string
  status: PresenceStatus
  studyingTopic?: string
  onlineAt: string
}

export type Message = {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  readAt: string | null
}

export type Unsubscribe = () => void
