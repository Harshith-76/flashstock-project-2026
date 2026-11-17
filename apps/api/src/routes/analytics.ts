import { Hono } from 'hono'
import { AnalyticsService } from '../services/analytics.service'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { User, Session } from '../types'

const analyticsRoutes = new Hono<{ Bindings: Env; Variables: { user: User; session: Session } }>()

analyticsRoutes.use('*', authMiddleware, adminMiddleware)

analyticsRoutes.get('/overview', async (c) => {
  try {
    const analyticsService = new AnalyticsService(c.env.DB)
    const overview = await analyticsService.getDashboardOverview()

    return c.json({
      success: true,
      analytics: overview
    })
  } catch (error: any) {
    console.error('Analytics overview error:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to fetch analytics'
    }, 500)
  }
})

export default analyticsRoutes
