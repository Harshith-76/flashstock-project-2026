import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { User, Session } from '../types'

export const SESSION_COOKIE_NAME = 'flashstock_session'

export function extractBearerToken(authHeader?: string | null): string | undefined {
  if (!authHeader) {
    return undefined
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : undefined
}

export async function getAuthenticatedUser(c: Context<{ Bindings: Env; Variables: any }>): Promise<{ user: User; session: Session } | null> {
  const cookieSessionId = getCookie(c, SESSION_COOKIE_NAME)
  const bearerToken = extractBearerToken(c.req.header('Authorization'))

  const sessionId = cookieSessionId || bearerToken

  if (!sessionId) {
    return null
  }

  try {
    const row = await c.env.DB.prepare(`
      SELECT
        s.id AS session_id,
        s.user_id,
        s.expires_at,
        s.created_at AS session_created_at,
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        u.updated_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
        AND s.expires_at > datetime('now')
    `).bind(sessionId).first<{
      session_id: string
      user_id: string
      expires_at: string
      session_created_at: string
      id: string
      name: string
      email: string
      role: 'customer' | 'admin'
      created_at: string
      updated_at: string
    }>()

    if (!row) {
      return null
    }

    const session: Session = {
      id: row.session_id,
      userId: row.user_id,
      expiresAt: row.expires_at,
      createdAt: row.session_created_at
    }

    const user: User = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }

    return { user, session }
  } catch (error) {
    console.error('Session lookup error:', error)
    return null
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { user: User; session: Session } }>, next: Next) {
  const auth = await getAuthenticatedUser(c)

  if (!auth) {
    return c.json({
      success: false,
      message: 'Authentication required. Please log in.'
    }, 401)
  }

  c.set('user', auth.user)
  c.set('session', auth.session)
  await next()
}

export async function optionalAuthMiddleware(c: Context<{ Bindings: Env; Variables: { user?: User; session?: Session } }>, next: Next) {
  const auth = await getAuthenticatedUser(c)

  if (auth) {
    c.set('user', auth.user)
    c.set('session', auth.session)
  }

  await next()
}
