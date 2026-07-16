
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
  createdAt: string
}

export type XpAward = {
  amount: number
  source: 'quiz' | 'lesson'
  sourceId?: string
  idempotencyKey: string
}

export type StudyActivity = {
  minutes: number
  xp: number
  idempotencyKey: string
}

export type StudyActivityResult = {
  xpTotal: number
  streakDays: number
  minutesToday: number
  goalHitToday: boolean
  duplicate: boolean
}

export type DailyXp = {
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
