import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/server'
import { redis } from '@/lib/redis'

const CACHE_TTL = 300 

export async function DELETE() {
  const supabase = await getSupabaseServer()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await redis.del(`profile:${user.id}`).catch(() => null)
  return NextResponse.json({ invalidated: true })
}

export async function GET() {
  const supabase = await getSupabaseServer()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cacheKey = `profile:${user.id}`

  const cached = await redis.get(cacheKey).catch(() => null)
  if (cached) {
    return NextResponse.json({ profile: cached, cached: true })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await redis.set(cacheKey, data, { ex: CACHE_TTL }).catch(() => null)

  return NextResponse.json({ profile: data, cached: false })
}