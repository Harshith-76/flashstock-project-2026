import React from 'react'
import { Zap, ShieldCheck, Database, Cpu, Lock } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#05080E] border-t border-[#141C30] text-gray-400 text-xs py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-dark-950 fill-dark-950" />
              </div>
              <span className="text-base font-bold text-white font-mono">
                Flash<span className="text-amber-400">Stock</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Full-stack e-commerce platform powered by an atomic, concurrency-safe inventory reservation engine built for high-throughput flash sales.
            </p>
          </div>

          {/* Architecture Pillars */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold uppercase tracking-wider text-[11px]">Core Architecture</h4>
            <ul className="space-y-1.5 text-gray-400 text-[11px]">
              <li className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                Cloudflare Workers & Hono
              </li>
              <li className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                Cloudflare D1 (SQLite Engine)
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Atomic Conditional Batch Updates
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                DB-Enforced Check Constraints
              </li>
            </ul>
          </div>

          {/* Inventory Safety Guarantees */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold uppercase tracking-wider text-[11px]">Safety Guarantees</h4>
            <ul className="space-y-1.5 text-gray-400 text-[11px]">
              <li>• Guaranteed Zero Overselling</li>
              <li>• 10-Minute Conditional Stock Hold</li>
              <li>• Idempotent Checkout Protection</li>
              <li>• Background Expiry Release Sweep</li>
            </ul>
          </div>

          {/* Demonstration Credentials */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold uppercase tracking-wider text-[11px]">Demo Credentials</h4>
            <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 text-[11px] font-mono space-y-1">
              <div>
                <span className="text-gray-500">Admin: </span>
                <span className="text-amber-400">admin@flashstock.dev</span>
              </div>
              <div>
                <span className="text-gray-500">Customer: </span>
                <span className="text-gray-300">customer@flashstock.dev</span>
              </div>
              <div className="text-gray-500">Password: admin123 / customer123</div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[#141C30] flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} FlashStock. Concurrency-Safe E-Commerce Engine.</p>
          <div className="flex items-center gap-6">
            <span>Serverless D1 / SQLite</span>
            <span>Zero-Oversell Guarantee</span>
            <span>Full-Stack Showcase</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
