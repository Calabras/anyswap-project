// components/modals/CreatePositionModal.tsx
'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiX, FiInfo, FiTrendingUp, FiAlertCircle } from 'react-icons/fi'

interface CreatePositionModalProps {
  pool: any
  onClose: () => void
}

const CreatePositionModal: React.FC<CreatePositionModalProps> = ({ pool, onClose }) => {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [amount0, setAmount0] = useState('')
  const [amount1, setAmount1] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [loading, setLoading] = useState(false)

  const currentPrice = pool?.price || 1850.25
  const [priceRange, setPriceRange] = useState({
    min: currentPrice * 0.9,
    max: currentPrice * 1.1,
  })

  const handleCreatePosition = async () => {
    setLoading(true)
    try {
      // Here you would call your API to create the position
      const response = await fetch('/api/positions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolId: pool?.id,
          amount0,
          amount1,
          minPrice: priceRange.min,
          maxPrice: priceRange.max,
        }),
      })

      if (response.ok) {
        // Success
        onClose()
      }
    } catch (error) {
      console.error('Failed to create position:', error)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {t('position.createNew')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <FiX className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Pool Info */}
          {pool && (
            <div className="bg-amber-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg">
                    {pool.token0.symbol}/{pool.token1.symbol}
                  </span>
                  <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                    {(pool.fee / 10000).toFixed(2)}% fee
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{t('position.currentPrice')}</p>
                  <p className="font-bold">{currentPrice.toFixed(4)} {pool.token1.symbol} per {pool.token0.symbol}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Price Range */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold mr-2">
                  1
                </span>
                {t('position.setPriceRange')}
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('position.minPrice')}
                  </label>
                  <input
                    type="number"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {((priceRange.min - currentPrice) / currentPrice * 100).toFixed(2)}% from current
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('position.maxPrice')}
                  </label>
                  <input
                    type="number"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    +{((priceRange.max - currentPrice) / currentPrice * 100).toFixed(2)}% from current
                  </p>
                </div>
              </div>

              {/* Range Status */}
              <div className={`p-3 rounded-lg ${isInRange ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center space-x-2">
                  {isInRange ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-700 font-medium">{t('position.inRange')}</span>
                    </>
                  ) : (
                    <>
                      <FiAlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-700 font-medium">{t('position.outOfRange')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Range Buttons */}
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => setPriceRange({ min: currentPrice * 0.95, max: currentPrice * 1.05 })}
                  className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                >
                  Narrow (±5%)
                </button>
                <button
                  onClick={() => setPriceRange({ min: currentPrice * 0.9, max: currentPrice * 1.1 })}
                  className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                >
                  Normal (±10%)
                </button>
                <button
                  onClick={() => setPriceRange({ min: currentPrice * 0.8, max: currentPrice * 1.2 })}
                  className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                >
                  Wide (±20%)
                </button>
                <button
                  onClick={() => setPriceRange({ min: currentPrice * 0.5, max: currentPrice * 1.5 })}
                  className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                >
                  Full (±50%)
                </button>
              </div>
            </div>

            {/* Step 2: Deposit Amount */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 font-bold mr-2">
                  2
                </span>
                {t('position.depositAmount')}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {pool?.token0.symbol} Amount
                  </label>
                  <input
                    type="number"
                    value={amount0}
                    onChange={(e) => setAmount0(e.target.value)}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {pool?.token1.symbol} Amount
                  </label>
                  <input
                    type="number"
                    value={amount1}
                    onChange={(e) => setAmount1(e.target.value)}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Estimated Returns */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center">
                <FiTrendingUp className="w-4 h-4 mr-2 text-amber-600" />
                Estimated Returns
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">{t('position.estimatedAPR')}</p>
                  <p className="text-2xl font-bold text-green-600">{estimatedAPR()}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Daily Income</p>
                  <p className="text-lg font-semibold">~${((parseFloat(amount0) || 0) * (parseFloat(estimatedAPR()) / 365 / 100)).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <FiInfo className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
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
        <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('position.cancel')}
          </button>
          <button
            onClick={handleCreatePosition}
            disabled={loading || !amount0 || !amount1}
            className="px-8 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-medium rounded-lg hover:from-amber-500 hover:to-yellow-600 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating...' : t('position.create')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreatePositionModal
