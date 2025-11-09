// components/pools/PoolCard.tsx
'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, DollarSign, Activity, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PoolCardProps {
  pool: {
    id: string
    pool_address?: string
    network?: string
    token0_symbol: string
    token1_symbol: string
    token0_address?: string
    token1_address?: string
    fee_tier: number
    tvl_usd: number
    volume_24h_usd: number
    fees_24h_usd: number
    apr: number
    uniswap_url?: string
  }
  onCreatePosition: (e?: React.MouseEvent) => void
}

const PoolCard: React.FC<PoolCardProps> = ({ pool, onCreatePosition }) => {
  const { t } = useTranslation()

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }

  const formatFee = (fee: number): string => {
    return `${(fee / 10000).toFixed(2)}%`
  }

  // Extract token symbols
  const token0Symbol = pool.token0_symbol || 'TOKEN0'
  const token1Symbol = pool.token1_symbol || 'TOKEN1'
  const feeTier = pool.fee_tier || 0
  const tvl = pool.tvl_usd || 0
  const volume24h = pool.volume_24h_usd || 0
  const fees24h = pool.fees_24h_usd || 0
  const apr = pool.apr || 0

  return (
    <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden group">
      <CardHeader className="p-6 bg-primary/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex -space-x-2">
              <div className="w-10 h-10 bg-card rounded-full flex items-center justify-center border-2 border-border">
                <span className="text-sm font-bold">{token0Symbol[0]}</span>
              </div>
              <div className="w-10 h-10 bg-card rounded-full flex items-center justify-center border-2 border-border">
                <span className="text-sm font-bold">{token1Symbol[0]}</span>
              </div>
            </div>
            <div>
              <CardTitle className="text-lg">
                {token0Symbol}/{token1Symbol}
              </CardTitle>
              <Badge variant="secondary" className="mt-1">
                {formatFee(feeTier)}
              </Badge>
              {pool.network && (
                <Badge variant="outline" className="mt-1 ml-2">
                  {pool.network}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Stats */}
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">{t('pool.tvl')}</span>
          </div>
          <span className="font-semibold text-foreground">{formatNumber(tvl)}</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">{t('pool.volume24h')}</span>
          </div>
          <span className="font-semibold text-foreground">{formatNumber(volume24h)}</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">{t('pool.apr')}</span>
          </div>
          <span className="font-semibold text-green-500">{apr.toFixed(2)}%</span>
        </div>
      </CardContent>

      {/* Actions */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onCreatePosition(e)
          }}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('pool.addLiquidity')}
        </Button>
      </div>
    </Card>
  )
}

export default PoolCard
