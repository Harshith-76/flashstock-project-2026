import { Context, Next } from 'hono'
import { User, Session } from '../types'

export async function adminMiddleware(c: Context<{ Bindings: Env; Variables: { user: User; session: Session } }>, next: Next) {
  const user = c.get('user')

  if (!user || user.role !== 'admin') {
    return c.json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    }, 403)
  }

  await next()
}
