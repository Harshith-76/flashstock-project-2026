import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, ShieldCheck } from 'lucide-react'
import { useCart } from '../../context/CartContext'

export const CartPage: React.FC = () => {
  const { cart, updateQuantity, removeFromCart, clearCart, totalAmount, itemCount } = useCart()
  const navigate = useNavigate()
  const [mutationError, setMutationError] = useState('')
  const runCartAction = async (action: () => Promise<void>) => {
    setMutationError('')
    try { await action() }
    catch (error) { setMutationError(error instanceof Error ? error.message : 'Cart update failed') }
  }

  const totalFormatted = (totalAmount / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  })

  if (!cart?.items || cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-dark-900 border border-dark-800 flex items-center justify-center mx-auto text-gray-500">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white">Your Cart is Empty</h2>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          Explore our collection of high-concurrency hardware protected by Cloudflare D1.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold bg-amber-500 text-dark-950 hover:bg-amber-400 transition-colors"
        >
          Browse Catalog
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between border-b border-[#141C30] pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Shopping Cart</h1>
          <p className="text-xs text-gray-400 mt-1">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>
        <button
          onClick={() => void runCartAction(clearCart)}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Cart
        </button>
      </div>

      {mutationError && <p role="alert" className="mb-5 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">{mutationError}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => {
            const itemPrice = ((item.price ?? 0) / 100).toLocaleString('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0
            })
            const itemSubtotal = (((item.price ?? 0) * item.quantity) / 100).toLocaleString('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0
            })

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-[#0D1322] border border-[#1A253D] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-20 h-20 rounded-xl object-cover bg-dark-950 border border-dark-800 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-dark-950 border border-dark-800 flex items-center justify-center text-gray-600 flex-shrink-0">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500/80">{item.sku}</span>
                    <h3 className="font-semibold text-white text-base mb-1">{item.name}</h3>
                    <div className="text-xs font-mono text-gray-400">
                      Unit: {itemPrice}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-dark-800">
                  {/* Quantity */}
                  <div className="flex items-center border border-dark-700 rounded-xl bg-dark-900 p-1">
                    <button
                      onClick={() => void runCartAction(() => updateQuantity(item.id, item.quantity - 1))}
                      className="p-1 hover:text-amber-400 text-gray-400 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-mono font-medium text-white">{item.quantity}</span>
                    <button
                      onClick={() => void runCartAction(() => updateQuantity(item.id, item.quantity + 1))}
                      disabled={item.available !== undefined && item.quantity >= item.available}
                      className="p-1 hover:text-amber-400 text-gray-400 disabled:opacity-30 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold font-mono text-white block">{itemSubtotal}</span>
                    <button
                      onClick={() => void runCartAction(() => removeFromCart(item.id))}
                      className="text-[11px] text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="p-6 rounded-2xl bg-[#0D1322] border border-[#1A253D] space-y-6 sticky top-24">
            <h2 className="text-lg font-bold text-white">Order Summary</h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Items Subtotal</span>
                <span className="font-mono text-white font-medium">{totalFormatted}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Estimated Shipping</span>
                <span className="text-emerald-400 font-medium">Free</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Concurrency Protection</span>
                <span className="text-amber-400 font-medium">Active (D1 Batch)</span>
              </div>
              <div className="pt-3 border-t border-dark-800 flex justify-between text-base font-bold text-white">
                <span>Total Amount</span>
                <span className="font-mono text-amber-400">{totalFormatted}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 text-[11px] text-gray-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                Inventory is mathematically reserved for 10 minutes upon proceeding to checkout.
              </span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-3.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-medium transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
