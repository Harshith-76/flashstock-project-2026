import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { createDb } from '../db'
import { products } from '../db/schema'

const productRoutes = new Hono<{ Bindings: Env }>()

// GET /api/v1/products
productRoutes.get('/', async (c) => {
  try {
    const db = createDb(c.env.DB)

    const result = await db
      .select()
      .from(products)
      .where(eq(products.status, 'active'))

    return c.json({
      success: true,
      count: result.length,
      products: result
    })
  } catch (error) {
    console.error('Failed to fetch products:', error)

    return c.json({
      success: false,
      message: 'Unable to fetch products'
    }, 500)
  }
})

export default productRoutes