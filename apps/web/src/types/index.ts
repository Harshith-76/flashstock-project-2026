export type UserRole = 'customer' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface FlashSale {
  id: string
  productId: string
  discountPrice: number
  saleStockLimit: number
  allocatedStock: number
  startTime: string
  endTime: string
  status: 'draft' | 'active' | 'ended' | 'cancelled'
  productName?: string
  originalPrice?: number
}

export interface Product {
  id: string
  name: string
  description: string | null
  sku: string
  price: number // in paise
  category: string | null
  imageUrl: string | null
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
  onHand: number
  reserved: number
  available: number
  flashSale?: FlashSale | null
}

export interface CartItem {
  id: string
  cartId: string
  productId: string
  quantity: number
  name?: string
  sku?: string
  price?: number
  imageUrl?: string | null
  available?: number
}

export interface Cart {
  id: string
  userId: string
  status: 'active' | 'converted' | 'abandoned'
  items: CartItem[]
  totalAmount: number
  itemCount: number
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string | null
  productName: string
  unitPrice: number
  quantity: number
  subtotal: number
  imageUrl?: string | null
}

export interface Reservation {
  id: string
  orderId: string
  status: 'active' | 'confirmed' | 'released' | 'expired'
  expiresAt: string
  createdAt: string
  items?: { id: string; productId: string; quantity: number; productName?: string }[]
  isExpired?: boolean
}

export interface Payment {
  id: string
  orderId: string
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  amount: number
  providerReference: string | null
  createdAt: string
}

export interface Order {
  id: string
  orderNumber: string
  userId: string
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'payment_failed'
  totalAmount: number
  createdAt: string
  updatedAt: string
  customerName?: string
  customerEmail?: string
  items?: OrderItem[]
  reservation?: Reservation | null
  payment?: Payment | null
}

export interface InventoryRecord {
  productId: string
  name: string
  sku: string
  status: string
  onHand: number
  reserved: number
  available: number
}

export interface InventoryMovement {
  id: string
  productId: string
  productName?: string
  sku?: string
  movementType: 'stock_received' | 'stock_reserved' | 'reservation_released' | 'stock_sold' | 'adjustment'
  quantity: number
  referenceId: string | null
  notes: string | null
  createdAt: string
}

export interface AnalyticsOverview {
  revenue: {
    totalPaise: number
    totalRupees: number
  }
  orders: {
    total: number
    pending: number
    confirmed: number
    shipped: number
    delivered: number
    cancelled: number
    failed: number
  }
  customers: {
    total: number
  }
  inventory: {
    totalProducts: number
    activeProducts: number
    totalOnHand: number
    totalReserved: number
    totalAvailable: number
  }
  lowStockProducts: {
    id: string
    name: string
    sku: string
    onHand: number
    reserved: number
    available: number
  }[]
  bestSellers: {
    productId: string
    productName: string
    unitsSold: number
    totalSales: number
  }[]
  recentOrders: {
    id: string
    orderNumber: string
    status: string
    totalAmount: number
    createdAt: string
    customerName: string
    customerEmail: string
  }[]
  revenueTrends: {
    date: string
    revenue: number
    orderCount: number
  }[]
}
