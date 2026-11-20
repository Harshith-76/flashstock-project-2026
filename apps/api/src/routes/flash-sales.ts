import { Hono } from 'hono'
import { FlashSaleService } from '../services/flash-sale.service'
import { createFlashSaleSchema, updateFlashSaleSchema } from '../validators/flash-sales'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { User, Session } from '../types'

const flashSaleRoutes = new Hono<{ Bindings: Env; Variables: { user: User; session: Session } }>()

// PUBLIC: GET ACTIVE FLASH SALES
flashSaleRoutes.get('/active', async (c) => {
  try {
    const flashSaleService = new FlashSaleService(c.env.DB)
    const sales = await flashSaleService.getActiveFlashSales()

    return c.json({
      success: true,
      count: sales.length,
      flashSales: sales
    })
  } catch (error: any) {
    console.error('Get active flash sales error:', error)
    return c.json({
      success: false,
      message: 'Unable to fetch active flash sales'
    }, 500)
  }
})

// ADMIN: GET ALL FLASH SALES
flashSaleRoutes.get('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const flashSaleService = new FlashSaleService(c.env.DB)
    const sales = await flashSaleService.getAllFlashSales()

    return c.json({
      success: true,
      count: sales.length,
      flashSales: sales
    })
  } catch (error: any) {
    console.error('Get all flash sales error:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to fetch flash sales'
    }, 500)
  }
})

// ADMIN: CREATE FLASH SALE
flashSaleRoutes.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const validation = createFlashSaleSchema.safeParse(body)

    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid flash sale parameters',
        errors: validation.error.flatten()
      }, 400)
    }

    const flashSaleService = new FlashSaleService(c.env.DB)
    const sale = await flashSaleService.createFlashSale(validation.data)

    return c.json({
      success: true,
      message: 'Flash sale created successfully',
      flashSale: sale
    }, 201)
  } catch (error: any) {
    console.error('Create flash sale error:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to create flash sale'
    }, error.statusCode || 500)
  }
})

// ADMIN: UPDATE FLASH SALE
flashSaleRoutes.patch('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = c.req.param('id')
    if (!id) {
      return c.json({ success: false, message: 'Flash sale ID required' }, 400)
    }
    const body = await c.req.json()

    const validation = updateFlashSaleSchema.safeParse(body)
    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid flash sale update',
        errors: validation.error.flatten()
      }, 400)
    }

    const flashSaleService = new FlashSaleService(c.env.DB)
    const updated = await flashSaleService.updateFlashSale(id, validation.data)

    return c.json({
      success: true,
      message: 'Flash sale updated successfully',
      flashSale: updated
    })
  } catch (error: any) {
    console.error('Update flash sale error:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to update flash sale'
    }, error.statusCode || 500)
  }
})

export default flashSaleRoutes
