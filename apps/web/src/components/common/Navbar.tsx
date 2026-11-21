import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Zap,
  ShoppingBag,
  Search,
  User,
  Shield,
  LogOut,
  Package,
  Layers,
  ChevronDown
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'

export const Navbar: React.FC = () => {
  const { user, isAdmin, logout } = useAuth()
  const { itemCount, openDrawer } = useCart()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-[#070A11]/90 backdrop-blur-md border-b border-[#141C30]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-dark-950 fill-dark-950" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1 font-mono">
                Flash<span className="text-amber-400">Stock</span>
              </span>
              <span className="hidden sm:block text-[9px] font-semibold uppercase tracking-widest text-amber-500/70 -mt-1 font-mono">
                Safe Inventory Engine
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by title, SKU, or specs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0D1322] border border-[#1A253D] focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/50 rounded-xl pl-9.5 pr-4 py-1.5 text-xs text-white placeholder-gray-500 transition-all outline-none"
              />
            </div>
          </form>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-gray-300">
            <Link to="/products" className="hover:text-amber-400 transition-colors">
              All Products
            </Link>
            <Link to="/products?category=Electronics" className="hover:text-amber-400 transition-colors">
              Electronics
            </Link>
            <Link to="/products?category=Audio" className="hover:text-amber-400 transition-colors">
              Audio
            </Link>
            <Link to="/products?category=Furniture" className="hover:text-amber-400 transition-colors">
              Furniture
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Cart Button */}
            <button
              onClick={openDrawer}
              className="relative p-2 rounded-xl bg-[#0D1322] border border-[#1A253D] hover:border-amber-500/40 text-gray-200 transition-colors"
              title="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-dark-950 text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-md">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Admin Portal Link */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin Panel
              </Link>
            )}

            {/* User Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-[#0D1322] border border-[#1A253D] hover:border-amber-500/40 text-xs text-gray-200 transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500/30 to-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-xs uppercase">
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden sm:inline-block max-w-[100px] truncate font-medium">{user.name}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>

                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 bg-[#0B0F19] border border-[#1F293D] rounded-xl shadow-2xl p-1.5 z-50 text-xs"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-dark-800 mb-1">
                      <p className="font-semibold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {user.role}
                      </span>
                    </div>

                    <Link
                      to="/account"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
                    >
                      <Package className="w-3.5 h-3.5 text-amber-400" />
                      Order History
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-amber-400 hover:bg-dark-800 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Admin Dashboard
                      </Link>
                    )}

                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-dark-800 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-dark-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-dark-950 font-medium transition-all shadow-md shadow-amber-500/10"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
