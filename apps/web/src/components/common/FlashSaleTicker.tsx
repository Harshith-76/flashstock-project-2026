import React, { useState, useEffect } from 'react'
import { Flame, Clock } from 'lucide-react'
import { FlashSale } from '../../types'

interface FlashSaleTickerProps {
  flashSale: FlashSale
}

export const FlashSaleTicker: React.FC<FlashSaleTickerProps> = ({ flashSale }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(flashSale.endTime).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds })
    }

    calculateTime()
    const timer = setInterval(calculateTime, 1000)
    return () => clearInterval(timer)
  }, [flashSale.endTime])

  const remainingQuota = Math.max(0, flashSale.saleStockLimit - flashSale.allocatedStock)
  const percentClaimed = Math.min(100, Math.round((flashSale.allocatedStock / flashSale.saleStockLimit) * 100))

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/10 border border-amber-500/30 rounded-xl p-3">
      <div className="flex items-center justify-between text-xs font-semibold text-amber-400 mb-2">
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
          <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
          Limited-Time Flash Deal
        </span>
        <span className="flex items-center gap-1 text-gray-300 font-mono">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-gray-300">
          <span>Sale stock: <strong className="text-white font-mono">{remainingQuota} left</strong></span>
          <span className="text-gray-400 font-mono">{percentClaimed}% claimed</span>
        </div>
        <div className="w-full bg-dark-700/80 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-rose-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${percentClaimed}%` }}
          />
        </div>
      </div>
    </div>
  )
}
