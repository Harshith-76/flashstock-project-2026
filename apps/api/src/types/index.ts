export type UserRole = 'customer' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface Session {
  id: string
  userId: string
  expiresAt: string
  createdAt: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  sku: string
  price: number
  category: string | null
  imageUrl: string | null
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface ProductWithInventory extends Product {
  onHand: number
  reserved: number
  available: number
  flashSale?: FlashSale | null
}

export interface InventoryRecord {
  productId: string
  name?: string
  sku?: string
  status?: string
  onHand: number
  reserved: number
  available: number
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
}

export interface Order {
  id: string
  orderNumber: string
  userId: string
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'payment_failed'
  totalAmount: number
  createdAt: string
  updatedAt: string
  items?: OrderItem[]
  reservation?: Reservation | null
}

export interface Reservation {
  id: string
  orderId: string
  status: 'active' | 'confirmed' | 'released' | 'expired'
  expiresAt: string
  createdAt: string
  items?: ReservationItem[]
}

export interface ReservationItem {
  id: string
  reservationId: string
  productId: string
  quantity: number
}

export interface Payment {
  id: string
  orderId: string
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  amount: number
  providerReference: string | null
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
  createdAt: string
  updatedAt: string
  productName?: string
  originalPrice?: number
}

export interface AuthVariables {
  user?: User
  session?: Session
}
