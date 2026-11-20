import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(150),

  description: z.string().max(2000).optional(),

  sku: z.string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/),

  price: z.number().int().nonnegative(),

  category: z.string().trim().max(100).optional(),

  imageUrl: z.string().url().optional(),

  initialStock: z.number().int().nonnegative().default(0)
}).strict()

export const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),

  description: z.string().max(2000).nullable().optional(),

  sku: z.string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),

  price: z.number().int().nonnegative().optional(),

  category: z.string().trim().max(100).nullable().optional(),

  imageUrl: z.string().url().nullable().optional()
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
)

export const updateInventorySchema = z.object({
  onHand: z.number().int().nonnegative(),
  notes: z.string().trim().max(500).optional()
}).strict()
