import { Hono } from 'hono'

const health = new Hono<{ Bindings: Env }>()

health.get('/', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
})

health.get('/database', async (c) => {
  try {
    const result = await c.env.DB
      .prepare(
        "SELECT COUNT(*) AS table_count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
      )
      .first<{ table_count: number }>()

    return c.json({
      status: 'connected',
      database: 'flashstock-db',
      tables: result?.table_count ?? 0
    })
  } catch (error) {
    console.error('Database connection failed:', error)

    return c.json({
      status: 'error',
      message: 'Database connection failed'
    }, 500)
  }
})

export default health