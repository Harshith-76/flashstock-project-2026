import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Zap,
  ShieldCheck,
  TrendingUp,
  Cpu,
  ArrowRight,
  Sparkles,
  Flame,
  CheckCircle2,
  Lock,
  RefreshCw
} from 'lucide-react'
import { api } from '../../services/api'
import { Product, FlashSale } from '../../types'
import { ProductCard } from '../../components/common/ProductCard'
import { FlashSaleTicker } from '../../components/common/FlashSaleTicker'

export const LandingPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [flashSales, setFlashSales] = useState<FlashSale[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, flashRes] = await Promise.all([
          api.getProducts(),
          api.getActiveFlashSales()
        ])

        if (prodRes?.success) {
          setProducts(prodRes.products || [])
        }
        if (flashRes?.success) {
          setFlashSales(flashRes.flashSales || [])
        }
      } catch (err) {
        console.error('Failed to load landing data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="space-y-20 pb-16">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 md:pt-20 pb-16">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-glow" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-6 shadow-lg shadow-amber-500/5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interview-Grade Architecture • Real Concurrency Safety</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
            High-Velocity Flash Sales. <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">
              Zero Overselling Guarantee.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-400 leading-relaxed mb-10">
            Engineered with Cloudflare Workers, Hono, and Cloudflare D1. FlashStock enforces mathematical concurrency safety using database-level conditional batch transactions and check constraints.
          </p>

          {/* Call to actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/products"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 font-medium"
            >
              Explore Products
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/admin"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-semibold bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-600 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2"
            >
              <Cpu className="w-4 h-4 text-amber-400" />
              Live Concurrency Lab
            </Link>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-dark-900/80 border border-dark-800 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" />
                CONCURRENCY
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">100 : 10</div>
              <p className="text-[11px] text-gray-500">100 simultaneous requests safely claim exactly 10 units</p>
            </div>

            <div className="p-4 rounded-2xl bg-dark-900/80 border border-dark-800 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold mb-1">
                <Lock className="w-4 h-4" />
                STOCK FORMULA
              </div>
              <div className="text-lg font-bold text-white font-mono truncate">on_hand - res</div>
              <p className="text-[11px] text-gray-500">Atomic database constraints prevent negative inventory</p>
            </div>

            <div className="p-4 rounded-2xl bg-dark-900/80 border border-dark-800 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold mb-1">
                <RefreshCw className="w-4 h-4" />
                EXPIRATION
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">10 MIN</div>
              <p className="text-[11px] text-gray-500">Automatic release of unpaid cart reservations</p>
            </div>

            <div className="p-4 rounded-2xl bg-dark-900/80 border border-dark-800 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold mb-1">
                <TrendingUp className="w-4 h-4" />
                DATABASE
              </div>
              <div className="text-2xl font-extrabold text-white font-mono">D1 SQLITE</div>
              <p className="text-[11px] text-gray-500">Zero-oversell SQLite engine with trigger checks</p>
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVE FLASH SALES SHOWCASE */}
      {flashSales.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-b from-[#10172A] to-[#0A0E1A] border border-amber-500/30 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Flame className="w-4 h-4 fill-amber-400 animate-pulse" />
                  Live Flash Sale Event
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                  Limited Quota Flash Drops
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Stock is locked dynamically on purchase attempt with 10-minute hold window.
                </p>
              </div>

              <Link
                to="/products?category=Electronics"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 group"
              >
                View all deals
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {flashSales.map((sale) => {
                const prod = products.find((p) => p.id === sale.productId)
                if (!prod) return null

                return (
                  <div key={sale.id} className="space-y-4">
                    <ProductCard product={{ ...prod, flashSale: sale }} />
                    <FlashSaleTicker flashSale={sale} />
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS CATALOG */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Featured Hardware</h2>
            <p className="text-xs text-gray-400 mt-1">
              Real-time stock retrieved directly from Cloudflare D1.
            </p>
          </div>
          <Link
            to="/products"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            Browse All ({products.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 rounded-2xl bg-dark-900 border border-dark-800 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-gray-400 bg-dark-900 rounded-2xl border border-dark-800">
            No products found in database. Seed sample data from the Admin panel.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ARCHITECTURE DEEP DIVE SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 md:p-12 rounded-3xl bg-[#0B0F19] border border-[#1A253D] relative overflow-hidden">
          <div className="max-w-3xl">
            <span className="text-xs font-bold font-mono text-amber-400 uppercase tracking-widest">
              Interview Architecture Breakdown
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2 mb-6">
              How FlashStock Guarantees Zero Overselling During High Concurrency
            </h2>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed mb-8">
              <p>
                In high-traffic flash sales, multiple users attempt to purchase scarce inventory within milliseconds. Naive architectures perform a read query (<code>SELECT stock</code>) followed by an application-level update, causing disastrous race conditions and massive overselling.
              </p>
              <p>
                FlashStock eliminates race conditions at the database engine level using <strong>atomic conditional D1 batch transactions</strong> coupled with <strong>database-level CHECK constraints</strong>:
              </p>
              <ul className="space-y-2 text-xs font-mono bg-dark-950 p-4 rounded-xl border border-dark-800 text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>available = on_hand - reserved</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>CHECK (reserved &lt;= on_hand) AND CHECK (reserved &gt;= 0)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Atomic batch abort on constraint failure rolls back entire multi-item checkout</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Idempotency key uniqueness prevents duplicate charges and duplicate reservations</span>
                </li>
              </ul>
            </div>

            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 text-dark-950 hover:bg-amber-400 transition-colors"
            >
              <Cpu className="w-4 h-4" />
              Open Admin & Concurrency Simulator
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
