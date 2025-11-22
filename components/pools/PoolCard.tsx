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
    address?: string
    network?: string
    token0Symbol?: string
    token1Symbol?: string
    token0Address?: string
    token1Address?: string
    fee?: number
    tvlUSD?: number
    volumeUSD?: number
    apr?: number
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

  // Normalize props (support old/new shapes)
  const token0Symbol = (pool as any).token0_symbol || pool.token0Symbol || 'TOKEN0'
  const token1Symbol = (pool as any).token1_symbol || pool.token1Symbol || 'TOKEN1'
  const feeTier = (pool as any).fee_tier ?? pool.fee ?? 0
  const tvl = (pool as any).tvl_usd ?? pool.tvlUSD ?? 0
  const volume24h = (pool as any).volume_24h_usd ?? pool.volumeUSD ?? 0
  const feePercent = feeTier / 10000
  // APR: derive if not provided (volume * fee / tvl * 365 * 100)
  const derivedApr =
    tvl > 0 ? ((volume24h || 0) * feePercent / tvl) * 365 * 100 : 0
  const aprRaw = (pool.apr ?? derivedApr)
  // Show 1%pt less for user if apr >= 1, else show original (never negative)
  const apr = aprRaw >= 1 ? (aprRaw - 1) : aprRaw
  const fees24h = volume24h * feePercent

  const token0Icon = pool.token0Address
    ? `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${pool.token0Address}/logo.png`
    : undefined
  const token1Icon = pool.token1Address
    ? `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${pool.token1Address}/logo.png`
    : undefined

  return (
    <Card className="hover:shadow-lg transition-all duration-300 overflow-hidden group">
      <CardHeader className="p-6 bg-primary/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex -space-x-2">
              <div className="w-10 h-10 bg-card rounded-full flex items-center justify-center border-2 border-border overflow-hidden">
                {token0Icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={token0Icon} alt={token0Symbol} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{token0Symbol[0]}</span>
                )}
              </div>
              <div className="w-10 h-10 bg-card rounded-full flex items-center justify-center border-2 border-border overflow-hidden">
                {token1Icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={token1Icon} alt={token1Symbol} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{token1Symbol[0]}</span>
                )}
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
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">24h Fees</span>
          </div>
          <span className="font-semibold text-foreground">{formatNumber(fees24h)}</span>
        </div>
      </CardContent>

      {/* Actions */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={(e) => {
            e.stopPropagation()
            onCreatePosition(e)
          }}
          className="w-full bg-gradient-to-r from-yellow-500 to-amber-400 text-black hover:from-yellow-400 hover:to-amber-300 shadow-[0_8px_24px_rgba(255,193,7,0.3)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('pool.addLiquidity')}
        </Button>
      </div>
    </Card>
  )
}

export default PoolCard
