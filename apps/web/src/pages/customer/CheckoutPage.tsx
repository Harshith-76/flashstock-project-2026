import React, { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building, CheckCircle2, Lock, MapPin, PackageCheck, ShieldCheck } from 'lucide-react'
import { api } from '../../services/api'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { CartItem, Product } from '../../types'

type DirectItem = { productId: string; quantity: number; product: Product }

const money = (paise: number) => (paise / 100).toLocaleString('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2
})

export const CheckoutPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { cart, isLoading: cartLoading } = useCart()
  const { user } = useAuth()
  const directItem = (location.state as { directItem?: DirectItem } | null)?.directItem
  const [idempotencyKey] = useState(() => `IDEMP-${crypto.randomUUID()}`)
  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.name || '', addressLine1: '', city: '', state: '', postalCode: '', country: 'India'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const items = useMemo(() => {
    if (directItem?.product) {
      const price = directItem.product.flashSale?.status === 'active'
        ? directItem.product.flashSale.discountPrice : directItem.product.price
      return [{ id: directItem.product.id, name: directItem.product.name, sku: directItem.product.sku,
        imageUrl: directItem.product.imageUrl, price, quantity: directItem.quantity }]
    }
    return (cart?.items || []).map((item: CartItem) => ({
      id: item.productId, name: item.name || 'Product', sku: item.sku || '', imageUrl: item.imageUrl,
      price: item.price || 0, quantity: item.quantity
    }))
  }, [directItem, cart?.items])
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const result = await api.checkout({
        idempotencyKey,
        cartId: directItem ? undefined : cart?.id,
        items: items.map(item => ({ productId: item.id, quantity: item.quantity })),
        shippingAddress
      })
      if (!result?.success || !result.order?.id) throw new Error(result?.message || 'Checkout could not be created.')
      navigate(`/payment/${result.order.id}`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Checkout could not be completed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!directItem && cartLoading) {
    return <main className="mx-auto max-w-5xl px-4 py-20 text-center text-gray-300" role="status">Loading your cart…</main>
  }

  if (items.length === 0) {
    return <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold text-white">Your cart is empty</h1>
      <p className="mt-2 text-sm text-gray-400">Add a product before starting checkout.</p>
      <Link to="/products" className="mt-6 inline-flex rounded-xl bg-amber-500 px-5 py-3 font-semibold text-dark-950">Browse products</Link>
    </main>
  }

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <Link to={directItem ? `/products/${directItem.productId}` : '/cart'} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
      <ArrowLeft className="h-4 w-4" /> Back {directItem ? 'to product' : 'to cart'}
    </Link>
    <div className="mt-5 border-b border-dark-800 pb-6">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-400">Secure checkout</p>
      <h1 className="mt-2 text-3xl font-extrabold text-white">Delivery and order review</h1>
      <p className="mt-2 max-w-2xl text-sm text-gray-400">Confirm where to send your order, review each item and total, then continue to the simulated payment screen.</p>
    </div>

    {error && <div role="alert" className="mt-6 rounded-2xl border border-red-800 bg-red-950/50 p-4 text-sm text-red-200">{error}</div>}

    <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-dark-800 bg-dark-900 p-5 sm:p-7">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-amber-500/10 p-2 text-amber-400"><MapPin className="h-5 w-5" /></div><div><h2 className="font-bold text-white">Delivery address</h2><p className="text-xs text-gray-400">Where should we deliver your order?</p></div></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-gray-300">Full name<input required maxLength={120} autoComplete="name" value={shippingAddress.fullName} onChange={e => setShippingAddress({ ...shippingAddress, fullName: e.target.value })} className="mt-1.5 w-full rounded-xl border border-dark-700 bg-dark-950 px-3 py-3 text-white outline-none focus:border-amber-500" /></label>
            <label className="text-sm text-gray-300">Country<input required readOnly value={shippingAddress.country} className="mt-1.5 w-full rounded-xl border border-dark-700 bg-dark-950 px-3 py-3 text-gray-300" /></label>
            <label className="text-sm text-gray-300 sm:col-span-2">Street address<input required maxLength={240} autoComplete="street-address" value={shippingAddress.addressLine1} onChange={e => setShippingAddress({ ...shippingAddress, addressLine1: e.target.value })} className="mt-1.5 w-full rounded-xl border border-dark-700 bg-dark-950 px-3 py-3 text-white outline-none focus:border-amber-500" /></label>
            <label className="text-sm text-gray-300">City<input required maxLength={100} autoComplete="address-level2" value={shippingAddress.city} onChange={e => setShippingAddress({ ...shippingAddress, city: e.target.value })} className="mt-1.5 w-full rounded-xl border border-dark-700 bg-dark-950 px-3 py-3 text-white outline-none focus:border-amber-500" /></label>
            <label className="text-sm text-gray-300">State<input required maxLength={100} autoComplete="address-level1" value={shippingAddress.state} onChange={e => setShippingAddress({ ...shippingAddress, state: e.target.value })} className="mt-1.5 w-full rounded-xl border border-dark-700 bg-dark-950 px-3 py-3 text-white outline-none focus:border-amber-500" /></label>
            <label className="text-sm text-gray-300">Postal code<input required maxLength={12} autoComplete="postal-code" pattern="[A-Za-z0-9 -]{3,12}" value={shippingAddress.postalCode} onChange={e => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })} className="mt-1.5 w-full rounded-xl border border-dark-700 bg-dark-950 px-3 py-3 text-white outline-none focus:border-amber-500" /></label>
          </div>
        </section>

        <section className="rounded-3xl border border-dark-800 bg-dark-900 p-5 sm:p-7">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-sky-500/10 p-2 text-sky-300"><Building className="h-5 w-5" /></div><div><h2 className="font-bold text-white">Delivery method</h2><p className="text-xs text-gray-400">Available delivery for this order</p></div></div>
          <div className="mt-5 flex items-start justify-between gap-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4"><div className="flex gap-3"><PackageCheck className="mt-0.5 h-5 w-5 text-amber-400" /><div><p className="font-semibold text-white">Standard delivery</p><p className="mt-1 text-xs text-gray-400">Delivery details will be available with your order.</p></div></div><span className="text-sm font-semibold text-emerald-400">Free</span></div>
        </section>
      </div>

      <aside className="h-fit rounded-3xl border border-dark-800 bg-dark-900 p-5 sm:p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold text-white">Review your order</h2>
        <div className="mt-5 max-h-72 space-y-4 overflow-y-auto">
          {items.map(item => <div key={item.id} className="flex gap-3">
            {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-14 w-14 rounded-xl border border-dark-700 object-cover" /> : <div className="h-14 w-14 rounded-xl border border-dark-700 bg-dark-950" />}
            <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-medium text-white">{item.name}</p><p className="mt-1 text-xs text-gray-400">Qty {item.quantity} · {money(item.price)} each</p></div>
            <span className="whitespace-nowrap text-sm font-semibold text-gray-200">{money(item.price * item.quantity)}</span>
          </div>)}
        </div>
        <div className="mt-5 space-y-3 border-t border-dark-800 pt-4 text-sm">
          <div className="flex justify-between text-gray-400"><span>Items ({items.reduce((sum, item) => sum + item.quantity, 0)})</span><span>{money(total)}</span></div>
          <div className="flex justify-between text-gray-400"><span>Standard delivery</span><span className="text-emerald-400">Free</span></div>
          <div className="flex justify-between border-t border-dark-800 pt-3 text-base font-bold text-white"><span>Total</span><span className="text-amber-400">{money(total)}</span></div>
        </div>
        <div className="mt-5 rounded-2xl bg-dark-950 p-3 text-xs text-gray-400"><ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-400" />Inventory is reserved for 10 minutes when you continue. Payment here is simulated; no real payment method is charged.</div>
        <button type="submit" disabled={isSubmitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3.5 text-sm font-bold text-dark-950 shadow-lg shadow-amber-500/10 disabled:cursor-wait disabled:opacity-60">
          {isSubmitting ? 'Reserving your items…' : <>Reserve and continue to payment <ArrowRight className="h-4 w-4" /></>}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-500"><Lock className="h-3 w-3" />Duplicate checkout retries are protected.</p>
      </aside>
    </form>
  </main>
}
