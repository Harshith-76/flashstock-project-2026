import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Filter, SlidersHorizontal, RefreshCcw } from 'lucide-react'
import { api } from '../../services/api'
import { Product } from '../../types'
import { ProductCard } from '../../components/common/ProductCard'

const CATEGORIES = ['All', 'Electronics', 'Audio', 'Furniture', 'Accessories']

export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const categoryParam = searchParams.get('category') || 'All'
  const searchParam = searchParams.get('search') || ''
  const sortParam = searchParams.get('sort') || 'newest'

  const [selectedCategory, setSelectedCategory] = useState(categoryParam)
  const [searchInput, setSearchInput] = useState(searchParam)
  const [sortOption, setSortOption] = useState(sortParam)
  const [inStockOnly, setInStockOnly] = useState(false)

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const res = await api.getProducts({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        search: searchInput.trim() || undefined,
        sort: sortOption
      })

      if (res?.success) {
        setProducts(res.products || [])
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [selectedCategory, sortOption])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProducts()
  }

  const filteredProducts = inStockOnly
    ? products.filter((p) => p.available > 0)
    : products

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#141C30] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Product Catalog</h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time stock powered by Cloudflare D1 with instant availability indicators.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-[#0D1322] border border-[#1A253D] focus:border-amber-500/50 rounded-xl pl-9.5 pr-4 py-2 text-xs text-white placeholder-gray-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-600 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-dark-900/60 p-3.5 rounded-2xl border border-dark-800">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-dark-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-dark-800 text-gray-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Right Controls: In Stock Only & Sorting */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="rounded bg-dark-800 border-dark-700 text-amber-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
            />
            <span>In-stock only</span>
          </label>

          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-dark-800 border border-dark-700 text-white rounded-xl px-2.5 py-1 text-xs outline-none focus:border-amber-500/50"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 rounded-2xl bg-dark-900 border border-dark-800 animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center text-gray-400 bg-dark-900/40 rounded-2xl border border-dark-800/80">
          <Filter className="w-10 h-10 mx-auto text-gray-600 mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No matching products</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
            Try adjusting your search query, selecting another category, or unchecking "In-stock only".
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All')
              setSearchInput('')
              setInStockOnly(false)
              setSortOption('newest')
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-700 text-gray-300 border border-dark-700 transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
