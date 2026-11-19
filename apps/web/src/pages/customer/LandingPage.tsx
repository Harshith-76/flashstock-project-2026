import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Clock3,
  Facebook,
  Headphones,
  Instagram,
  Menu,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  X,
  Zap
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from '../../services/api'
import type { FlashSale, Product } from '../../types'

const demoProducts: Product[] = [
  {
    id: 'demo-mechanical-keyboard',
    name: 'Mechanical Keyboard',
    description: 'A tactile, thoughtfully engineered keyboard made for your everyday setup.',
    sku: 'FS-KB-001',
    price: 499900,
    category: 'Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85',
    status: 'active',
    createdAt: '',
    updatedAt: '',
    onHand: 12,
    reserved: 0,
    available: 12
  },
  {
    id: 'demo-wireless-headphones',
    name: 'Studio Wireless Headphones',
    description: 'Immersive sound and all-day comfort, wherever you go.',
    sku: 'FS-AU-024',
    price: 749900,
    category: 'Audio',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85',
    status: 'active',
    createdAt: '',
    updatedAt: '',
    onHand: 18,
    reserved: 0,
    available: 18
  },
  {
    id: 'demo-smart-watch',
    name: 'Everyday Smartwatch',
    description: 'A refined companion for a more connected, balanced day.',
    sku: 'FS-WT-017',
    price: 899900,
    category: 'Accessories',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85',
    status: 'active',
    createdAt: '',
    updatedAt: '',
    onHand: 9,
    reserved: 0,
    available: 9
  }
]

const categories = [
  {
    name: 'Electronics',
    detail: 'Smart picks for your setup',
    href: '/products?category=Electronics',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=900&q=85'
  },
  {
    name: 'Fashion',
    detail: 'Everyday, elevated',
    href: '/products?category=Fashion',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85'
  },
  {
    name: 'Home & Living',
    detail: 'Make room for good living',
    href: '/products?category=Furniture',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85'
  },
  {
    name: 'Accessories',
    detail: 'The details that make it yours',
    href: '/products?category=Accessories',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85'
  },
  {
    name: 'Gaming',
    detail: 'Level up your downtime',
    href: '/products?category=Gaming',
    image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=85'
  },
  {
    name: 'Lifestyle',
    detail: 'Little upgrades, every day',
    href: '/products?category=Lifestyle',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85'
  }
]

const deals = [
  {
    name: 'Studio Wireless Headphones',
    category: 'Audio',
    originalPrice: 749900,
    price: 549900,
    discount: '27% off',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85'
  },
  {
    name: 'Everyday Smartwatch',
    category: 'Accessories',
    originalPrice: 899900,
    price: 699900,
    discount: '22% off',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85'
  },
  {
    name: 'Wireless Gaming Controller',
    category: 'Gaming',
    originalPrice: 499900,
    price: 379900,
    discount: '24% off',
    image: 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=900&q=85'
  }
]

const benefits: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: ShieldCheck,
    title: 'Secure shopping',
    description: 'Your details and every order are handled with care.'
  },
  {
    icon: PackageCheck,
    title: 'Smarter inventory',
    description: 'Real-time availability helps you shop with confidence.'
  },
  {
    icon: Truck,
    title: 'Fast order processing',
    description: 'From checkout to doorstep, we keep things moving.'
  },
  {
    icon: BadgeCheck,
    title: 'Reliable payments',
    description: 'A smooth, dependable experience at every step.'
  }
]

const formatPrice = (paise: number) =>
  (paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  })

const hideUnavailableImage = (event: React.SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.style.display = 'none'
}

const SectionHeading: React.FC<{
  eyebrow: string
  title: string
  description?: string
}> = ({ eyebrow, title, description }) => (
  <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-600">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
    </div>
    {description && <p className="max-w-md text-sm leading-6 text-slate-500">{description}</p>}
  </div>
)

const ProductTile: React.FC<{ product: Product; index: number }> = ({ product, index }) => (
  <article className="group overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_50px_-25px_rgba(15,23,42,0.22)]">
    <Link
      to={product.id.startsWith('demo-') ? `/products?search=${encodeURIComponent(product.name)}` : `/products/${product.id}`}
      className="relative block aspect-[1.16/1] overflow-hidden bg-slate-100"
      aria-label={`View ${product.name}`}
    >
      <img
        src={product.imageUrl || demoProducts[index % demoProducts.length].imageUrl || ''}
        alt={product.name}
        loading="lazy"
        onError={hideUnavailableImage}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
      />
      {index === 0 && (
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-sm backdrop-blur">
          Best pick
        </span>
      )}
    </Link>
    <div className="p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{product.category || 'Curated pick'}</p>
        <div className="flex items-center gap-1 text-amber-500" aria-label="Five star visual rating">
          <Star className="h-3.5 w-3.5 fill-current" />
          <Star className="h-3.5 w-3.5 fill-current" />
          <Star className="h-3.5 w-3.5 fill-current" />
          <Star className="h-3.5 w-3.5 fill-current" />
          <Star className="h-3.5 w-3.5 fill-current" />
        </div>
      </div>
      <Link to={product.id.startsWith('demo-') ? '/products' : `/products/${product.id}`}>
        <h3 className="truncate text-base font-semibold text-slate-900 transition group-hover:text-orange-700">{product.name}</h3>
      </Link>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
        {product.description || 'A considered pick from the FlashStock collection.'}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-lg font-bold tracking-tight text-slate-950">{formatPrice(product.price)}</span>
        <button
          type="button"
          title="Cart action preview"
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-orange-600"
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Add to Cart
        </button>
      </div>
    </div>
  </article>
)

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [flashSales, setFlashSales] = useState<FlashSale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasApiError, setHasApiError] = useState(false)
  const [search, setSearch] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchLandingData = async () => {
      const results = await Promise.allSettled([api.getProducts(), api.getActiveFlashSales()])
      if (!isMounted) return

      const [productResult, saleResult] = results
      let failed = false

      if (productResult.status === 'fulfilled' && productResult.value?.success) {
        setProducts(productResult.value.products || [])
      } else {
        failed = true
        if (productResult.status === 'rejected') {
          console.error('Failed to load landing products:', productResult.reason)
        }
      }

      if (saleResult.status === 'fulfilled' && saleResult.value?.success) {
        setFlashSales(saleResult.value.flashSales || [])
      } else {
        failed = true
        if (saleResult.status === 'rejected') {
          console.error('Failed to load landing deals:', saleResult.reason)
        }
      }

      setHasApiError(failed)
      setIsLoading(false)
    }

    fetchLandingData()
    return () => {
      isMounted = false
    }
  }, [])

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = search.trim()
    if (query) navigate(`/products?search=${encodeURIComponent(query)}`)
  }

  const featuredProducts = products.length > 0 ? products.slice(0, 3) : demoProducts
  const liveDeals = flashSales.flatMap((sale) => {
    const product = products.find((item) => item.id === sale.productId)
    if (!product || product.price <= 0) return []
    return [{
      name: product.name,
      category: product.category || 'Featured',
      originalPrice: product.price,
      price: sale.discountPrice,
      discount: `${Math.round(((product.price - sale.discountPrice) / product.price) * 100)}% off`,
      image: product.imageUrl || demoProducts[0].imageUrl || '',
      key: sale.id
    }]
  })
  const visibleDeals = liveDeals.length > 0
    ? liveDeals
    : deals.map((deal) => ({ ...deal, key: deal.name }))

  return (
    <div id="top" className="min-h-screen overflow-hidden bg-[#fafaf9] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex shrink-0 items-center gap-2.5" aria-label="FlashStock home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-orange-400 shadow-sm transition group-hover:bg-orange-600 group-hover:text-white">
              <Zap className="h-[18px] w-[18px] fill-current" />
            </span>
            <span className="text-lg font-bold tracking-[-0.06em] text-slate-950">
              flash<span className="text-orange-600">stock</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-slate-600 md:flex" aria-label="Main navigation">
            <Link to="/" className="text-slate-950">Home</Link>
            <Link to="/products" className="transition hover:text-orange-700">Shop</Link>
            <a href="#categories" className="inline-flex items-center gap-1 transition hover:text-orange-700">
              Categories <ChevronDown className="h-3.5 w-3.5" />
            </a>
            <a href="#deals" className="transition hover:text-orange-700">Deals</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <form onSubmit={handleSearch} className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find your next favorite"
                aria-label="Search products"
                className="h-10 w-56 rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </form>
            <Link
              to="/cart"
              aria-label="Shopping bag"
              className="grid h-10 w-10 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100 hover:text-orange-700"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
            </Link>
            <Link
              to="/login"
              className="hidden rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-orange-600 sm:inline-flex"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="grid h-10 w-10 place-items-center rounded-full text-slate-800 hover:bg-slate-100 md:hidden"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <nav className="border-t border-slate-100 bg-white px-5 py-4 shadow-lg md:hidden" aria-label="Mobile navigation">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 text-sm font-medium">
              <Link onClick={() => setIsMenuOpen(false)} to="/" className="rounded-xl px-3 py-3 hover:bg-slate-50">Home</Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/products" className="rounded-xl px-3 py-3 hover:bg-slate-50">Shop</Link>
              <a onClick={() => setIsMenuOpen(false)} href="#categories" className="rounded-xl px-3 py-3 hover:bg-slate-50">Categories</a>
              <a onClick={() => setIsMenuOpen(false)} href="#deals" className="rounded-xl px-3 py-3 hover:bg-slate-50">Deals</a>
              <Link onClick={() => setIsMenuOpen(false)} to="/login" className="rounded-xl px-3 py-3 text-orange-700 hover:bg-orange-50">Sign in</Link>
              <form onSubmit={handleSearch} className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products"
                  aria-label="Search products"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
                />
              </form>
            </div>
          </nav>
        )}
      </header>

      <main>
        <section className="relative isolate">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_68%_45%,rgba(253,186,116,0.22),transparent_38%),linear-gradient(180deg,#fff_0%,#fafaf9_100%)]" />
          <div className="mx-auto grid min-h-[610px] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
            <div className="relative z-10 max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50/80 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-800">
                <Sparkles className="h-3.5 w-3.5" />
                A little smarter. A lot more you.
              </div>
              <h1 className="max-w-[620px] text-[clamp(3.1rem,7vw,5.7rem)] font-semibold leading-[0.99] tracking-[-0.075em] text-slate-950">
                Everything you need.
                <span className="mt-1 block text-orange-600">Delivered smarter.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Discover thoughtful finds, everyday essentials, and the kind of deals that make a good day even better.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/products"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-7 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-orange-600"
                >
                  Shop now <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#deals"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/70 px-7 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white"
                >
                  Explore deals <ArrowDown className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-9 flex items-center gap-3 text-xs text-slate-500">
                <div className="flex -space-x-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#fafaf9] bg-orange-100 text-[10px] font-bold text-orange-800">R</span>
                  <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#fafaf9] bg-sky-100 text-[10px] font-bold text-sky-800">A</span>
                  <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#fafaf9] bg-emerald-100 text-[10px] font-bold text-emerald-800">M</span>
                </div>
                <span><strong className="font-semibold text-slate-800">Good finds, good feels.</strong> That's the FlashStock way.</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[650px]">
              <div className="absolute -right-4 top-8 h-44 w-44 rounded-full bg-orange-200/50 blur-3xl sm:-right-8 sm:h-64 sm:w-64" />
              <div className="absolute -bottom-5 left-2 h-40 w-40 rounded-full bg-amber-100/80 blur-3xl" />
              <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-200 via-stone-100 to-orange-100 shadow-[0_40px_90px_-45px_rgba(15,23,42,0.4)] sm:min-h-[470px]">
                <img
                  src="https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1400&q=90"
                  alt="A curated collection of modern technology and everyday essentials"
                  onError={hideUnavailableImage}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-900/5 to-transparent" />
                <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/50 bg-white/85 px-3 py-2 text-[11px] font-semibold text-slate-800 shadow-sm backdrop-blur sm:left-7 sm:top-7">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Curated for your everyday
                </div>
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-white sm:bottom-8 sm:left-8 sm:right-8">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">A better kind of shopping</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Find your next favorite.</p>
                  </div>
                  <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-full border border-white/40 bg-white/15 backdrop-blur sm:grid">
                    <ArrowUpRight className="h-5 w-5" />
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-5 right-4 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 p-3.5 shadow-[0_14px_40px_-20px_rgba(15,23,42,0.35)] sm:-right-5 sm:bottom-8 sm:p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-600"><Zap className="h-5 w-5 fill-current" /></span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Little extra joy</p>
                  <p className="text-sm font-bold text-slate-900">Deals worth a look</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mx-auto grid max-w-7xl grid-cols-2 border-y border-slate-200/80 px-4 py-5 sm:px-6 md:grid-cols-4 lg:px-8">
            {[
              ['Thoughtful picks', 'For the way you live'],
              ['Fresh finds', 'Always something new'],
              ['Quick & easy', 'A smoother shop'],
              ['Good value', 'More to love for less']
            ].map(([title, detail], index) => (
              <div key={title} className={`px-3 py-2 sm:px-5 ${index > 1 ? 'border-t border-slate-200/80 md:border-t-0' : ''} ${index % 2 === 1 ? 'border-l border-slate-200/80' : ''} ${index === 2 ? 'md:border-l' : ''}`}>
                <p className="text-sm font-semibold text-slate-800">{title}</p>
                <p className="mt-1 text-xs text-slate-500">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="categories" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <SectionHeading
            eyebrow="Find your kind of thing"
            title="A good place to start."
            description="From everyday essentials to little upgrades, explore collections picked to make browsing feel easy."
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {categories.map((category, index) => (
              <Link
                key={category.name}
                to={category.href}
                className={`group relative isolate flex min-h-[210px] flex-col justify-end overflow-hidden rounded-[1.35rem] bg-slate-800 p-4 text-white sm:min-h-[260px] sm:p-5 ${index === 0 ? 'col-span-2 min-h-[230px] sm:col-span-1 sm:min-h-[260px]' : ''}`}
              >
                <img
                  src={category.image}
                  alt={`${category.name} collection`}
                  loading="lazy"
                  onError={hideUnavailableImage}
                  className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-500 group-hover:scale-110"
                />
                <span className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
                <span className="mb-2 grid h-8 w-8 place-items-center rounded-full border border-white/40 bg-white/15 opacity-0 backdrop-blur transition group-hover:opacity-100">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold leading-5 sm:text-base">{category.name}</h3>
                <p className="mt-1 text-[10px] leading-4 text-white/75 sm:text-xs">{category.detail}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="The good stuff"
              title="Picked for your everyday."
              description="A few customer favorites and fresh discoveries, all in one place."
            />
            {featuredProducts === demoProducts && (
              <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs text-amber-800" role="status">
                <Check className="h-3.5 w-3.5" /> {hasApiError ? 'Demo picks shown while the live collection reconnects.' : 'Demo picks shown while the live collection is being prepared.'}
              </p>
            )}
            {isLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => <div key={item} className="aspect-[1.2/1] animate-pulse rounded-[1.4rem] bg-slate-100" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featuredProducts.map((product, index) => <ProductTile key={product.id} product={product} index={index} />)}
              </div>
            )}
            <div className="mt-8 flex justify-center">
              <Link to="/products" className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white">
                Explore all products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="deals" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-9 text-white sm:px-9 sm:py-12">
            <div className="absolute -right-28 -top-32 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
            <div className="relative">
              <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
                    <Zap className="h-4 w-4 fill-current" /> Good things, for a little less
                  </p>
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Flash Deals — Limited Time Offers</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">A handful of standout finds at prices that won't hang around.</p>
                  {liveDeals.length === 0 && (
                    <p className="mt-2 text-xs text-slate-400" role="status">Demo offers shown until live promotions are available.</p>
                  )}
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-medium text-slate-200">
                  <Clock3 className="h-4 w-4 text-orange-300" /> This week's picks
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {visibleDeals.map((deal) => (
                  <article key={deal.key} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur transition hover:border-orange-300/50 hover:bg-white/[0.09]">
                    <Link to={`/products?category=${encodeURIComponent(deal.category)}`} className="relative block aspect-[1.7/1] overflow-hidden bg-slate-800">
                      <img src={deal.image} alt={deal.name} loading="lazy" onError={hideUnavailableImage} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">{deal.discount}</span>
                    </Link>
                    <div className="p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{deal.category}</p>
                      <h3 className="mt-1 truncate text-sm font-semibold text-white">{deal.name}</h3>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold">{formatPrice(deal.price)}</span>
                          <span className="text-xs text-slate-400 line-through">{formatPrice(deal.originalPrice)}</span>
                        </div>
                        <Link to={`/products?category=${encodeURIComponent(deal.category)}`} aria-label={`Explore ${deal.category} deals`} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-orange-500">
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {flashSales.length > 0 && (
                <p className="mt-5 text-xs text-slate-400">
                  {flashSales.length} live {flashSales.length === 1 ? 'offer' : 'offers'} available in the store.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="The FlashStock difference"
              title="Shopping, with the details sorted."
              description="We bring thoughtful products and a smoother shopping experience together, so the little things feel effortless."
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-[#fafaf9] p-5 transition hover:-translate-y-1 hover:border-orange-200 hover:bg-white hover:shadow-lg hover:shadow-slate-900/5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-700"><Icon className="h-5 w-5" /></span>
                  <h3 className="mt-5 text-sm font-semibold text-slate-900">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-orange-100 px-6 py-12 sm:px-12 sm:py-16">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[40px] border-orange-200/60" />
            <div className="relative flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
              <div className="max-w-2xl">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-orange-800">Ready when you are</p>
                <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl">
                  Your next great find is just a click away.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Take a look around. Your new favorite might be closer than you think.</p>
              </div>
              <Link to="/products" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-950 px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-orange-600">
                Start shopping <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-9 border-b border-white/10 pb-10 md:grid-cols-4">
            <div className="col-span-2 max-w-sm">
              <Link to="/" className="inline-flex items-center gap-2.5 text-white">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-white"><Zap className="h-[18px] w-[18px] fill-current" /></span>
                <span className="text-lg font-bold tracking-[-0.06em]">flash<span className="text-orange-400">stock</span></span>
              </Link>
              <p className="mt-4 max-w-xs text-xs leading-6 text-slate-400">
                A better place to find everyday favorites, thoughtful essentials, and little things worth getting excited about.
              </p>
              <div className="mt-5 flex items-center gap-2">
                {[
                  { icon: Instagram, label: 'Instagram' },
                  { icon: Facebook, label: 'Facebook' },
                  { icon: Headphones, label: 'Community' }
                ].map(({ icon: SocialIcon, label }) => (
                  <a key={label} href="#top" aria-label={label} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-slate-400 transition hover:border-orange-400/50 hover:text-orange-300">
                    <SocialIcon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">Explore</h3>
              <ul className="mt-4 space-y-3 text-xs text-slate-400">
                <li><Link className="transition hover:text-white" to="/products">Shop all</Link></li>
                <li><a className="transition hover:text-white" href="#categories">Categories</a></li>
                <li><a className="transition hover:text-white" href="#deals">Flash deals</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">Here to help</h3>
              <ul className="mt-4 space-y-3 text-xs text-slate-400">
                <li><a className="transition hover:text-white" href="mailto:hello@flashstock.example">Contact us</a></li>
                <li><Link className="transition hover:text-white" to="/cart">Your shopping bag</Link></li>
                <li><Link className="transition hover:text-white" to="/login">Sign in</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-6 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} FlashStock. Made for the everyday.</p>
            <p className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Shop with confidence</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
