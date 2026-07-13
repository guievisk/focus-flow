// lib/data/supabase/quiz.repository.ts
// QuizRepository sobre Supabase: tabela quiz_results.

import { DataLayerError } from '../errors'
import type { QuizRepository } from '../repositories'
import type { QuizResult, QuizResultInput } from '../types'
import { supabase } from './client'
import { throwIfError, toDataLayerError } from './errors'

type QuizRow = {
  id: string
  topic: string
  difficulty: string
  total_questions: number
  correct_answers: number
  xp_earned: number
  created_at: string
}

function toDomain(row: QuizRow): QuizResult {
  return {
    id: row.id,
    topic: row.topic,
    difficulty: row.difficulty,
    totalQuestions: row.total_questions,
    correctAnswers: row.correct_answers,
    xpEarned: row.xp_earned,
    createdAt: row.created_at,
  }
}

export function createSupabaseQuizRepository(): QuizRepository {
  return {
    async saveResult(result: QuizResultInput): Promise<{ quizId: string }> {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser()
        throwIfError(authError, 'saveResult')
        if (!auth?.user) {
          throw new DataLayerError('unauthorized', 'saveResult: usuário não autenticado')
        }

        const { data, error } = await supabase
          .from('quiz_results')
          .insert({
            user_id: auth.user.id,
            topic: result.topic,
            difficulty: result.difficulty,
            total_questions: result.totalQuestions,
            correct_answers: result.correctAnswers,
            xp_earned: result.xpEarned,
          })
          .select('id')
          .single()
        throwIfError(error, 'saveResult')

        return { quizId: (data as { id: string }).id }
      } catch (err) {
        throw toDataLayerError(err, 'saveResult')
      }
    },

    async listRecent(userId: string, sinceDays: number): Promise<QuizResult[]> {
      const since = new Date()
      since.setHours(0, 0, 0, 0)
      since.setDate(since.getDate() - (sinceDays - 1))

      try {
        const { data, error } = await supabase
          .from('quiz_results')
          .select('id, topic, difficulty, total_questions, correct_answers, xp_earned, created_at')
          .eq('user_id', userId)
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: false })
          .limit(500)
        throwIfError(error, 'listRecent')

        return ((data ?? []) as QuizRow[]).map(toDomain)
      } catch (err) {
        throw toDataLayerError(err, 'listRecent')
      }
    },
  }
}
