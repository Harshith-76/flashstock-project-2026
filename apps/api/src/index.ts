import { Hono } from 'hono'
import { cors } from 'hono/cors'

import health from './routes/health'
import authRoutes from './routes/auth'
import productRoutes from './routes/products'
import inventoryRoutes from './routes/inventory'
import cartRoutes from './routes/cart'
import checkoutRoutes from './routes/checkout'
import orderRoutes from './routes/orders'
import reservationRoutes from './routes/reservations'
import paymentRoutes from './routes/payments'
import flashSaleRoutes from './routes/flash-sales'
import analyticsRoutes from './routes/analytics'
import adminRoutes from './routes/admin'
import { User, Session } from './types'
import { ReservationService } from './services/reservation.service'

const app = new Hono<{ Bindings: Env; Variables: { user: User; session: Session } }>()

// CORS MIDDLEWARE
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key']
  })
)

// API ROOT INFORMATION
app.get('/', (c) => {
  return c.json({
    name: 'FlashStock API',
    message: 'Welcome to FlashStock!',
    version: '1.0.0',
    status: 'running'
  })
})

// MOUNT API ROUTES
app.route('/api/v1/health', health)
app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/products', productRoutes)
app.route('/api/v1/inventory', inventoryRoutes)
app.route('/api/v1/cart', cartRoutes)
app.route('/api/v1/checkout', checkoutRoutes)
app.route('/api/v1/orders', orderRoutes)
app.route('/api/v1/reservations', reservationRoutes)
app.route('/api/v1/payments', paymentRoutes)
app.route('/api/v1/flash-sales', flashSaleRoutes)
app.route('/api/v1/analytics', analyticsRoutes)
app.route('/api/v1/admin', adminRoutes)

// GLOBAL NOT FOUND HANDLER
app.notFound((c) => {
  return c.json({
    success: false,
    message: 'API endpoint not found'
  }, 404)
})

// GLOBAL ERROR HANDLER
app.onError((error: any, c) => {
  console.error('Unhandled API error:', error)

  const requestedStatus = error?.statusCode && typeof error.statusCode === 'number' ? error.statusCode : 500
  const statusCode = requestedStatus >= 400 && requestedStatus < 500 ? requestedStatus : 500

  return c.json({
    success: false,
    message: statusCode < 500 ? error?.message || 'Request failed' : 'Internal server error'
  }, statusCode as any)
})

export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(new ReservationService(env.DB).expireStaleReservations())
  }
}
