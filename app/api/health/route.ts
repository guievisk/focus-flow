import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Query mais barata possível no Supabase — só conta linhas
    // count: 'exact', head: true faz COUNT sem trazer dados
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    const supabaseLatency = Date.now() - startTime
    
    if (error) {
      return NextResponse.json({
        status: 'unhealthy',
        error: error.message,
      }, { status: 503 })
    }
    
    return NextResponse.json({
      status: 'ok',
      supabase: {
        connected: true,
        latency_ms: supabaseLatency,
        profiles_count: count,
      },
      timestamp: new Date().toISOString(),
    })
    
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      message: err instanceof Error ? err.message : 'unknown',
    }, { status: 500 })
  }
}