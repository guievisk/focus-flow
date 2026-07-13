// lib/data/supabase/errors.ts
// Traduz erros do Supabase/PostgREST para DataLayerError.
// Mapeamento contratual: specs/001-.../contracts/database-rpc.md §Erros.

import { DataLayerError, type DataLayerErrorCode } from '../errors'

type SupabaseErrorLike = {
  message?: string
  code?: string
  status?: number
}

function classify(err: SupabaseErrorLike): DataLayerErrorCode {
  const message = (err.message ?? '').toLowerCase()

  // Falha de transporte (fetch/timeout): vale retry com a MESMA idempotencyKey.
  if (/fetch|network|timeout|failed to load|load failed/.test(message)) return 'network'

  if (err.status === 401 || err.status === 403 || err.code === 'PGRST301') return 'unauthorized'
  if (err.status === 404 || err.code === 'PGRST116') return 'not_found'
  if (err.code === '23505') return 'conflict' // unique_violation

  // RAISE de validação nos RPCs = bug do cliente — não retry (contrato).
  return 'unknown'
}

/** Converte qualquer erro vindo do Supabase em DataLayerError. */
export function toDataLayerError(err: unknown, context: string): DataLayerError {
  if (err instanceof DataLayerError) return err

  const like: SupabaseErrorLike =
    typeof err === 'object' && err !== null ? (err as SupabaseErrorLike) : {}
  const message = like.message ?? String(err)

  return new DataLayerError(classify(like), `${context}: ${message}`, { cause: err })
}

/** Lança DataLayerError se a resposta do Supabase contiver erro. */
export function throwIfError(error: unknown, context: string): void {
  if (error) throw toDataLayerError(error, context)
}
