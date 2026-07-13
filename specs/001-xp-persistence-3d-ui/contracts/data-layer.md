# Contrato — Camada de dados (`lib/data/`)

Interfaces TypeScript que TODA tela/hook consome. Regras gerais:

- Nenhum tipo do Supabase (ou de qualquer provedor) aparece nas assinaturas — só tipos de `lib/data/types.ts` e primitivos.
- Erros: métodos rejeitam com `DataLayerError` (`code: 'network' | 'conflict' | 'not_found' | 'unauthorized' | 'unknown'`, `retryable: boolean`) — as telas decidem UX de retry (FR-004) sem conhecer o provedor.
- Implementações: `lib/data/supabase/` (produção) e `lib/data/memory/` (fake para testes de contrato). Ambas passam a MESMA suite Vitest.
- Fronteira verificada por lint: importar `@supabase/*` ou `@/lib/supabase*` fora de `lib/data/` é erro de build (SC-003).

## Tipos de domínio (`lib/data/types.ts`)

```ts
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
  amount: number          // > 0
  source: XpSource
  sourceId?: string
  idempotencyKey: string  // UUID por atividade — MESMA chave em retries
}

export type StudyActivity = {
  minutes: number
  xp: number              // >= 0
  idempotencyKey: string
}

export type StudyActivityResult = {
  xpTotal: number
  streakDays: number
  minutesToday: number
  goalHitToday: boolean
}

export type DailyXp = { date: string /* YYYY-MM-DD local */; xp: number }

export type Unsubscribe = () => void
```

## Interfaces (`lib/data/repositories.ts`)

```ts
export interface ProfileRepository {
  getById(userId: string): Promise<Profile | null>
  /** Somente campos de identidade/preferência — NUNCA xp/streak/minutos (ver data-model.md). */
  updateIdentity(userId: string, patch: Partial<Pick<Profile,
    'fullName' | 'displayName' | 'birthDate' | 'wantsParental' |
    'parentEmail' | 'phone' | 'avatarUrl' | 'studyingTopic'>>): Promise<void>
}

export interface XpRepository {
  /** Atômico e idempotente (RPC award_xp). Retorna o XP total após o crédito.
   *  Mesma idempotencyKey ⇒ mesmo resultado, sem crédito duplicado. */
  awardXp(award: XpAward): Promise<{ xpTotal: number }>
  /** Histórico agregado por dia local, para o gráfico "XP por dia". */
  getDailyXp(userId: string, days: number): Promise<DailyXp[]>
  listEvents(userId: string, limit?: number): Promise<XpEvent[]>
}

export interface StreakRepository {
  /** Atômico e idempotente (RPC record_study_activity): minutos + meta diária
   *  + streak + XP numa única transação. Substitui lib/streak.ts#addStudyMinutes. */
  recordStudyActivity(activity: StudyActivity): Promise<StudyActivityResult>
}

export interface QuizRepository {
  saveResult(result: {
    topic: string; difficulty: string; totalQuestions: number
    correctAnswers: number; xpEarned: number
  }): Promise<{ quizId: string }>
  listRecent(userId: string, sinceDays: number): Promise<Array<{
    id: string; topic: string; difficulty: string; totalQuestions: number
    correctAnswers: number; xpEarned: number; createdAt: string
  }>>
}

export interface FriendsRepository {
  getMyInviteCode(userId: string): Promise<string | null>
  sendFriendRequest(inviteCode: string): Promise<void>
  acceptFriendRequest(friendshipId: string): Promise<void>
  removeFriendship(friendshipId: string): Promise<void>
  listFriendships(userId: string): Promise<FriendWithProfile[]>
  /** Presença encapsulada — realtime não vaza para fora da camada (research D5). */
  subscribePresence(userId: string, cb: (p: FriendPresence[]) => void): Unsubscribe
}

export interface ChatRepository {
  sendMessage(toUserId: string, content: string): Promise<void>
  listMessages(withUserId: string, limit?: number): Promise<Message[]>
  subscribeMessages(withUserId: string, cb: (m: Message) => void): Unsubscribe
}
```

(`FriendWithProfile`, `FriendPresence`, `Message` migram dos tipos já existentes em `lib/friends.ts`, `lib/useFriendsPresence.ts`, `lib/chat.ts` para `lib/data/types.ts`.)

## Acesso (`lib/data/index.ts`)

```ts
export type DataLayer = {
  profiles: ProfileRepository
  xp: XpRepository
  streak: StreakRepository
  quizzes: QuizRepository
  friends: FriendsRepository
  chat: ChatRepository
}

export function getDataLayer(): DataLayer   // produção: Supabase
export function createMemoryDataLayer(seed?: Seed): DataLayer  // testes
```

## Semântica obrigatória (verificada pela suite de contrato)

1. `awardXp` com a mesma `idempotencyKey` duas vezes ⇒ total cresce **uma** vez; segunda chamada resolve com o mesmo `xpTotal` (não rejeita).
2. `awardXp` com `amount <= 0` ⇒ rejeita (`unknown`/validação).
3. Após `awardXp`, `getDailyXp` do dia corrente reflete o valor (histórico e total consistentes — SC-001/SC-002).
4. `recordStudyActivity` cruzando a meta diária (20 min) incrementa `streakDays` conforme regras atuais de `lib/streak.ts` (ontem contínuo +1; mesmo dia mantém; caso contrário reinicia em 1).
5. `recordStudyActivity` para usuário sem perfil ⇒ inicializa perfil e credita (edge case primeiro acesso).
6. Falha transitória (fake simula) ⇒ `DataLayerError.retryable === true`; retry com a mesma chave não duplica.
