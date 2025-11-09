// app/pool/[id]/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Activity, Info } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

interface Pool {
  id: string
  poolAddress: string
  network: string
  token0: {
    symbol: string
    address: string
  }
  token1: {
    symbol: string
    address: string
  }
  feeTier: number
  tvl: number
  volume24h: number
  fees24h: number
  apr: number
  currentPrice: number
  uniswapUrl?: string
}

export default function PoolPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { isAuthenticated } = useAuthStore()
  
  const [pool, setPool] = useState<Pool | null>(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState<string>('')
  const [priceRange, setPriceRange] = useState({ min: '', max: '', isFullRange: false })
  const [estimatedAPR, setEstimatedAPR] = useState<number>(0)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchPool()
  }, [params.id])

  const fetchPool = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/pools/${params.id}`)
      
      if (response.ok) {
        const data = await response.json()
        setPool(data.pool)
      } else {
        const errorData = await response.json()
        showToast(errorData.message || 'Failed to fetch pool', 'error')
      }
    } catch (error) {
      console.error('Failed to fetch pool:', error)
      showToast('Failed to fetch pool', 'error')
    } finally {
      setLoading(false)
    }
  }

  const calculateEstimatedAPR = () => {
    if (!pool || !amount || parseFloat(amount) <= 0) {
      setEstimatedAPR(0)
      return
    }

    // Calculate APR based on price range
    // Narrower ranges earn higher fees (concentrated liquidity)
    const baseAPR = pool.apr
    
    if (priceRange.isFullRange) {
      // Full range gets base APR
      setEstimatedAPR(baseAPR)
    } else if (priceRange.min && priceRange.max) {
      // Calculate range width
      const minPrice = parseFloat(priceRange.min)
      const maxPrice = parseFloat(priceRange.max)
      const rangeWidth = (maxPrice - minPrice) / pool.currentPrice
      
      // Narrower range = higher APR multiplier
      // Range width of 0.1 (10%) = 2x multiplier, 0.5 (50%) = 1.2x, 1.0 (100%) = 1x
      const multiplier = rangeWidth < 0.1 ? 2.0 : rangeWidth < 0.5 ? 1.5 : rangeWidth < 1.0 ? 1.2 : 1.0
      setEstimatedAPR(baseAPR * multiplier)
    } else {
      setEstimatedAPR(baseAPR)
    }
  }

  useEffect(() => {
    calculateEstimatedAPR()
  }, [amount, priceRange, pool])

  const handleCreatePosition = async () => {
    if (!pool || !amount || parseFloat(amount) <= 0) {
      showToast(t('position.enterAmount', 'Enter a valid amount'), 'error')
      return
    }

    if (!priceRange.isFullRange && (!priceRange.min || !priceRange.max)) {
      showToast(t('position.setPriceRange', 'Set price range'), 'error')
      return
    }

    if (!isAuthenticated) {
      showToast(t('auth.pleaseLogin', 'Please login first'), 'error')
      return
    }

    setIsCreating(true)

    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        showToast(t('auth.pleaseLogin', 'Please login first'), 'error')
        return
      }

      const response = await fetch('/api/positions/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poolId: pool.id,
          amountUSD: parseFloat(amount),
          minPrice: priceRange.min ? parseFloat(priceRange.min) : undefined,
          maxPrice: priceRange.max ? parseFloat(priceRange.max) : undefined,
          isFullRange: priceRange.isFullRange,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        showToast(t('position.created', 'Position created successfully'), 'success')
        
        // Redirect to positions page
        setTimeout(() => {
          router.push('/positions')
        }, 1500)
      } else {
        const errorData = await response.json()
        showToast(errorData.message || t('position.createError', 'Failed to create position'), 'error')
      }
    } catch (error) {
      console.error('Failed to create position:', error)
      showToast(t('position.createError', 'Failed to create position'), 'error')
    } finally {
      setIsCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!pool) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <p className="text-muted-foreground">{t('pool.notFound', 'Pool not found')}</p>
        </div>
      </div>
    )
  }

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }

  const formatFee = (fee: number): string => {
    return `${(fee / 10000).toFixed(2)}%`
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('pool.backToPools', 'Back to Pools')}</span>
          </Link>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex -space-x-2">
              <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center border-2 border-border">
                <span className="text-lg font-bold text-foreground">{pool.token0.symbol[0]}</span>
              </div>
              <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center border-2 border-border">
                <span className="text-lg font-bold text-foreground">{pool.token1.symbol[0]}</span>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground glow-text">
                {pool.token0.symbol}/{pool.token1.symbol}
              </h1>
              <span className="text-sm text-primary bg-primary/10 px-2 py-1 rounded">
                {formatFee(pool.feeTier)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pool Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pool Stats */}
            <Card>
              <CardHeader>
                <CardTitle>{t('pool.info', 'Pool Information')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{t('pool.tvl', 'TVL')}</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">{formatNumber(pool.tvl)}</p>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Activity className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{t('pool.volume24h', '24h Volume')}</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">{formatNumber(pool.volume24h)}</p>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{t('pool.apr', 'APR')}</span>
                    </div>
                    <p className="text-lg font-semibold text-green-500">{pool.apr.toFixed(2)}%</p>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{t('pool.currentPrice', 'Current Price')}</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      {pool.currentPrice.toFixed(4)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Create Position Form */}
            <Card>
              <CardHeader>
                <CardTitle>{t('position.createNew', 'Create New Position')}</CardTitle>
              </CardHeader>
              <CardContent>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сумма вклада (USD)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg"
                />
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Ценовой диапазон
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={priceRange.isFullRange}
                      onChange={(e) => setPriceRange({ ...priceRange, isFullRange: e.target.checked })}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-600">Полный диапазон</span>
                  </label>
                </div>

                {!priceRange.isFullRange && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Минимальная цена</label>
                      <input
                        type="number"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                        placeholder="От"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Максимальная цена</label>
                      <input
                        type="number"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                        placeholder="До"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

                {priceRange.isFullRange && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Info className="w-5 h-5 text-primary mt-0.5" />
                      <div className="text-sm text-gray-700">
                        <p className="font-medium mb-1">Полный ценовой диапазон</p>
                        <p className="text-gray-600">
                          Ваша позиция будет активна во всем ценовом диапазоне. Комиссии начисляются постоянно.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Estimated Returns */}
              {amount && parseFloat(amount) > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Ожидаемая доходность</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Ожидаемый APR:</span>
                      <span className="font-semibold text-green-600">{estimatedAPR.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Дневной доход:</span>
                      <span className="font-semibold text-gray-900">
                        ~${((parseFloat(amount) * estimatedAPR) / 100 / 365).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleCreatePosition}
                disabled={!amount || parseFloat(amount) <= 0 || isCreating}
                className="w-full py-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-semibold rounded-lg hover:from-amber-500 hover:to-yellow-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isCreating ? 'Создание позиции...' : 'Создать позицию'}
              </button>
            </div>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Как работает концентрированная ликвидность</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>Узкие ценовые диапазоны приносят больше комиссий, но требуют активного управления</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>Ваша позиция зарабатывает комиссии только когда цена находится в выбранном диапазоне</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>Вы можете изменить или закрыть позицию в любое время</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

