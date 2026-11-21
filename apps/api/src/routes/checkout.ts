import { Hono } from 'hono'
import { CheckoutService } from '../services/checkout.service'
import { checkoutSchema } from '../validators/checkout'
import { authMiddleware } from '../middleware/auth'
import { User, Session } from '../types'
import { publicErrorMessage } from '../middleware/public-error'

const checkoutRoutes = new Hono<{ Bindings: Env; Variables: { user: User; session: Session } }>()

// Checkout requires authentication
checkoutRoutes.use('*', authMiddleware)

checkoutRoutes.post('/', async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()

    const validation = checkoutSchema.safeParse(body)
    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid checkout request',
        errors: validation.error.flatten()
      }, 400)
    }

    const { idempotencyKey, cartId, items, shippingAddress } = validation.data

    const checkoutService = new CheckoutService(c.env.DB)
    const result = await checkoutService.processCheckout({
      userId: user.id,
      idempotencyKey,
      cartId,
      items,
      shippingAddress
    })

    return c.json({
      success: true,
      message: result.isDuplicate ? 'Order retrieved from previous checkout' : 'Inventory reserved and order created',
      order: result.order,
      reservation: result.reservation,
      isDuplicate: result.isDuplicate || false
    }, result.isDuplicate ? 200 : 201)
  } catch (error: any) {
    console.error('Checkout error:', error)
    return c.json({
      success: false,
      message: publicErrorMessage(error, 'Checkout failed')
    }, error.statusCode || 500)
  }
})

export default checkoutRoutes
