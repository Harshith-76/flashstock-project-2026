import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import { Order } from '../../types'
import { useAuth } from '../../context/AuthContext'

const money = (paise: number) => (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export const AccountPage: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.getOrders().then(r => setOrders(r.orders || [])).catch(e => setError(e.message || 'Unable to load orders')).finally(() => setLoading(false)) }, [])
  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <div className="mb-8 rounded-3xl border border-dark-800 bg-dark-900 p-6"><p className="text-xs font-bold uppercase tracking-widest text-amber-400">Your account</p><h1 className="mt-2 text-3xl font-bold text-white">Hello, {user?.name}</h1><p className="mt-1 text-sm text-gray-400">{user?.email}</p></div>
    <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white">Recent orders</h2><Link to="/account/orders" className="text-sm text-amber-400 hover:underline">View all</Link></div>
    {loading ? <p className="py-8 text-gray-400">Loading your orders…</p> : error ? <p role="alert" className="py-8 text-red-300">{error}</p> : orders.length === 0 ? <div className="mt-4 rounded-2xl border border-dark-800 bg-dark-900 p-8 text-center text-gray-400">No orders yet. <Link to="/products" className="text-amber-400">Browse products</Link></div> : <div className="mt-4 divide-y divide-dark-800 rounded-2xl border border-dark-800 bg-dark-900">{orders.slice(0, 5).map(order => <Link key={order.id} to={`/account/orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-dark-850"><span><strong className="block text-white">{order.orderNumber}</strong><span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</span></span><span className="text-right"><strong className="block text-amber-400">{money(order.totalAmount)}</strong><span className="text-xs capitalize text-gray-400">{order.status.replace('_', ' ')}</span></span></Link>)}</div>}
  </main>
}

export const OrderHistoryPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.getOrders().then(r => setOrders(r.orders || [])).catch(e => setError(e.message || 'Unable to load orders')).finally(() => setLoading(false)) }, [])
  return <main className="mx-auto max-w-5xl px-4 py-10"><h1 className="text-3xl font-bold text-white">Order history</h1>{loading ? <p className="py-8 text-gray-400">Loading…</p> : error ? <p role="alert" className="py-8 text-red-300">{error}</p> : orders.length === 0 ? <p className="py-8 text-gray-400">You have not placed an order yet.</p> : <div className="mt-6 divide-y divide-dark-800 rounded-2xl border border-dark-800 bg-dark-900">{orders.map(order => <Link key={order.id} to={`/account/orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-dark-850"><span><strong className="block text-white">{order.orderNumber}</strong><span className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</span></span><span className="text-right"><strong className="block text-amber-400">{money(order.totalAmount)}</strong><span className="text-xs capitalize text-gray-400">{order.status.replace('_', ' ')}</span></span></Link>)}</div>}</main>
}
