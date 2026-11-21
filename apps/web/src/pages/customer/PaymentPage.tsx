import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clock3, CreditCard, LoaderCircle, LockKeyhole, ShieldCheck, XCircle } from 'lucide-react'
import { api } from '../../services/api'
import { useCart } from '../../context/CartContext'
import { Order, Payment, Reservation } from '../../types'

type Outcome = 'success' | 'failure' | 'timeout' | 'expired' | 'processing'
const money = (paise: number) => (paise / 100).toLocaleString('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2
})

export const PaymentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { refreshCart } = useCart()
  const [order, setOrder] = useState<Order | null>(null)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>('success')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState(0)

  const loadOrder = useCallback(async () => {
    if (!id) return
    const response = await api.getOrderById(id)
    if (!response?.success || !response.order) throw new Error(response?.message || 'Unable to load this order.')
    const loadedOrder = response.order as Order
    setOrder(loadedOrder)
    setReservation(loadedOrder.reservation || null)
    setPayment(loadedOrder.payment || null)
    if (loadedOrder.reservation?.expiresAt) {
      setRemaining(Math.max(0, Math.floor((new Date(loadedOrder.reservation.expiresAt).getTime() - Date.now()) / 1000)))
    }
  }, [id])

  useEffect(() => {
    let active = true
    setLoading(true)
    loadOrder().catch(loadError => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load this order.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadOrder])

  useEffect(() => {
    if (!reservation?.expiresAt || reservation.status !== 'active') return
    const update = () => setRemaining(Math.max(0, Math.floor((new Date(reservation.expiresAt).getTime() - Date.now()) / 1000)))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [reservation])

  const submitPayment = async (requestedOutcome: Outcome) => {
    if (!id || !order || processing) return
    setProcessing(true)
    setError('')
    setNotice('')
    try {
      const response = await api.simulatePayment({
        orderId: id,
        outcome: requestedOutcome,
        providerReference: `SIM-${crypto.randomUUID()}`
      })
      setPayment(response.payment || null)
      if (response.success && response.payment?.status === 'succeeded') {
        await refreshCart()
        navigate(`/order-confirmation/${id}`, { replace: true })
        return
      }
      if (response.payment?.status === 'pending') setNotice(response.message || 'Payment is still processing.')
      await loadOrder()
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Payment could not be confirmed. Check your order status before retrying.')
      try { await loadOrder() } catch { /* Keep the payment error visible if refresh also fails. */ }
    } finally {
      setProcessing(false)
    }
  }

  const formatTimer = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const isPaid = payment?.status === 'succeeded' || order?.status === 'confirmed' || ['processing', 'shipped', 'delivered'].includes(order?.status || '')
  const isTerminal = !!payment && payment.status !== 'pending' || !!reservation && reservation.status !== 'active'

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-20 text-center text-gray-300" role="status"><LoaderCircle className="mx-auto h-7 w-7 animate-spin text-amber-400" /><p className="mt-4">Loading secure payment details…</p></main>
  if (!order) return <main className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="text-2xl font-bold text-white">Payment details unavailable</h1><p role="alert" className="mt-3 text-sm text-red-300">{error || 'We could not find this order.'}</p><Link to="/account/orders" className="mt-6 inline-block text-amber-400 hover:underline">View your orders</Link></main>

  let shippingAddress: Record<string, string> = {}
  try { shippingAddress = order.shippingAddress ? JSON.parse(order.shippingAddress) : {} } catch { shippingAddress = {} }
  const addressText = Object.values(shippingAddress).filter(Boolean).join(', ')

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="border-b border-dark-800 pb-6"><p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-400">Order {order.orderNumber}</p><h1 className="mt-2 text-3xl font-extrabold text-white">Payment</h1><p className="mt-2 text-sm text-gray-400">Choose a simulated result to complete this checkout. FlashStock does not collect card details or charge real money.</p></div>

    {error && <div role="alert" className="mt-6 flex gap-3 rounded-2xl border border-red-800 bg-red-950/50 p-4 text-sm text-red-200"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}

    {processing && <div role="status" aria-live="polite" className="mt-6 flex items-center gap-3 rounded-2xl border border-sky-700 bg-sky-950/40 p-4 text-sm text-sky-100"><LoaderCircle className="h-5 w-5 animate-spin" />Payment is processing. Please keep this page open while we confirm the reservation and payment result.</div>}

    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
      <section className="space-y-6">
        <div className="rounded-3xl border border-dark-800 bg-dark-900 p-5 sm:p-7">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-amber-500/10 p-2 text-amber-400"><CreditCard className="h-5 w-5" /></div><div><h2 className="font-bold text-white">Simulated payment</h2><p className="text-xs text-gray-400">No real payment provider is connected.</p></div></div>
          {isPaid ? <div className="mt-6 rounded-2xl border border-emerald-700 bg-emerald-950/40 p-5"><CheckCircle2 className="h-6 w-6 text-emerald-400" /><h3 className="mt-3 font-bold text-emerald-200">Payment completed</h3><p className="mt-1 text-sm text-gray-300">The reservation was confirmed and inventory was committed.</p><Link to={`/order-confirmation/${order.id}`} className="mt-4 inline-block rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-dark-950">View order confirmation</Link></div>
          : isTerminal ? <div className="mt-6 rounded-2xl border border-rose-800 bg-rose-950/30 p-5"><XCircle className="h-6 w-6 text-rose-400" /><h3 className="mt-3 font-bold text-rose-200">Payment {payment?.status === 'failed' || order.status === 'payment_failed' ? 'failed' : 'checkout expired'}</h3><p className="mt-1 text-sm text-gray-300">This checkout is complete. Its reserved inventory has been released, so it cannot be charged again.</p><div className="mt-4 flex flex-wrap gap-3"><Link to={`/account/orders/${order.id}`} className="rounded-xl border border-dark-700 px-4 py-2.5 text-sm text-white hover:border-amber-500">View order details</Link><Link to="/products" className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-dark-950">Shop again</Link></div></div>
          : <>
            {payment?.status === 'pending' && <div role="status" className="mt-6 rounded-2xl border border-sky-700 bg-sky-950/40 p-4"><p className="font-semibold text-sky-200">Payment is processing</p><p className="mt-1 text-sm text-gray-300">Your stock remains reserved. Simulate a success or failure result below to finish this test payment.</p></div>}
            {notice && <p role="status" className="mt-4 text-sm text-sky-200">{notice}</p>}
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"><div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-amber-400" /><div><p className="text-sm font-semibold text-white">Inventory held for this order</p><p className="text-xs text-gray-400">Complete payment before the reservation expires.</p></div></div><span className="font-mono text-xl font-bold text-amber-300">{formatTimer(remaining)}</span></div>
            <fieldset disabled={processing || remaining <= 0} className="mt-6 disabled:opacity-60"><legend className="text-sm font-semibold text-white">Select a test outcome</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">
              {([
                ['success', 'Successful payment', 'Confirms the order and deducts inventory.', 'emerald'],
                ['processing', 'Keep payment processing', 'Leave the payment pending while stock stays reserved.', 'sky'],
                ['failure', 'Payment failure', 'Fails the payment and releases the stock hold.', 'rose'],
                ['timeout', 'Payment timeout', 'Cancels this checkout and releases the hold.', 'amber'],
                ['expired', 'Expired reservation', 'Exercises the late-payment expiration path.', 'purple']
              ] as const).map(([value, label, description, tone]) => {
                const outcomeColor = { emerald: 'text-emerald-300', sky: 'text-sky-300', rose: 'text-rose-300', amber: 'text-amber-300', purple: 'text-purple-300' }[tone]
                return <label key={value} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-dark-700 bg-dark-950 p-4 hover:border-amber-500/60"><input type="radio" name="payment-outcome" value={value} checked={outcome === value} onChange={() => setOutcome(value)} className="mt-1 accent-amber-500" /><span><span className={`block text-sm font-semibold ${outcomeColor}`}>{label}</span><span className="mt-1 block text-xs leading-relaxed text-gray-400">{description}</span></span></label>
              })}
            </div></fieldset>
            {remaining <= 0 && <div className="mt-4 rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-200">The reservation timer has ended. Finalize the expired attempt to release its stock hold.</div>}
            <button type="button" onClick={() => void submitPayment(remaining <= 0 ? 'expired' : outcome)} disabled={processing} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3.5 text-sm font-bold text-dark-950 disabled:cursor-wait disabled:opacity-60">{processing ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Processing payment…</> : <><LockKeyhole className="h-4 w-4" />{remaining <= 0 ? 'Release expired reservation' : `Run simulated ${outcome} payment`}</>}</button>
            <p className="mt-3 text-center text-[11px] text-gray-500">Each order can only reach one terminal payment result. Repeated callbacks do not deduct inventory twice.</p>
          </>}
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-dark-800 bg-dark-900 p-5 sm:p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold text-white">Order summary</h2><p className="mt-1 text-xs text-gray-400">{order.items?.length || 0} line items</p>
        <div className="mt-5 space-y-4">{order.items?.map(item => <div key={item.id} className="flex gap-3">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-14 w-14 rounded-xl border border-dark-700 object-cover" /> : <div className="h-14 w-14 rounded-xl border border-dark-700 bg-dark-950" />}<div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-medium text-white">{item.productName}</p><p className="mt-1 text-xs text-gray-400">Qty {item.quantity} · {money(item.unitPrice)} each</p></div><span className="whitespace-nowrap text-sm text-gray-200">{money(item.subtotal)}</span></div>)}</div>
        <div className="mt-5 space-y-3 border-t border-dark-800 pt-4 text-sm"><div className="flex justify-between text-gray-400"><span>Delivery</span><span className="text-emerald-400">Free</span></div><div className="flex justify-between border-t border-dark-800 pt-3 text-base font-bold text-white"><span>Total due</span><span className="text-amber-400">{money(order.totalAmount)}</span></div></div>
        {addressText && <div className="mt-5 rounded-2xl bg-dark-950 p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400"><ShieldCheck className="h-4 w-4 text-emerald-400" />Delivering to</p><p className="mt-2 text-sm text-gray-200">{addressText}</p></div>}
        <Link to="/account/orders" className="mt-5 inline-block text-sm text-amber-400 hover:underline">View order history</Link>
      </aside>
    </div>
  </main>
}
