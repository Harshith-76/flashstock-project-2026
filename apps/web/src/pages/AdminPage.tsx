import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import { AnalyticsOverview, InventoryRecord, Order, Product, User } from '../types'
import { useAuth } from '../context/AuthContext'

type Section = 'overview' | 'products' | 'inventory' | 'orders' | 'customers' | 'sales' | 'analytics' | 'settings'
const sections: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'products', label: 'Products' }, { id: 'inventory', label: 'Inventory' },
  { id: 'orders', label: 'Orders' }, { id: 'customers', label: 'Customers' }, { id: 'sales', label: 'Flash sales' },
  { id: 'analytics', label: 'Analytics' }, { id: 'settings', label: 'Settings' }
]
const money = (paise: number) => (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export const AdminPage: React.FC = () => {
  const [section, setSection] = useState<Section>('overview')
  const [products, setProducts] = useState<Product[]>([])
  const [inventory, setInventory] = useState<InventoryRecord[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<User[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const { logout } = useAuth()

  const reload = useCallback(async () => {
    setLoading(true); setError('')
    const [p, i, o, c, s, a] = await Promise.allSettled([
      api.getProducts({ includeArchived: true }), api.getInventory(), api.getOrders({ all: true }),
      api.getCustomers(), api.getAllFlashSales(), api.getAnalyticsOverview()
    ])
    const failed = [p, i, o, c, s, a].find(r => r.status === 'rejected')
    if (p.status === 'fulfilled') setProducts(p.value.products || [])
    if (i.status === 'fulfilled') setInventory(i.value.inventory || [])
    if (o.status === 'fulfilled') setOrders(o.value.orders || [])
    if (c.status === 'fulfilled') setCustomers(c.value.customers || [])
    if (s.status === 'fulfilled') setSales(s.value.flashSales || [])
    if (a.status === 'fulfilled') setAnalytics(a.value.analytics || null)
    if (failed?.status === 'rejected') setError(failed.reason instanceof Error ? failed.reason.message : 'Some admin data could not be loaded')
    setLoading(false)
  }, [])
  useEffect(() => { void reload() }, [reload])

  const act = async (fn: () => Promise<any>, message: string) => {
    setSaving(true); setError(''); setNotice('')
    try { await fn(); setNotice(message); await reload() }
    catch (e) { setError(e instanceof Error ? e.message : 'Action failed') }
    finally { setSaving(false) }
  }

  const createProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    await act(() => api.createProduct({ name: data.get('name'), sku: data.get('sku'), price: Number(data.get('price')) * 100, category: data.get('category'), description: data.get('description'), imageUrl: data.get('imageUrl') || undefined, initialStock: Number(data.get('stock')) }), 'Product created')
    event.currentTarget.reset()
  }
  const createSale = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    await act(() => api.createFlashSale({ productId: data.get('productId'), discountPrice: Number(data.get('price')) * 100, saleStockLimit: Number(data.get('limit')), startTime: new Date(String(data.get('start'))).toISOString(), endTime: new Date(String(data.get('end'))).toISOString(), status: 'active' }), 'Flash sale created')
    event.currentTarget.reset()
  }
  const updateProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingProduct) return
    const form = event.currentTarget
    const data = new FormData(form)
    await act(() => api.updateProduct(editingProduct.id, {
      name: data.get('name'), sku: data.get('sku'), price: Number(data.get('price')) * 100,
      category: data.get('category') || null, description: data.get('description') || null,
      imageUrl: data.get('imageUrl') || null
    }), 'Product updated')
    setEditingProduct(null)
  }

  const card = (label: string, value: React.ReactNode) => <div className="rounded-2xl border border-dark-800 bg-dark-900 p-5"><p className="text-xs uppercase tracking-wider text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div>
  const tableWrap = (children: React.ReactNode) => <div className="overflow-x-auto rounded-2xl border border-dark-800 bg-dark-900"><table className="w-full min-w-[680px] text-left text-sm"><tbody>{children}</tbody></table></div>

  return <div className="min-h-screen bg-dark-950 text-white">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-dark-800 px-5 py-4 sm:px-8"><div><p className="text-xs uppercase tracking-[.2em] text-amber-400">FlashStock</p><h1 className="text-xl font-bold">Admin workspace</h1></div><div className="flex gap-2"><a href="/" className="rounded-lg border border-dark-700 px-3 py-2 text-sm text-gray-300 hover:text-white">View storefront</a><button onClick={() => void logout()} className="rounded-lg border border-dark-700 px-3 py-2 text-sm text-gray-300 hover:text-white">Sign out</button></div></header>
    <div className="mx-auto grid max-w-[1500px] gap-6 p-4 sm:p-8 lg:grid-cols-[220px_1fr]">
      <nav className="flex gap-2 overflow-x-auto lg:flex-col">{sections.map(item => <button key={item.id} onClick={() => setSection(item.id)} className={`shrink-0 rounded-xl px-4 py-3 text-left text-sm ${section === item.id ? 'bg-amber-500 font-semibold text-dark-950' : 'bg-dark-900 text-gray-300 hover:bg-dark-800'}`}>{item.label}</button>)}</nav>
      <main className="min-w-0">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold">{sections.find(x => x.id === section)?.label}</h2><button onClick={() => void reload()} className="rounded-lg border border-dark-700 px-3 py-2 text-xs text-gray-300">Refresh</button></div>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}{notice && <p role="status" className="mb-4 rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-200">{notice}</p>}
        {loading ? <p className="py-10 text-gray-400">Loading database records…</p> : <>
          {section === 'overview' && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{card('Revenue', money(analytics?.revenue.totalPaise || 0))}{card('Orders', analytics?.orders.total ?? 0)}{card('Products', analytics?.inventory.totalProducts ?? 0)}{card('Customers', analytics?.customers.total ?? 0)}</div><h3 className="mb-3 mt-8 text-lg font-semibold">Low stock</h3>{tableWrap(<>{inventory.filter(x => x.available < 5).map(x => <tr key={x.productId} className="border-b border-dark-800"><td className="p-4">{x.name}</td><td className="p-4 text-amber-300">{x.available} available</td></tr>)}{inventory.every(x => x.available >= 5) && <tr><td className="p-4 text-gray-400">No low-stock products.</td></tr>}</>)}</>}
          {section === 'products' && <><form onSubmit={createProduct} className="mb-6 grid gap-3 rounded-2xl border border-dark-800 bg-dark-900 p-4 sm:grid-cols-2 xl:grid-cols-4"><input name="name" required placeholder="Product name" className="admin-input"/><input name="sku" required placeholder="SKU" className="admin-input"/><input name="price" required type="number" min="0" step="0.01" placeholder="Price (₹)" className="admin-input"/><input name="category" placeholder="Category" className="admin-input"/><input name="stock" required type="number" min="0" placeholder="Initial stock" className="admin-input"/><input name="imageUrl" type="url" placeholder="Image URL" className="admin-input"/><input name="description" placeholder="Description" className="admin-input sm:col-span-2"/><button disabled={saving} className="rounded-xl bg-amber-500 px-4 py-2 font-semibold text-dark-950 disabled:opacity-50">Create product</button></form>{tableWrap(<>{products.map(p => <tr key={p.id} className="border-b border-dark-800"><td className="p-4"><strong>{p.name}</strong><span className="block text-xs text-gray-500">{p.sku}</span></td><td className="p-4">{money(p.price)}</td><td className="p-4">{p.category || '—'}</td><td className="p-4 capitalize">{p.status}</td><td className="flex gap-3 p-4">{p.status === 'active' && <button onClick={() => setEditingProduct(p)} className="text-amber-300 hover:underline">Edit</button>}{p.status === 'active' && <button disabled={saving} onClick={() => void act(() => api.archiveProduct(p.id), 'Product archived')} className="text-rose-300 hover:underline">Archive</button>}</td></tr>)}</>)}</>}{editingProduct && <form onSubmit={updateProduct} className="mt-5 grid gap-3 rounded-2xl border border-amber-700/60 bg-dark-900 p-4 sm:grid-cols-2 xl:grid-cols-3"><h3 className="sm:col-span-2 xl:col-span-3">Edit {editingProduct.name}</h3><input name="name" required defaultValue={editingProduct.name} className="admin-input"/><input name="sku" required defaultValue={editingProduct.sku} className="admin-input"/><input name="price" required type="number" min="0" step="0.01" defaultValue={editingProduct.price / 100} className="admin-input"/><input name="category" defaultValue={editingProduct.category || ''} className="admin-input"/><input name="imageUrl" type="url" defaultValue={editingProduct.imageUrl || ''} className="admin-input"/><input name="description" defaultValue={editingProduct.description || ''} className="admin-input"/><button disabled={saving} className="rounded-xl bg-amber-500 px-4 py-2 font-semibold text-dark-950">Save changes</button><button type="button" onClick={() => setEditingProduct(null)} className="rounded-xl border border-dark-700 px-4 py-2">Cancel</button></form>}
          {section === 'inventory' && tableWrap(<>{inventory.map(item => <tr key={item.productId} className="border-b border-dark-800"><td className="p-4"><strong>{item.name}</strong><span className="block text-xs text-gray-500">{item.sku}</span></td><td className="p-4">On hand {item.onHand}</td><td className="p-4">Reserved {item.reserved}</td><td className="p-4 text-amber-300">Available {item.available}</td><td className="p-4"><form onSubmit={e => { e.preventDefault(); const value = Number(new FormData(e.currentTarget).get('onHand')); void act(() => api.adjustInventory(item.productId, value, 'Admin stock adjustment'), 'Inventory updated') }} className="flex gap-2"><input aria-label={`New on hand for ${item.name}`} name="onHand" type="number" min={item.reserved} defaultValue={item.onHand} className="admin-input w-24"/><button disabled={saving} className="text-xs text-amber-300">Save</button></form></td></tr>)}</>)}
          {section === 'orders' && tableWrap(<>{orders.map(o => <tr key={o.id} className="border-b border-dark-800"><td className="p-4"><strong>{o.orderNumber}</strong><span className="block text-xs text-gray-500">{o.customerName || o.userId}</span><a className="mt-1 inline-block text-xs text-amber-300 hover:underline" href={`/account/orders/${o.id}`}>Order details</a></td><td className="p-4">{money(o.totalAmount)}</td><td className="p-4 capitalize">{o.status.replace('_', ' ')}</td><td className="p-4 text-xs">Pay: {o.paymentStatus || 'pending'}<span className="block text-gray-500">Hold: {o.reservationStatus || '—'}</span></td><td className="p-4"><select aria-label={`Set status for ${o.orderNumber}`} value={o.status} onChange={e => void act(() => api.updateOrderStatus(o.id, e.target.value), 'Order status updated')} className="admin-input">{['pending','confirmed','processing','shipped','delivered','cancelled','payment_failed'].map(s => <option key={s}>{s}</option>)}</select></td></tr>)}</>)}
          {section === 'customers' && tableWrap(<>{customers.map(u => <tr key={u.id} className="border-b border-dark-800"><td className="p-4">{u.name}</td><td className="p-4">{u.email}</td><td className="p-4">{u.role}</td><td className="p-4">{(u as any).orderCount ?? 0} orders</td><td className="p-4">{money((u as any).totalSpent ?? 0)}</td></tr>)}</>)}
          {section === 'sales' && <><form onSubmit={createSale} className="mb-6 grid gap-3 rounded-2xl border border-dark-800 bg-dark-900 p-4 sm:grid-cols-2 xl:grid-cols-3"><select name="productId" required className="admin-input"><option value="">Choose product</option>{products.filter(p => p.status === 'active').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input name="price" required type="number" min="0" step="0.01" placeholder="Sale price (₹)" className="admin-input"/><input name="limit" required type="number" min="1" placeholder="Sale stock limit" className="admin-input"/><label className="text-xs text-gray-400">Starts<input name="start" required type="datetime-local" className="admin-input mt-1"/></label><label className="text-xs text-gray-400">Ends<input name="end" required type="datetime-local" className="admin-input mt-1"/></label><button disabled={saving} className="rounded-xl bg-amber-500 px-4 py-2 font-semibold text-dark-950">Create flash sale</button></form>{tableWrap(<>{sales.map(s => <tr key={s.id} className="border-b border-dark-800"><td className="p-4">{s.productName}</td><td className="p-4">{money(s.discountPrice)}</td><td className="p-4">{s.allocatedStock}/{s.saleStockLimit}</td><td className="p-4 capitalize">{s.status}</td><td className="p-4"><select value={s.status} aria-label={`Status for ${s.productName}`} className="admin-input" onChange={e => void act(() => api.updateFlashSale(s.id, { status: e.target.value }), 'Flash sale updated')}>{['draft','active','ended','cancelled'].map(status => <option key={status}>{status}</option>)}</select></td></tr>)}</>)}</>}
          {section === 'analytics' && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{card('Total revenue', money(analytics?.revenue.totalPaise || 0))}{card('Orders', analytics?.orders.total ?? 0)}{card('Available units', analytics?.inventory.totalAvailable ?? 0)}</div><h3 className="mb-3 mt-8 text-lg font-semibold">Best sellers</h3>{tableWrap(<>{(analytics?.bestSellers || []).map(item => <tr key={item.productId || item.productName} className="border-b border-dark-800"><td className="p-4">{item.productName}</td><td className="p-4">{item.unitsSold} sold</td><td className="p-4">{money(item.totalSales)}</td></tr>)}</>)}<h3 className="mb-3 mt-8 text-lg font-semibold">Revenue and orders by day</h3>{tableWrap(<>{(analytics?.revenueTrends || []).map(row => <tr key={row.date} className="border-b border-dark-800"><td className="p-4">{row.date}</td><td className="p-4">{money(row.revenue)}</td><td className="p-4">{row.orderCount} orders</td></tr>)}</>)}</>}
          {section === 'settings' && <div className="rounded-2xl border border-dark-800 bg-dark-900 p-6"><h3 className="font-semibold">Account and deployment</h3><p className="mt-2 text-sm text-gray-400">Administrator access is managed by the server session. Deployment and Cloudflare database settings remain in the project configuration.</p></div>}
        </>}
      </main>
    </div>
    <style>{`.admin-input{min-width:0;border:1px solid #2e3a52;border-radius:.75rem;background:#070a11;padding:.6rem .75rem;color:#f3f4f6;font-size:.8rem;outline:none}.admin-input:focus{border-color:#f59e0b}`}</style>
  </div>
}
