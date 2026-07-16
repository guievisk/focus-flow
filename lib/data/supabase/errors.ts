
import { DataLayerError, type DataLayerErrorCode } from '../errors'

type SupabaseErrorLike = {
  message?: string
  code?: string
  status?: number
}

function classify(err: SupabaseErrorLike): DataLayerErrorCode {
  const message = (err.message ?? '').toLowerCase()

  if (/fetch|network|timeout|failed to load|load failed/.test(message)) return 'network'

  if (err.status === 401 || err.status === 403 || err.code === 'PGRST301') return 'unauthorized'
  if (err.status === 404 || err.code === 'PGRST116') return 'not_found'
  if (err.code === '23505') return 'conflict'

  return 'unknown'
}

export function toDataLayerError(err: unknown, context: string): DataLayerError {
  if (err instanceof DataLayerError) return err

  const like: SupabaseErrorLike =
    typeof err === 'object' && err !== null ? (err as SupabaseErrorLike) : {}
  const message = like.message ?? String(err)

  return new DataLayerError(classify(like), `${context}: ${message}`, { cause: err })
}

export function throwIfError(error: unknown, context: string): void {
  if (error) throw toDataLayerError(error, context)
}
