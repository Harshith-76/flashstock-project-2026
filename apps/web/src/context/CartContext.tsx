import React, { createContext, useContext, useState, useEffect } from 'react'
import { Cart, CartItem } from '../types'
import { api } from '../services/api'
import { useAuth } from './AuthContext'

interface CartContextType {
  cart: Cart | null
  isLoading: boolean
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  refreshCart: () => Promise<void>
  addToCart: (productId: string, quantity?: number) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  removeFromCart: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  itemCount: number
  totalAmount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [cart, setCart] = useState<Cart | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)

  const refreshCart = async () => {
    if (!user) {
      setCart(null)
      return
    }
    setIsLoading(true)
    try {
      const res = await api.getCart()
      if (res?.success) {
        setCart(res.cart)
      }
    } catch (err) {
      console.error('Failed to load cart:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshCart()
  }, [user])

  const addToCart = async (productId: string, quantity: number = 1) => {
    if (!user) {
      throw new Error('Please log in to add items to your cart')
    }
    setIsLoading(true)
    try {
      const res = await api.addToCart(productId, quantity)
      if (res?.success) {
        setCart(res.cart)
        setIsDrawerOpen(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    setIsLoading(true)
    try {
      const res = await api.updateCartItem(itemId, quantity)
      if (res?.success) {
        setCart(res.cart)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const removeFromCart = async (itemId: string) => {
    setIsLoading(true)
    try {
      const res = await api.removeCartItem(itemId)
      if (res?.success) {
        setCart(res.cart)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const clearCart = async () => {
    setIsLoading(true)
    try {
      await api.clearCart()
      await refreshCart()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        refreshCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        itemCount: cart?.itemCount ?? 0,
        totalAmount: cart?.totalAmount ?? 0
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
