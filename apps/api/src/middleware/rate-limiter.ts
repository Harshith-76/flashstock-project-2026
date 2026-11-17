
import { Context, Next } from 'hono'

// In-memory rate limiter for sensitive endpoints
interface RateLimitRecord {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitRecord>()

let requestCounter = 0

export function rateLimiter(options: { maxRequests: number; windowMs: number }) {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for') ||
      '127.0.0.1'

    const key = `${c.req.path}:${ip}`
    const now = Date.now()

    // Periodically clean expired records without background timers
    requestCounter++

    if (requestCounter % 100 === 0) {
      for (const [recordKey, record] of rateLimitMap.entries()) {
        if (record.resetTime <= now) {
          rateLimitMap.delete(recordKey)
        }
      }
    }

    let record = rateLimitMap.get(key)

    if (!record || record.resetTime <= now) {
      record = {
        count: 1,
        resetTime: now + options.windowMs
      }

      rateLimitMap.set(key, record)
    } else {
      record.count++
    }

    if (record.count > options.maxRequests) {
      return c.json(
        {
          success: false,
          message: 'Too many requests. Please try again later.'
        },
        429
      )
    }

    await next()
  }
}