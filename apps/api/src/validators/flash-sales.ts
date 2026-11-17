import { z } from 'zod'

export const createFlashSaleSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  discountPrice: z.number().int().nonnegative('Discount price must be non-negative'),
  saleStockLimit: z.number().int().positive('Sale stock limit must be at least 1'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  status: z.enum(['draft', 'active', 'ended', 'cancelled']).default('active')
}).strict().refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'End time must be after start time'
})

export const updateFlashSaleSchema = z.object({
  discountPrice: z.number().int().nonnegative().optional(),
  saleStockLimit: z.number().int().positive().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.enum(['draft', 'active', 'ended', 'cancelled']).optional()
}).strict()
