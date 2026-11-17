import { z } from 'zod'

export const simulatePaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  outcome: z.enum(['success', 'failure', 'timeout', 'expired']).default('success'),
  providerReference: z.string().optional()
}).strict()
