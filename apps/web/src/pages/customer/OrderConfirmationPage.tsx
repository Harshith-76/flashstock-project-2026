import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, Package, ArrowRight, ShieldCheck, Clock, ExternalLink } from 'lucide-react'
import { api } from '../../services/api'
import { Order } from '../../types'

export const OrderConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return
      try {
        const res = await api.getOrderById(id)
        if (res?.success && res.order) {
          setOrder(res.order)
        }
      } catch (err) {
        console.error('Failed to load order:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [id])

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center animate-pulse space-y-4">
        <div className="w-16 h-16 rounded-full bg-dark-900 mx-auto" />
        <div className="h-6 bg-dark-900 rounded w-1/2 mx-auto" />
        <div className="h-4 bg-dark-900 rounded w-1/3 mx-auto" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Order Not Found</h2>
        <Link to="/" className="text-xs text-amber-400 hover:underline">
          Return Home
        </Link>
      </div>
    )
  }

  const totalFormatted = (order.totalAmount / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  })

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      {/* Success Hero */}
      <div className="text-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/10">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
          Stock Confirmed & Deducted
        </span>
        <h1 className="text-3xl font-extrabold text-white">Order Confirmed!</h1>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          Thank you for your purchase. Your stock reservation has been committed to Cloudflare D1.
        </p>
      </div>

      {/* Order Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0D1322] border border-[#1A253D] space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-dark-800 gap-2">
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Order Number</span>
            <span className="text-base font-bold font-mono text-white">{order.orderNumber}</span>
          </div>
          <div className="sm:text-right">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Status</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
              {order.status}
            </span>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Purchased Items</h3>
          {order.items?.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-dark-900/60 border border-dark-800 flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-semibold text-white">{item.productName}</p>
                <p className="text-gray-500 font-mono text-[11px]">
                  Qty: {item.quantity} × {((item.unitPrice) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
              <span className="font-mono font-bold text-white">
                {((item.subtotal) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>

        {/* Diagnostics Info */}
        <div className="p-4 rounded-xl bg-dark-950 border border-dark-800 space-y-2 text-xs font-mono text-gray-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Reservation State:
            </span>
            <span className="text-emerald-400 font-semibold">{order.reservation?.status || 'Confirmed'}</span>
          </div>
          {order.payment?.providerReference && (
            <div className="flex items-center justify-between">
              <span>Payment Ref:</span>
              <span className="text-gray-300">{order.payment.providerReference}</span>
            </div>
          )}
          <div className="pt-2 border-t border-dark-800 flex justify-between text-sm font-bold text-white">
            <span>Total Paid:</span>
            <span className="text-amber-400 font-mono">{totalFormatted}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            to="/account"
            className="w-full py-3 px-4 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Package className="w-4 h-4 text-amber-400" />
            View Order History
          </Link>
          <Link
            to="/products"
            className="w-full py-3 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-medium transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5"
          >
            Continue Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
