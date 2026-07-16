import { redis } from './redis'

type RateLimitOptions = {
  key: string        
  limit: number      
  windowSec: number  
}

export async function checkRateLimit({ key, limit, windowSec }: RateLimitOptions) {
  const redisKey = `ratelimit:${key}`

  try {
    const count = await redis.incr(redisKey)

    if (count === 1) {
      await redis.expire(redisKey, windowSec)
    }

    return {
      allowed: count <= limit,
      count,
      limit,
      remaining: Math.max(0, limit - count),
    }
  } catch {
    return { allowed: true, count: 0, limit, remaining: limit }
  }
}