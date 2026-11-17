import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Zap,
  Clock,
  Lock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  CreditCard,
  Building
} from 'lucide-react'
import { api } from '../../services/api'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { Order, Reservation } from '../../types'

export const CheckoutPage: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { cart, refreshCart } = useCart()
  const { user } = useAuth()

  // Support direct buy now or full cart
  const directItem = (location.state as any)?.directItem

  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    () => `IDEMP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
  )

  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.name || 'Jane Doe',
    addressLine1: '42 High-Concurrency Tech Blvd',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India'
  })

  // Phase: 'form' | 'reserved' | 'paying'
  const [step, setStep] = useState<'form' | 'reserved' | 'processing'>('form')
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null)
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null)
  const [selectedOutcome, setSelectedOutcome] = useState<'success' | 'failure' | 'timeout' | 'expired'>('success')

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Countdown timer for active reservation (10 minutes)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600)

  useEffect(() => {
    if (step === 'reserved' && createdReservation) {
      const interval = setInterval(() => {
        const diff = new Date(createdReservation.expiresAt).getTime() - Date.now()
        if (diff <= 0) {
          setSecondsRemaining(0)
          clearInterval(interval)
        } else {
          setSecondsRemaining(Math.floor(diff / 1000))
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [step, createdReservation])

  const checkoutItems = directItem
    ? [{ productId: directItem.productId, quantity: directItem.quantity }]
    : cart?.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) || []

  const totalAmount = directItem
    ? (directItem.product.flashSale?.status === 'active'
        ? directItem.product.flashSale.discountPrice
        : directItem.product.price) * directItem.quantity
    : cart?.totalAmount || 0

  const totalFormatted = (totalAmount / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  })

  // STEP 1: RESERVE INVENTORY ATOMICALLY
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsLoading(true)

    try {
      const res = await api.checkout({
        idempotencyKey,
        cartId: directItem ? undefined : cart?.id,
        items: directItem ? checkoutItems : undefined,
        shippingAddress
      })

      if (res?.success) {
        setCreatedOrder(res.order)
        setCreatedReservation(res.reservation)
        setStep('reserved')
        await refreshCart()
      }
    } catch (err: any) {
      console.error('Reservation failed:', err)
      setErrorMsg(err.message || 'Checkout failed due to concurrent inventory contention.')
    } finally {
      setIsLoading(false)
    }
  }

  // STEP 2: SIMULATE PAYMENT
  const handleSimulatePayment = async () => {
    if (!createdOrder) return
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await api.simulatePayment({
        orderId: createdOrder.id,
        outcome: selectedOutcome,
        providerReference: `PAY-SIM-${Date.now().toString(36).toUpperCase()}`
      })

      if (res?.success) {
        navigate(`/order-confirmation/${createdOrder.id}`)
      } else {
        setErrorMsg(`Payment outcome: ${res?.message || 'Payment simulation failed'}`)
      }
    } catch (err: any) {
      console.error('Payment error:', err)
      setErrorMsg(err.message || 'Payment simulation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-[#141C30] pb-6">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Checkout</h1>
        <p className="text-xs text-gray-400 mt-1">
          Atomic 2-Phase Checkout: Conditional Inventory Hold followed by Payment Confirmation.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{errorMsg}</p>
            <p className="text-[11px] text-red-400/80">
              If inventory contention occurred, stock was safely preserved without negative overselling.
            </p>
          </div>
        </div>
      )}

      {step === 'form' ? (
        <form onSubmit={handleCreateReservation} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Shipping details */}
            <div className="md:col-span-2 space-y-5 p-6 rounded-2xl bg-[#0D1322] border border-[#1A253D]">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-400" />
                Shipping Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Country</label>
                  <input
                    type="text"
                    disabled
                    value={shippingAddress.country}
                    className="w-full bg-dark-900/60 border border-dark-800 rounded-xl px-3 py-2 text-gray-400 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-gray-400 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.addressLine1}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, addressLine1: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Idempotency Inspector Card */}
              <div className="pt-4 border-t border-dark-800">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span className="flex items-center gap-1.5 font-medium text-gray-300">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Idempotency Key (Prevents Duplicate Charges)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIdempotencyKey(`IDEMP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  className="w-full font-mono text-[11px] bg-dark-950 border border-dark-800 rounded-xl px-3 py-1.5 text-amber-400/90 outline-none"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  * Stored in D1 <code>idempotency_keys</code> with SHA-256 payload hash to prevent double reservations.
                </p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="space-y-5">
              <div className="p-6 rounded-2xl bg-[#0D1322] border border-[#1A253D] space-y-4">
                <h2 className="text-base font-bold text-white">Summary</h2>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Items Count</span>
                    <span className="font-mono text-white font-medium">{checkoutItems.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Reservation Hold</span>
                    <span className="text-emerald-400 font-medium">10 Minutes</span>
                  </div>
                  <div className="pt-2 border-t border-dark-800 flex justify-between text-base font-bold text-white">
                    <span>Total</span>
                    <span className="font-mono text-amber-400">{totalFormatted}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || checkoutItems.length === 0}
                  className="w-full py-3.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-medium transition-all shadow-xl shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-dark-950" />
                  {isLoading ? 'Locking Stock in D1...' : 'Reserve Inventory & Proceed'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* STEP 2: SIMULATE PAYMENT & COMPLETE ORDER */
        <div className="max-w-xl mx-auto space-y-6 p-6 sm:p-8 rounded-3xl bg-[#0D1322] border border-[#1A253D] shadow-2xl">
          {/* Reservation Confirmed Notice */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-emerald-300">Inventory Reserved Successfully!</h3>
              <p className="text-xs text-gray-300">
                Order <strong className="font-mono text-white">{createdOrder?.orderNumber}</strong> has claimed available inventory.
              </p>
            </div>
          </div>

          {/* Live Expiration Countdown */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Stock Reservation Window:</span>
            </div>
            <span className="text-xl font-extrabold font-mono text-amber-400">
              {formatTimer(secondsRemaining)}
            </span>
          </div>

          {/* Payment Simulation Controls */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Select Simulated Payment Outcome:
            </label>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelectedOutcome('success')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedOutcome === 'success'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-dark-900 border-dark-800 text-gray-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-white mb-0.5">Success (200)</div>
                <div className="text-[10px] text-gray-400">Deducts stock & confirms order</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOutcome('failure')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedOutcome === 'failure'
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 font-bold'
                    : 'bg-dark-900 border-dark-800 text-gray-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-white mb-0.5">Simulate Failure</div>
                <div className="text-[10px] text-gray-400">Releases reserved stock</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOutcome('timeout')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedOutcome === 'timeout'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold'
                    : 'bg-dark-900 border-dark-800 text-gray-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-white mb-0.5">Simulate Timeout</div>
                <div className="text-[10px] text-gray-400">Cancels order & releases stock</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOutcome('expired')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedOutcome === 'expired'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-300 font-bold'
                    : 'bg-dark-900 border-dark-800 text-gray-400 hover:text-white'
                }`}
              >
                <div className="font-semibold text-white mb-0.5">Expired Reservation</div>
                <div className="text-[10px] text-gray-400">Rejects late confirmation</div>
              </button>
            </div>
          </div>

          {/* Amount Due & CTA */}
          <div className="pt-4 border-t border-dark-800 space-y-4">
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-gray-400">Total Payable:</span>
              <span className="text-2xl font-bold font-mono text-amber-400">{totalFormatted}</span>
            </div>

            <button
              type="button"
              onClick={handleSimulatePayment}
              disabled={isLoading || secondsRemaining <= 0}
              className="w-full py-3.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-medium transition-all shadow-xl shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4 text-dark-950" />
              {isLoading ? 'Executing Payment Transaction...' : `Simulate Payment (${selectedOutcome.toUpperCase()})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
