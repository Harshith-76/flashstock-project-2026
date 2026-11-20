import { Hono } from 'hono'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import { AuthService } from '../services/auth.service'
import { registerSchema, loginSchema } from '../validators/auth'
import { authMiddleware, SESSION_COOKIE_NAME, extractBearerToken } from '../middleware/auth'
import { rateLimiter } from '../middleware/rate-limiter'
import { User, Session } from '../types'

const authRoutes = new Hono<{ Bindings: Env; Variables: { user: User; session: Session } }>()

// Rate limit: 20 attempts per 5 minutes on login/register
const authRateLimit = rateLimiter({ maxRequests: 20, windowMs: 5 * 60 * 1000 })

authRoutes.post('/register', authRateLimit, async (c) => {
  try {
    const body = await c.req.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid registration details',
        errors: validation.error.flatten()
      }, 400)
    }

    const authService = new AuthService(c.env.DB)
    const { user, session } = await authService.register(validation.data)

    setCookie(c, SESSION_COOKIE_NAME, session.id, {
      path: '/',
      httpOnly: true,
      secure: new URL(c.req.url).protocol === 'https:',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60
    })

    return c.json({
      success: true,
      message: 'Account created successfully',
      user
    }, 201)
  } catch (error: any) {
    console.error('Registration failed:', error)
    return c.json({
      success: false,
      message: error.message || 'Registration failed'
    }, error.statusCode || 500)
  }
})

authRoutes.post('/login', authRateLimit, async (c) => {
  try {
    const body = await c.req.json()
    const validation = loginSchema.safeParse(body)

    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid login credentials',
        errors: validation.error.flatten()
      }, 400)
    }

    const authService = new AuthService(c.env.DB)
    const { user, session } = await authService.login(validation.data)

    setCookie(c, SESSION_COOKIE_NAME, session.id, {
      path: '/',
      httpOnly: true,
      secure: new URL(c.req.url).protocol === 'https:',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60
    })

    return c.json({
      success: true,
      message: 'Logged in successfully',
      user
    })
  } catch (error: any) {
    console.error('Login failed:', error)
    return c.json({
      success: false,
      message: error.message || 'Login failed'
    }, error.statusCode || 500)
  }
})

authRoutes.post('/logout', async (c) => {
  try {
    const authService = new AuthService(c.env.DB)
    const sessionId = getCookie(c, SESSION_COOKIE_NAME) || extractBearerToken(c.req.header('Authorization'))

    if (sessionId) {
      await authService.logout(sessionId)
    }

    deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' })

    return c.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error: any) {
    console.error('Logout error:', error)
    return c.json({
      success: false,
      message: 'Logout failed'
    }, 500)
  }
})

authRoutes.get('/me', authMiddleware, (c) => {
  const user = c.get('user')
  return c.json({
    success: true,
    user
  })
})

export default authRoutes
