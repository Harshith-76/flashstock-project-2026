const API_BASE_URL = '/api/v1'

class ApiError extends Error {
  statusCode: number
  errors?: any

  constructor(message: string, statusCode: number, errors?: any) {
    super(message)
    this.statusCode = statusCode
    this.errors = errors
    this.name = 'ApiError'
  }
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  })

  let data: any
  try {
    data = await response.json()
  } catch (err) {
    data = null
  }

  if (!response.ok) {
    const message = data?.message || `HTTP ${response.status}: Request failed`
    throw new ApiError(message, response.status, data?.errors)
  }

  return data as T
}

export const api = {
  // Auth
  register: (payload: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Products
  getProducts: (params?: { category?: string; search?: string; sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular'; includeArchived?: boolean }) => {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.append('category', params.category)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.sort) searchParams.append('sort', params.sort)
    if (params?.includeArchived) searchParams.append('includeArchived', 'true')
    const query = searchParams.toString()
    return request(`/products${query ? `?${query}` : ''}`)
  },
  getProductById: (id: string) => request(`/products/${id}`),
  createProduct: (payload: any) => request('/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id: string, payload: any) => request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  archiveProduct: (id: string) => request(`/products/${id}`, { method: 'DELETE' }),

  // Cart
  getCart: () => request('/cart'),
  addToCart: (productId: string, quantity: number = 1) =>
    request('/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
  updateCartItem: (itemId: string, quantity: number) =>
    request(`/cart/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
  removeCartItem: (itemId: string) => request(`/cart/items/${itemId}`, { method: 'DELETE' }),
  clearCart: () => request('/cart', { method: 'DELETE' }),

  // Checkout & Reservations
  checkout: (payload: { idempotencyKey: string; cartId?: string; items?: { productId: string; quantity: number }[]; shippingAddress?: any }) =>
    request('/checkout', { method: 'POST', body: JSON.stringify(payload) }),
  getReservation: (orderId: string) => request(`/reservations/${orderId}`),
  sweepExpiredReservations: () => request('/reservations/sweep-expired', { method: 'POST' }),

  // Orders
  getOrders: (params?: { all?: boolean; status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.all) searchParams.append('all', 'true')
    if (params?.status) searchParams.append('status', params.status)
    const query = searchParams.toString()
    return request(`/orders${query ? `?${query}` : ''}`)
  },
  getOrderById: (id: string) => request(`/orders/${id}`),
  updateOrderStatus: (id: string, status: string) =>
    request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Payments
  simulatePayment: (payload: { orderId: string; outcome?: 'success' | 'failure' | 'timeout' | 'expired'; providerReference?: string }) =>
    request('/payments/simulate', { method: 'POST', body: JSON.stringify(payload) }),
  getPaymentByOrderId: (orderId: string) => request(`/payments/${orderId}`),

  // Flash Sales
  getActiveFlashSales: () => request('/flash-sales/active'),
  getAllFlashSales: () => request('/flash-sales'),
  createFlashSale: (payload: any) => request('/flash-sales', { method: 'POST', body: JSON.stringify(payload) }),
  updateFlashSale: (id: string, payload: any) => request(`/flash-sales/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Inventory & Movements
  getInventory: () => request('/inventory'),
  getInventoryMovements: (params?: { productId?: string; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.productId) searchParams.append('productId', params.productId)
    if (params?.limit) searchParams.append('limit', String(params.limit))
    const query = searchParams.toString()
    return request(`/inventory/movements${query ? `?${query}` : ''}`)
  },
  adjustInventory: (productId: string, onHand: number, notes?: string) =>
    request(`/inventory/${productId}`, { method: 'PATCH', body: JSON.stringify({ onHand, notes }) }),

  // Analytics & Admin
  getAnalyticsOverview: () => request('/analytics/overview'),
  getCustomers: () => request('/admin/customers'),
  seedDemoData: () => request('/admin/seed-demo-data', { method: 'POST' }),

  // Health
  checkHealth: () => request('/health'),
  checkDatabaseHealth: () => request('/health/database')
}
