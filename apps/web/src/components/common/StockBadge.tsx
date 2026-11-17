import React from 'react'

interface StockBadgeProps {
  available: number
  onHand?: number
  reserved?: number
  showDetails?: boolean
  className?: string
}

export const StockBadge: React.FC<StockBadgeProps> = ({
  available,
  onHand,
  reserved,
  showDetails = false,
  className = ''
}) => {
  if (available <= 0) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-950/80 text-red-400 border border-red-800/60 ${className}`}>
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-red-500 animate-pulse"></span>
        Sold Out
      </span>
    )
  }

  if (available <= 3) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-800/60 ${className}`}>
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-400 animate-pulse"></span>
        Only {available} left!
      </span>
    )
  }

  if (showDetails && onHand !== undefined && reserved !== undefined) {
    return (
      <div className={`flex items-center gap-1.5 text-xs ${className}`}>
        <span className="inline-flex items-center px-2 py-0.5 rounded font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
          <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-400"></span>
          {available} available
        </span>
        <span className="text-gray-500">
          ({onHand} on hand, {reserved} reserved)
        </span>
      </div>
    )
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-800/50 ${className}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-400"></span>
      {available} in stock
    </span>
  )
}
