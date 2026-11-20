import { Hono } from 'hono'
import { InventoryService } from '../services/inventory.service'
import { updateInventorySchema } from '../validators/products'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { User, Session } from '../types'

const inventoryRoutes = new Hono<{ Bindings: Env; Variables: { user: User; session: Session } }>()

// All inventory management routes require Admin privileges
inventoryRoutes.use('*', authMiddleware, adminMiddleware)

// GET ALL INVENTORY
inventoryRoutes.get('/', async (c) => {
  try {
    const inventoryService = new InventoryService(c.env.DB)
    const inventory = await inventoryService.getAllInventory()

    return c.json({
      success: true,
      count: inventory.length,
      inventory
    })
  } catch (error: any) {
    console.error('Get inventory failed:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to retrieve inventory'
    }, 500)
  }
})

// GET INVENTORY MOVEMENTS (AUDIT TRAIL)
inventoryRoutes.get('/movements', async (c) => {
  try {
    const productId = c.req.query('productId')
    const limit = parseInt(c.req.query('limit') || '50', 10)

    const inventoryService = new InventoryService(c.env.DB)
    const movements = await inventoryService.getMovements(productId, limit)

    return c.json({
      success: true,
      count: movements.length,
      movements
    })
  } catch (error: any) {
    console.error('Get movements failed:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to retrieve inventory movements'
    }, 500)
  }
})

// UPDATE / ADJUST INVENTORY
inventoryRoutes.patch('/:productId', async (c) => {
  try {
    const productId = c.req.param('productId')
    const body = await c.req.json()

    const validation = updateInventorySchema.safeParse(body)
    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid inventory data',
        errors: validation.error.flatten()
      }, 400)
    }

    const inventoryService = new InventoryService(c.env.DB)
    const updated = await inventoryService.adjustStock(productId, validation.data.onHand, validation.data.notes)

    return c.json({
      success: true,
      message: 'Inventory updated successfully',
      inventory: updated
    })
  } catch (error: any) {
    console.error('Adjust inventory failed:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to update inventory'
    }, error.statusCode || 500)
  }
})

export default inventoryRoutes
