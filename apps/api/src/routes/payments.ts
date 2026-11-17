import { Hono } from 'hono'
import { PaymentService } from '../services/payment.service'
import { simulatePaymentSchema } from '../validators/payments'
import { authMiddleware } from '../middleware/auth'
import { User, Session } from '../types'

const paymentRoutes = new Hono<{ Bindings: Env; Variables: { user: User; session: Session } }>()

paymentRoutes.use('*', authMiddleware)

// SIMULATE PAYMENT
paymentRoutes.post('/simulate', async (c) => {
  try {
    const body = await c.req.json()
    const validation = simulatePaymentSchema.safeParse(body)

    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid payment parameters',
        errors: validation.error.flatten()
      }, 400)
    }

    const paymentService = new PaymentService(c.env.DB)
    const result = await paymentService.simulatePayment({
      orderId: validation.data.orderId,
      outcome: validation.data.outcome,
      providerReference: validation.data.providerReference
    })

    return c.json({
      success: result.payment.status === 'succeeded',
      message: result.message,
      payment: result.payment,
      orderStatus: result.orderStatus
    })
  } catch (error: any) {
    console.error('Payment simulation error:', error)
    return c.json({
      success: false,
      message: error.message || 'Payment simulation failed'
    }, error.statusCode || 500)
  }
})

// GET PAYMENT BY ORDER ID
paymentRoutes.get('/:orderId', async (c) => {
  try {
    const orderId = c.req.param('orderId')
    const paymentService = new PaymentService(c.env.DB)
    const payment = await paymentService.getPaymentByOrderId(orderId)

    if (!payment) {
      return c.json({
        success: false,
        message: 'No payment record found for this order'
      }, 404)
    }

    return c.json({
      success: true,
      payment
    })
  } catch (error: any) {
    console.error('Get payment error:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to fetch payment'
    }, 500)
  }
})

export default paymentRoutes
