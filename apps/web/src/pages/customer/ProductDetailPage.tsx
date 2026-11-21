import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ShoppingBag,
  Zap,
  ShieldCheck,
  ArrowLeft,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Share2
} from 'lucide-react'
import { api } from '../../services/api'
import { Product } from '../../types'
import { StockBadge } from '../../components/common/StockBadge'
import { FlashSaleTicker } from '../../components/common/FlashSaleTicker'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { user } = useAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [loadError, setLoadError] = useState('')
  const [cartError, setCartError] = useState('')

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return
      setIsLoading(true)
      setLoadError('')
      try {
        const res = await api.getProductById(id)
        if (res?.success && res.product) {
          setProduct({
            ...res.product,
            onHand: res.inventory?.on_hand ?? 0,
            reserved: res.inventory?.reserved ?? 0,
            available: res.inventory?.available ?? 0
          })
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Unable to load this product')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
  }, [id])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-pulse">
          <div className="aspect-square bg-dark-900 rounded-3xl border border-dark-800" />
          <div className="space-y-4">
            <div className="h-8 bg-dark-900 rounded-lg w-3/4" />
            <div className="h-6 bg-dark-900 rounded-lg w-1/4" />
            <div className="h-32 bg-dark-900 rounded-2xl w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Product Not Found</h2>
        <p role={loadError ? 'alert' : undefined} className="text-xs text-gray-400 mb-6">{loadError || 'The requested product could not be found or has been archived.'}</p>
        <Link
          to="/products"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-dark-950 hover:bg-amber-400"
        >
          Back to Catalog
        </Link>
      </div>
    )
  }

  const isFlashSale = !!product.flashSale && product.flashSale.status === 'active'
  const unitPrice = isFlashSale ? product.flashSale!.discountPrice : product.price
  const priceRupees = (unitPrice / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  })
  const originalPriceRupees = (product.price / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  })

  const isOutOfStock = product.available <= 0

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setIsSubmitting(true)
    setCartError('')
    try {
      await addToCart(product.id, quantity)
    } catch (err: any) {
      setCartError(err.message || 'Failed to add item to cart')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBuyNow = () => {
    if (!user) {
      navigate('/login')
      return
    }
    navigate('/checkout', {
      state: {
        directItem: {
          productId: product.id,
          quantity,
          product
        }
      }
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back breadcrumb */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to products
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Image Showcase */}
        <div className="space-y-4">
          <div className="aspect-[4/3] sm:aspect-square rounded-3xl bg-[#0B0F19] border border-[#1A253D] overflow-hidden relative shadow-2xl">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 bg-dark-900">
                <ShoppingBag className="w-20 h-20 stroke-[1]" />
              </div>
            )}
            <div className="absolute top-4 left-4 flex gap-2">
              <StockBadge available={product.available} />
              {isFlashSale && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg">
                  <Zap className="w-3.5 h-3.5 mr-1 fill-white" />
                  FLASH SALE
                </span>
              )}
            </div>
          </div>

          {/* Flash sale ticker under image if active */}
          {isFlashSale && <FlashSaleTicker flashSale={product.flashSale!} />}
        </div>

        {/* Product Details & Actions */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-500 mb-2">
              <span className="uppercase tracking-wider font-mono">{product.category || 'General'}</span>
              <span className="text-gray-600">•</span>
              <span className="font-mono text-gray-400">SKU: {product.sku}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
              {product.name}
            </h1>

            {/* Price display */}
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-white">
                {priceRupees}
              </span>
              {isFlashSale && (
                <span className="text-lg text-gray-400 line-through font-mono">
                  {originalPriceRupees}
                </span>
              )}
              {isFlashSale && (
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Save {Math.round(((product.price - product.flashSale!.discountPrice) / product.price) * 100)}%
                </span>
              )}
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">
              {product.description || 'High-performance hardware component certified for modern workloads.'}
            </p>
          </div>

          {/* Real-time Inventory Diagnostics Card */}
          <div className="p-4 rounded-2xl bg-[#0D1322] border border-[#1A253D] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Live Inventory Breakdown
              </span>
              <span className="font-mono text-[11px] text-gray-500">Cloudflare D1 State</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium block">Available</span>
                <span className="text-lg font-bold font-mono text-emerald-400">{product.available}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium block">Reserved</span>
                <span className="text-lg font-bold font-mono text-amber-400">{product.reserved}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-dark-900 border border-dark-800">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium block">On Hand</span>
                <span className="text-lg font-bold font-mono text-gray-200">{product.onHand}</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              * Stock formula: <code>available = on_hand - reserved</code>. Reserved units are held for 10 minutes.
            </p>
          </div>

          {/* Quantity Selector & CTAs */}
          <div className="space-y-4 pt-2">
            {!isOutOfStock && (
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-400">Quantity:</span>
                <div className="flex items-center border border-dark-700 rounded-xl bg-dark-900 p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="p-1.5 hover:text-amber-400 text-gray-400 disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-sm font-mono font-semibold text-white">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.available, quantity + 1))}
                    disabled={quantity >= product.available}
                    className="p-1.5 hover:text-amber-400 text-gray-400 disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  Max: {product.available}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock || isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-600 hover:border-amber-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                {isSubmitting ? 'Adding...' : 'Add to Cart'}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-dark-950" />
                Buy Now (Instant Reserve)
              </button>
            </div>
            {cartError && <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">{cartError}</p>}
          </div>

          {/* Checkout details */}
          <div className="pt-6 border-t border-dark-800 space-y-2 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Checkout reserves stock through a database transaction and inventory constraints</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Idempotency keys help prevent duplicate order creation when checkout is retried</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Fast Serverless Execution powered by Cloudflare Workers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
