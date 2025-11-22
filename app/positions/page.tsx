// app/positions/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ToastProvider'
import { ArrowLeft, TrendingUp, DollarSign, Activity, X, Coins } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import ConfirmModal from '@/components/modals/ConfirmModal'

interface Position {
  id: string
  positionId: string
  poolId: string
  poolAddress: string
  network: string
  token0Symbol: string
  token1Symbol: string
  feeTier: number
  amountUSD: number
  minPrice: number | null
  maxPrice: number | null
  isFullRange: boolean
  collectedFeesUSD: number
  status: 'active' | 'closed'
  createdAt: string
  updatedAt: string
  closedAt: string | null
  poolTVL: number
  poolAPR: number
}

export default function PositionsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { showToast } = useToast()
  
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [collectingFees, setCollectingFees] = useState<string | null>(null)
  const [closingPosition, setClosingPosition] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }
    fetchPositions()
  }, [isAuthenticated, router])

  const fetchPositions = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      if (!token) {
        router.push('/')
        return
      }

      const response = await fetch('/api/positions/list?status=active', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPositions(data.positions || [])
      } else {
        console.error('Failed to fetch positions')
      }
    } catch (error) {
      console.error('Failed to fetch positions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCollectFees = async (positionId: string) => {
    setCollectingFees(positionId)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch('/api/positions/collect-fees', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ positionId }),
      })

      if (response.ok) {
        const data = await response.json()
        showToast(
          t('position.feesCollected', 'Fees collected: {{amount}}$', { amount: data.feesUSD.toFixed(2) }),
          'success'
        )
        fetchPositions() // Refresh positions
      } else {
        const errorData = await response.json()
        showToast(errorData.message || t('position.collectFeesError', 'Failed to collect fees'), 'error')
      }
    } catch (error) {
      console.error('Failed to collect fees:', error)
      showToast(t('position.collectFeesError', 'Failed to collect fees'), 'error')
    } finally {
      setCollectingFees(null)
    }
  }

  const handleClosePosition = async (positionId: string) => {
    setClosingPosition(positionId)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await fetch('/api/positions/close', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ positionId, collectFees: true }),
      })

      if (response.ok) {
        const data = await response.json()
        showToast(
          t('position.closed', 'Position closed. Returned: {{amount}}$', { amount: data.returnedAmount.toFixed(2) }),
          'success'
        )
        fetchPositions() // Refresh positions
      } else {
        const errorData = await response.json()
        showToast(errorData.message || t('position.closeError', 'Failed to close position'), 'error')
      }
    } catch (error) {
      console.error('Failed to close position:', error)
      showToast(t('position.closeError', 'Failed to close position'), 'error')
    } finally {
      setClosingPosition(null)
    }
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

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('position.backToHome', 'Back to Home')}</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2 glow-text">
            {t('position.myPositions', 'My Positions')}
          </h1>
          <p className="text-muted-foreground">
            {t('position.managePositions', 'Manage your liquidity positions')}
          </p>
        </div>

        {/* Positions List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : positions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Coins className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('position.noPositions', 'No Active Positions')}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t('position.noPositionsDescription', 'You don\'t have any active positions yet. Create your first position to start earning fees.')}
              </p>
              <Button onClick={() => router.push('/')} className="glow-border">
                {t('position.browsePools', 'Browse Pools')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {positions.map((position) => (
              <Card key={position.id} className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 bg-card rounded-full flex items-center justify-center border-2 border-border">
                          <span className="text-xs font-bold">{position.token0Symbol[0]}</span>
                        </div>
                        <div className="w-8 h-8 bg-card rounded-full flex items-center justify-center border-2 border-border">
                          <span className="text-xs font-bold">{position.token1Symbol[0]}</span>
                        </div>
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {position.token0Symbol}/{position.token1Symbol}
                        </CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {formatFee(position.feeTier)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('position.amount', 'Amount')}</span>
                    <span className="font-semibold text-foreground">{formatNumber(position.amountUSD)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('position.collectedFees', 'Collected Fees')}</span>
                    <span className="font-semibold text-green-500">{formatNumber(position.collectedFeesUSD)}</span>
                  </div>

                  {position.isFullRange ? (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center">
                      <span className="text-xs text-primary font-medium">
                        {t('position.fullRange', 'Full Range')}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t('position.minPrice', 'Min Price')}</span>
                        <span>{position.minPrice?.toFixed(4) || '-'}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t('position.maxPrice', 'Max Price')}</span>
                        <span>{position.maxPrice?.toFixed(4) || '-'}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCollectFees(position.id)}
                      disabled={collectingFees === position.id}
                      className="flex-1"
                    >
                      <Coins className="w-4 h-4 mr-2" />
                      {collectingFees === position.id
                        ? t('position.collecting', 'Collecting...')
                        : t('position.collectFees', 'Collect Fees')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmClose({ open: true, id: position.id })}
                      disabled={closingPosition === position.id}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {closingPosition === position.id
                        ? t('position.closing', 'Closing...')
                        : t('position.close', 'Close')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <ConfirmModal
        open={confirmClose.open}
        title={t('position.closeConfirm', 'Close position?')}
        description={t('position.closeConfirmDesc', 'You will withdraw liquidity and collect fees.')}
        confirmText={t('position.close', 'Close')}
        cancelText={t('position.cancel', 'Cancel')}
        variant="danger"
        onCancel={() => setConfirmClose({ open: false, id: null })}
        onConfirm={() => {
          if (confirmClose.id) {
            handleClosePosition(confirmClose.id)
          }
          setConfirmClose({ open: false, id: null })
        }}
      />
    </div>
  )
}

