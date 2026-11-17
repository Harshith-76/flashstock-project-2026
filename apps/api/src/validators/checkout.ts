import { z } from 'zod'

export const checkoutItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be greater than 0')
})

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(8, 'Idempotency key must be at least 8 characters').max(128),
  cartId: z.string().optional(),
  items: z.array(checkoutItemSchema).min(1, 'At least one item is required').optional(),
  shippingAddress: z.object({
    fullName: z.string().min(2),
    addressLine1: z.string().min(3),
    city: z.string().min(2),
    state: z.string().min(2),
    postalCode: z.string().min(3),
    country: z.string().default('India')
  }).optional()
}).strict().refine((data) => data.cartId || (data.items && data.items.length > 0), {
  message: 'Either cartId or a non-empty items array must be provided'
})
