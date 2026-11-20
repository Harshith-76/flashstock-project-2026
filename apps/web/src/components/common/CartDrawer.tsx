import React from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react'
import { useCart } from '../../context/CartContext'

export const CartDrawer: React.FC = () => {
  const { cart, isDrawerOpen, closeDrawer, updateQuantity, removeFromCart, totalAmount, itemCount } = useCart()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const update = async (action: () => Promise<void>) => {
    setError('')
    try { await action() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Cart update failed') }
  }

  if (!isDrawerOpen) return null

  const totalFormatted = (totalAmount / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  })

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0B0F19] border-l border-[#1F293D] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-[#1F293D] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Your Cart</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              onClick={closeDrawer}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-xs text-red-200">{error}</p>}
            {!cart?.items || cart.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <div className="w-16 h-16 rounded-2xl bg-dark-800/80 border border-dark-700 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Your cart is empty</h3>
                <p className="text-xs text-gray-500 max-w-xs mb-6">
                  Browse our catalog to discover high-concurrency protected products.
                </p>
                <button
                  onClick={() => {
                    closeDrawer()
                    navigate('/products')
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-dark-950 hover:bg-amber-400 transition-colors"
                >
                  Explore Products
                </button>
              </div>
            ) : (
              cart.items.map((item) => {
                const itemPrice = ((item.price ?? 0) / 100).toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0
                })

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#0F1626] border border-[#1A253D] flex gap-3.5 items-center justify-between"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover bg-dark-900 border border-dark-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-dark-900 border border-dark-700 flex items-center justify-center flex-shrink-0 text-gray-600">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate mb-0.5">{item.name}</h4>
                      <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-2">
                        <span>{itemPrice}</span>
                        {item.available !== undefined && (
                          <span className="text-[10px] text-gray-500">({item.available} in stock)</span>
                        )}
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-dark-600 rounded-lg bg-dark-900">
                          <button
                            onClick={() => void update(() => updateQuantity(item.id, item.quantity - 1))}
                            className="p-1 hover:text-amber-400 text-gray-400 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-mono font-medium text-white">{item.quantity}</span>
                          <button
                            onClick={() => void update(() => updateQuantity(item.id, item.quantity + 1))}
                            disabled={item.available !== undefined && item.quantity >= item.available}
                            className="p-1 hover:text-amber-400 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => void update(() => removeFromCart(item.id))}
                          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer with Subtotal & Checkout */}
          {cart?.items && cart.items.length > 0 && (
            <div className="p-5 border-t border-[#1F293D] bg-[#090D17] space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-white font-mono font-medium">{totalFormatted}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Inventory</span>
                  <span className="text-gray-300 font-medium">Checked at checkout</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span className="text-gray-300">Free</span>
                </div>
                <div className="pt-2 border-t border-dark-800 flex justify-between text-sm font-bold text-white">
                  <span>Total</span>
                  <span className="font-mono text-amber-400 text-base">{totalFormatted}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    closeDrawer()
                    navigate('/cart')
                  }}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-700 text-gray-300 border border-dark-600 transition-colors"
                >
                  View Full Cart
                </button>
                <button
                  onClick={() => {
                    closeDrawer()
                    navigate('/checkout')
                  }}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-medium transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1.5"
                >
                  Checkout
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
