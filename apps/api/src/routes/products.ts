import { Hono } from 'hono'
import { ProductService } from '../services/product.service'
import { createProductSchema, updateProductSchema } from '../validators/products'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { User, Session } from '../types'

const productRoutes = new Hono<{ Bindings: Env; Variables: { user: User; session: Session } }>()

// GET ALL ACTIVE PRODUCTS (supports category filtering, search, sorting)
productRoutes.get('/', async (c) => {
  try {
    const category = c.req.query('category')
    const search = c.req.query('search')
    const sort = c.req.query('sort') as any
    const includeArchived = c.req.query('includeArchived') === 'true'

    const productService = new ProductService(c.env.DB)
    const products = await productService.listProducts({
      category,
      search,
      sort,
      includeArchived
    })

    return c.json({
      success: true,
      count: products.length,
      products
    })
  } catch (error: any) {
    console.error('List products error:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to fetch products'
    }, 500)
  }
})

// GET PRODUCT BY ID (includes inventory & active flash sale)
productRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const productService = new ProductService(c.env.DB)
    const product = await productService.getProductById(id)

    if (!product) {
      return c.json({
        success: false,
        message: 'Product not found'
      }, 404)
    }

    return c.json({
      success: true,
      product,
      inventory: {
        on_hand: product.onHand,
        reserved: product.reserved,
        available: product.available
      }
    })
  } catch (error: any) {
    console.error('Get product error:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to fetch product'
    }, 500)
  }
})

// CREATE PRODUCT (Admin only)
productRoutes.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const validation = createProductSchema.safeParse(body)

    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid product data',
        errors: validation.error.flatten()
      }, 400)
    }

    const productService = new ProductService(c.env.DB)
    const product = await productService.createProduct(validation.data)

    return c.json({
      success: true,
      message: 'Product created successfully',
      product
    }, 201)
  } catch (error: any) {
    console.error('Product creation failed:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to create product'
    }, error.statusCode || 500)
  }
})

// UPDATE PRODUCT (Admin only)
productRoutes.patch('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = c.req.param('id')
    if (!id) {
      return c.json({ success: false, message: 'Product ID is required' }, 400)
    }
    const body = await c.req.json()
    const validation = updateProductSchema.safeParse(body)

    if (!validation.success) {
      return c.json({
        success: false,
        message: 'Invalid update data',
        errors: validation.error.flatten()
      }, 400)
    }

    const productService = new ProductService(c.env.DB)
    const product = await productService.updateProduct(id, validation.data)

    return c.json({
      success: true,
      message: 'Product updated successfully',
      product
    })
  } catch (error: any) {
    console.error('Update product error:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to update product'
    }, error.statusCode || 500)
  }
})

// ARCHIVE PRODUCT (Admin only)
productRoutes.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = c.req.param('id')
    if (!id) {
      return c.json({ success: false, message: 'Product ID is required' }, 400)
    }
    const productService = new ProductService(c.env.DB)
    await productService.archiveProduct(id)

    return c.json({
      success: true,
      message: 'Product archived successfully'
    })
  } catch (error: any) {
    console.error('Archive product error:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to archive product'
    }, error.statusCode || 500)
  }
})

export default productRoutes
