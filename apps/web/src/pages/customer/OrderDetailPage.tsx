import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { Order } from '../../types'

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { if (id) api.getOrderById(id).then(r => setOrder(r.order)).catch(e => setError(e.message || 'Unable to load this order')) }, [id])
  const money = (paise: number) => (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
  return <main className="mx-auto max-w-4xl px-4 py-10">
    <Link to="/account/orders" className="text-sm text-amber-400 hover:underline">← Order history</Link>
    {error ? <p role="alert" className="mt-6 text-red-300">{error}</p> : !order ? <p className="mt-6 text-gray-400">Loading order…</p> : <>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-gray-500">Order details</p><h1 className="mt-1 text-3xl font-bold text-white">{order.orderNumber}</h1></div><span className="rounded-full border border-dark-700 bg-dark-900 px-3 py-1 text-sm capitalize text-amber-300">{order.status.replace('_', ' ')}</span></div>
      <div className="mt-6 divide-y divide-dark-800 rounded-2xl border border-dark-800 bg-dark-900">{order.items?.map(item => <div key={item.id} className="flex justify-between gap-4 p-4"><span className="text-white">{item.productName}<span className="ml-2 text-sm text-gray-500">× {item.quantity}</span></span><span className="text-gray-200">{money(item.subtotal)}</span></div>)}<div className="flex justify-between p-4 font-bold text-white"><span>Total</span><span className="text-amber-400">{money(order.totalAmount)}</span></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-dark-800 bg-dark-900 p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Payment</p><p className="mt-2 capitalize text-white">{order.payment?.status || 'No payment record'}</p></div><div className="rounded-2xl border border-dark-800 bg-dark-900 p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Inventory reservation</p><p className="mt-2 capitalize text-white">{order.reservation?.status || 'No reservation'}</p></div></div>
      {order.shippingAddress && <div className="mt-3 rounded-2xl border border-dark-800 bg-dark-900 p-4"><p className="text-xs uppercase tracking-wider text-gray-500">Shipping address</p><p className="mt-2 whitespace-pre-line text-sm text-gray-200">{Object.values(JSON.parse(order.shippingAddress)).join(', ')}</p></div>}
    </>}
  </main>
}
