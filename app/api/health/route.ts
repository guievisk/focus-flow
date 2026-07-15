import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { redis } from '@/lib/redis'

const CACHE_KEY = 'health:status'
const CACHE_TTL = 30 // segundos

export async function GET() {
  const startTime = Date.now()

  // 1. Tenta o cache primeiro. Se o Redis cair, .catch devolve null (fail open)
  const cached = await redis.get(CACHE_KEY).catch(() => null)
  if (cached) {
    return NextResponse.json({ ...(cached as object), cached: true })
  }

  // 2. Cache miss → busca no Supabase
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const supabaseLatency = Date.now() - startTime

    if (error) {
      return NextResponse.json(
        { status: 'unhealthy', error: error.message },
        { status: 503 }
      )
    }

    const payload = {
      status: 'ok',
      supabase: {
        connected: true,
        latency_ms: supabaseLatency,
        profiles_count: count,
      },
      timestamp: new Date().toISOString(),
    }

    // 3. Salva no cache com TTL de 30s (não bloqueia se falhar)
    await redis.set(CACHE_KEY, payload, { ex: CACHE_TTL }).catch(() => null)

    return NextResponse.json({ ...payload, cached: false })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}