// components/modals/CreatePositionModal.tsx
'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiX, FiInfo, FiTrendingUp, FiAlertCircle } from 'react-icons/fi'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ToastProvider'

interface CreatePositionModalProps {
  pool: any
  onClose: () => void
}

const CreatePositionModal: React.FC<CreatePositionModalProps> = ({ pool, onClose }) => {
  const { t } = useTranslation()
  const { token, isAuthenticated } = useAuthStore()
  const { showToast } = useToast()
  const [step, setStep] = useState(1)
  const [amountUSD, setAmountUSD] = useState<string>('') // single USD input
  const [loading, setLoading] = useState(false)

  const currentPrice = pool?.price || 1850.25
  const [priceRange, setPriceRange] = useState({
    min: currentPrice * 0.9,
    max: currentPrice * 1.1,
  })

  // simple allocation for USD-stable pairs: token1 is USDC/USDT
  const token0Symbol = pool?.token0?.symbol || 'TOKEN0'
  const token1Symbol = pool?.token1?.symbol || 'TOKEN1'
  const isStableQuote = /USDT|USDC|DAI|USD/i.test(token1Symbol)
  const usd = parseFloat(amountUSD || '0')
  const token0Allocated = isStableQuote ? (usd / 2) / (currentPrice || 1) : 0
  const token1Allocated = isStableQuote ? (usd / 2) : 0

  const handleCreatePosition = async () => {
    if (!isAuthenticated || !token) {
      showToast(t('auth.required', 'Please log in before creating a position'), 'error')
      return
    }

    setLoading(true)
    try {
      // save last range locally for chart highlight on pool page
      try {
        if (pool?.id) {
          localStorage.setItem(
            `lastPositionRange:${pool.id}`,
            JSON.stringify({ min: priceRange.min, max: priceRange.max })
          )
        }
      } catch {}
      // Call API to create position (USD based)
      const response = await fetch('/api/positions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          poolId: pool?.id,
          amountUSD: parseFloat(amountUSD || '0'),
          minPrice: priceRange.min,
          maxPrice: priceRange.max,
          isFullRange: false,
        }),
      })

      if (response.ok) {
        // Success
        onClose()
      } else {
        const error = await response.json()
        showToast(error?.message || t('position.createError', 'Failed to create position'), 'error')
      }
    } catch (error) {
      console.error('Failed to create position:', error)
      showToast(t('position.createError', 'Failed to create position'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const estimatedAPR = () => {
    const rangeWidth = (priceRange.max - priceRange.min) / currentPrice
    const baseAPR = pool?.apr || 24.5
    // Narrower range = higher APR (concentrated liquidity)
    return (baseAPR * (1 / rangeWidth)).toFixed(2)
  }

  const isInRange = currentPrice >= priceRange.min && currentPrice <= priceRange.max

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f1419] rounded-2xl border border-border w-full max-w-5xl mx-4 max-h-[94vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-amber-400 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">
            {t('position.createNew')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <FiX className="w-5 h-5 text-black" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(94vh-120px)] pb-24">
          {/* Pool Info */}
          {pool && (
            <div className="bg-amber-200/10 border border-amber-300/20 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg text-foreground">
                    {token0Symbol}/{token1Symbol}
                  </span>
                  <span className="text-xs bg-amber-300 text-black px-2 py-0.5 rounded">
                    {(pool.fee / 10000).toFixed(2)}% fee
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{t('position.currentPrice')}</p>
                  <p className="font-bold text-foreground">{currentPrice.toFixed(4)} {token1Symbol} per {token0Symbol}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Price Range */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center text-foreground">
                <span className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold mr-2">
                  1
                </span>
                {t('position.setPriceRange')}
              </h3>

              {/* Full range / Custom range */}
              <div className="flex gap-2 mb-4">
                <button
                  className={`px-3 py-1.5 rounded-full text-sm ${priceRange.min === 0 && !isFinite(priceRange.max) ? 'bg-yellow-500 text-black' : 'bg-card text-foreground border border-border'}`}
                  onClick={() => setPriceRange({ min: 0, max: Number.POSITIVE_INFINITY })}
                >
                  Full range
                </button>
                <button
                  className="px-3 py-1.5 rounded-full text-sm bg-card text-foreground border border-border"
                  onClick={() => setPriceRange({ min: currentPrice * 0.9, max: currentPrice * 1.1 })}
                >
                  Custom range
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    {t('position.minPrice')}
                  </label>
                  <input
                    type="number"
                    value={isFinite(priceRange.min) ? priceRange.min : 0}
                    onChange={(e) => setPriceRange({ ...priceRange, min: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-card text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {((priceRange.min - currentPrice) / currentPrice * 100).toFixed(2)}% from current
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    {t('position.maxPrice')}
                  </label>
                  <input
                    type="number"
                    value={isFinite(priceRange.max) ? priceRange.max : 0}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      setPriceRange({ ...priceRange, max: isNaN(v) ? Number.POSITIVE_INFINITY : v })
                    }}
                    className="w-full px-4 py-3 bg-card text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isFinite(priceRange.max) ? `+${((priceRange.max - currentPrice) / currentPrice * 100).toFixed(2)}% from current` : '∞'}
                  </p>
                </div>
              </div>

              {/* Range Status */}
              <div className={`p-3 rounded-lg ${isInRange ? 'bg-green-500/10 border border-green-400/30' : 'bg-red-500/10 border border-red-400/30'}`}>
                <div className="flex items-center space-x-2">
                  {isInRange ? (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-300 font-medium">{t('position.inRange')}</span>
                    </>
                  ) : (
                    <>
                      <FiAlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-300 font-medium">{t('position.outOfRange')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Range Buttons */}
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => setPriceRange({ min: currentPrice * 0.95, max: currentPrice * 1.05 })}
                  className="flex-1 py-2 px-3 bg-card hover:bg-accent/40 border border-border rounded-lg text-sm transition-colors text-foreground"
                >
                  Narrow (±5%)
                </button>
                <button
                  onClick={() => setPriceRange({ min: currentPrice * 0.9, max: currentPrice * 1.1 })}
                  className="flex-1 py-2 px-3 bg-card hover:bg-accent/40 border border-border rounded-lg text-sm transition-colors text-foreground"
                >
                  Normal (±10%)
                </button>
                <button
                  onClick={() => setPriceRange({ min: currentPrice * 0.8, max: currentPrice * 1.2 })}
                  className="flex-1 py-2 px-3 bg-card hover:bg-accent/40 border border-border rounded-lg text-sm transition-colors text-foreground"
                >
                  Wide (±20%)
                </button>
                <button
                  onClick={() => setPriceRange({ min: currentPrice * 0.5, max: currentPrice * 1.5 })}
                  className="flex-1 py-2 px-3 bg-card hover:bg-accent/40 border border-border rounded-lg text-sm transition-colors text-foreground"
                >
                  Full (±50%)
                </button>
              </div>
            </div>

            {/* Step 2: Deposit Amount (USD) */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center text-foreground">
                <span className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold mr-2">
                  2
                </span>
                Deposit Amount (USD)
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    USD amount
                  </label>
                  <input
                    type="number"
                    value={amountUSD}
                    onChange={(e) => setAmountUSD(e.target.value)}
                    className="w-full px-4 py-3 bg-card text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Allocation preview */}
                <div className="bg-card border border-border rounded-lg p-4 text-sm text-muted-foreground">
                  {isStableQuote ? (
                    <>
                      <div className="mb-2 text-foreground text-base font-medium">
                        Allocation at current price:
                      </div>
                      <div className="text-foreground text-base">{token0Symbol}: <span className="font-semibold">{token0Allocated.toFixed(6)}</span></div>
                      <div className="text-foreground text-base">{token1Symbol}: <span className="font-semibold">${token1Allocated.toFixed(2)}</span></div>
                    </>
                  ) : (
                    <div>
                      Non-stable quote pair. USD allocation preview is approximate.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Estimated Returns */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-amber-300/10 rounded-lg p-4 border border-amber-300/20">
              <h4 className="font-semibold mb-3 flex items-center text-foreground">
                <FiTrendingUp className="w-4 h-4 mr-2 text-yellow-400" />
                Estimated returns
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('position.estimatedAPR')}</p>
                  <p className="text-2xl font-bold text-green-400">{estimatedAPR()}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Daily income</p>
                  <p className="text-lg font-semibold text-foreground">
                    ~${((usd || 0) * (parseFloat(estimatedAPR()) / 365 / 100)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <FiInfo className="w-5 h-5 text-blue-300 mt-0.5" />
                <div className="text-sm text-foreground">
                  <p className="font-semibold mb-1">How concentrated liquidity works:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Narrower price ranges earn higher fees but require more active management</li>
                    <li>Your position earns fees only when price is within your selected range</li>
                    <li>You can adjust or close your position at any time</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border px-6 py-5 flex justify-between bg-card sticky bottom-0">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-border text-foreground rounded-lg hover:bg-accent/20 transition-colors"
          >
            {t('position.cancel')}
          </button>
          <button
            onClick={handleCreatePosition}
            disabled={loading || !amountUSD || parseFloat(amountUSD) <= 0}
            className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-medium rounded-lg hover:from-yellow-400 hover:to-amber-300 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating...' : t('position.create')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreatePositionModal
