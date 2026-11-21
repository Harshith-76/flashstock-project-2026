import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Zap, ArrowRight } from 'lucide-react'
import { Product } from '../../types'
import { StockBadge } from './StockBadge'
import { ProductImage } from './ProductImage'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'

interface ProductCardProps {
  product: Product
  onQuickBuy?: (product: Product) => void
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickBuy }) => {
  const { addToCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const isFlashSale = !!product.flashSale && product.flashSale.status === 'active'
  const finalPrice = isFlashSale ? product.flashSale!.discountPrice : product.price
  const priceRupees = (finalPrice / 100).toLocaleString('en-IN', {
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

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login')
      return
    }
    setIsAdding(true)
    setAddError('')
    try {
      await addToCart(product.id, 1)
    } catch (err: any) {
      setAddError(err.message || 'Failed to add item to cart')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="group relative bg-[#0D1322] border border-[#1A2338] hover:border-amber-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col h-full">
      {/* Top badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
        <StockBadge available={product.available} />
        {isFlashSale && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-rose-950/50">
            <Zap className="w-3 h-3 mr-1 fill-white" />
            FLASH SALE
          </span>
        )}
      </div>

      {/* Image container */}
      <Link to={`/products/${product.id}`} className="relative block aspect-[4/3] bg-dark-950 overflow-hidden">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1322] via-transparent to-transparent opacity-80" />
      </Link>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <span className="uppercase tracking-wider font-medium text-amber-500/90">{product.category || 'General'}</span>
            <span className="font-mono text-gray-500">{product.sku}</span>
          </div>

          <Link to={`/products/${product.id}`} className="block group-hover:text-amber-400 transition-colors">
            <h3 className="font-semibold text-gray-100 text-base line-clamp-1 mb-1.5">{product.name}</h3>
          </Link>

          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-4">
            {product.description || 'Precision engineered hardware engineered for high performance.'}
          </p>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-3 border-t border-[#1A2338]">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-xl font-bold font-mono text-white">{priceRupees}</span>
              {isFlashSale && (
                <span className="ml-2 text-xs text-gray-400 line-through font-mono">
                  {originalPriceRupees}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-400">
              {product.available > 0 ? `${product.available} available` : 'Zero stock'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAdding}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[#141D30] hover:bg-[#1E2B47] text-gray-200 border border-[#2A3756] hover:border-amber-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              {isAdding ? 'Adding...' : 'Add to Cart'}
            </button>

            <Link
              to={`/products/${product.id}`}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-medium transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-1 group/btn"
            >
              Details
              <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          {addError && <p role="alert" className="mt-2 text-xs text-rose-300">{addError}</p>}
        </div>
      </div>
    </div>
  )
}
