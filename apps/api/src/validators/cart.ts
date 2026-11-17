import { z } from 'zod'

export const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be at least 1').default(1)
}).strict()

export const updateCartItemSchema = z.object({
  quantity: z.number().int().nonnegative('Quantity must be 0 or greater')
}).strict()
