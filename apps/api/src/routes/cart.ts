import { Hono } from 'hono'
import { CartService } from '../services/cart.service'
import { addToCartSchema, updateCartItemSchema } from '../validators/cart'
import { authMiddleware } from '../middleware/auth'
import { User, Session } from '../types'
import { publicErrorMessage } from '../middleware/public-error'

const cartRoutes = new Hono<{ Bindings: Env; Variables: { user: User; session: Session } }>()

// All cart operations require authentication
cartRoutes.use('*', authMiddleware)

// GET CART
cartRoutes.get('/', async (c) => {
  try {
    const user = c.get('user')
    const cartService = new CartService(c.env.DB)
    const cart = await cartService.getCart(user.id)

    return c.json({
      success: true,
      cart
    })
  } catch (error: any) {
    console.error('Get cart error:', error)
    return c.json({
      success: false,
      message: publicErrorMessage(error, 'Unable to fetch cart')
    }, 500)
  }
})

// ADD ITEM TO CART
cartRoutes.post('/items', async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()

    const validation = addToCartSchema.safeParse(body)
    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid item data',
        errors: validation.error.flatten()
      }, 400)
    }

    const cartService = new CartService(c.env.DB)
    const cart = await cartService.addItem(user.id, validation.data.productId, validation.data.quantity)

    return c.json({
      success: true,
      message: 'Item added to cart',
      cart
    })
  } catch (error: any) {
    console.error('Add to cart error:', error)
    return c.json({
      success: false,
      message: publicErrorMessage(error, 'Unable to add item to cart')
    }, error.statusCode || 500)
  }
})

// UPDATE CART ITEM QUANTITY
cartRoutes.patch('/items/:id', async (c) => {
  try {
    const user = c.get('user')
    const cartItemId = c.req.param('id')
    const body = await c.req.json()

    const validation = updateCartItemSchema.safeParse(body)
    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid quantity',
        errors: validation.error.flatten()
      }, 400)
    }

    const cartService = new CartService(c.env.DB)
    const cart = await cartService.updateItemQuantity(user.id, cartItemId, validation.data.quantity)

    return c.json({
      success: true,
      message: 'Cart updated',
      cart
    })
  } catch (error: any) {
    console.error('Update cart item error:', error)
    return c.json({
      success: false,
      message: publicErrorMessage(error, 'Unable to update cart item')
    }, error.statusCode || 500)
  }
})

// REMOVE ITEM FROM CART
cartRoutes.delete('/items/:id', async (c) => {
  try {
    const user = c.get('user')
    const cartItemId = c.req.param('id')

    const cartService = new CartService(c.env.DB)
    const cart = await cartService.removeItem(user.id, cartItemId)

    return c.json({
      success: true,
      message: 'Item removed from cart',
      cart
    })
  } catch (error: any) {
    console.error('Remove cart item error:', error)
    return c.json({
      success: false,
      message: publicErrorMessage(error, 'Unable to remove item')
    }, error.statusCode || 500)
  }
})

// CLEAR CART
cartRoutes.delete('/', async (c) => {
  try {
    const user = c.get('user')
    const cartService = new CartService(c.env.DB)
    await cartService.clearCart(user.id)

    return c.json({
      success: true,
      message: 'Cart cleared'
    })
  } catch (error: any) {
    console.error('Clear cart error:', error)
    return c.json({
      success: false,
      message: publicErrorMessage(error, 'Unable to clear cart')
    }, 500)
  }
})

export default cartRoutes
