// components/dashboard/StatsOverview.tsx
'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, DollarSign, Activity, Layers } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface StatsOverviewProps {
  stats: {
    totalTVL: number
    totalVolume24h: number
    avgAPR: number
    activePositions: number
  }
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const { t } = useTranslation()

  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num)) {
      return '$0.00'
    }
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }

  const statCards = [
    {
      label: t('stats.totalTVL', 'Total TVL'),
      value: formatNumber(stats.totalTVL),
      icon: DollarSign,
    },
    {
      label: t('stats.volume24h', '24h Volume'),
      value: formatNumber(stats.totalVolume24h),
      icon: Activity,
    },
    {
      label: t('stats.avgAPR', 'Average APR'),
      value: `${(stats.avgAPR || 0).toFixed(2)}%`,
      icon: TrendingUp,
    },
    {
      label: t('stats.activePositions', 'Active Positions'),
      value: (stats.activePositions || 0).toString(),
      icon: Layers,
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default StatsOverview

