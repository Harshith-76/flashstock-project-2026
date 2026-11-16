import { Hono } from 'hono'
import health from './routes/health'
import productRoutes from './routes/products'

const app = new Hono<{ Bindings: Env }>()

// Main API endpoint
app.get('/', (c) => {
  return c.json({
    name: 'FlashStock API',
    message: 'Welcome to FlashStock!',
    version: '1.0.0',
    status: 'running'
  })
})

// Mount API routes
app.route('/api/v1/health', health)
app.route('/api/v1/products', productRoutes)

export default app