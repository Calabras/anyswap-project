// app/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import PoolCard from '@/components/pools/PoolCard'
import StatsOverview from '@/components/dashboard/StatsOverview'
import CreatePositionModal from '@/components/modals/CreatePositionModal'
import PoolFilters, { FilterState } from '@/components/filters/PoolFilters'
import { Plus, TrendingUp, DollarSign, Activity, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Pool {
  id: string
  address: string
  network: string
  token0Symbol: string
  token1Symbol: string
  token0Address: string
  token1Address: string
  fee: number
  tvlUSD: number
  volumeUSD: number
  apr?: number
}

export default function HomePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [pools, setPools] = useState<Pool[]>([])
  const [filteredPools, setFilteredPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePosition, setShowCreatePosition] = useState(false)
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null)
  const [sortBy, setSortBy] = useState('tvl')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState<FilterState>({
    network: 'all',
    tvlMin: '',
    tvlMax: '',
    feeMin: '',
    feeMax: '',
    aprMin: '',
    aprMax: '',
  })

  useEffect(() => {
    fetchPools()
  }, [filters])

  const fetchPools = async () => {
    try {
      setLoading(true)
      // Build query params from filters
      const params = new URLSearchParams()
      if (filters.network && filters.network !== 'all') {
        params.append('network', filters.network)
      }
      if (filters.tvlMin) params.append('tvlMin', filters.tvlMin)
      if (filters.tvlMax) params.append('tvlMax', filters.tvlMax)
      if (filters.feeMin) params.append('feeMin', filters.feeMin)
      if (filters.feeMax) params.append('feeMax', filters.feeMax)
      if (filters.aprMin) params.append('aprMin', filters.aprMin)
      if (filters.aprMax) params.append('aprMax', filters.aprMax)

      const response = await fetch(`/api/pools?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setPools(data.pools || [])
      } else {
        console.error('Failed to fetch pools:', response.statusText)
        setPools([])
      }
    } catch (error) {
      console.error('Failed to fetch pools:', error)
      setPools([])
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    totalTVL: pools.reduce((acc, pool) => acc + (pool.tvlUSD || 0), 0),
    totalVolume24h: pools.reduce((acc, pool) => acc + (pool.volumeUSD || 0), 0),
    avgAPR: pools.length > 0 ? pools.reduce((acc, pool) => acc + (pool.apr || 0), 0) / pools.length : 0,
    activePositions: pools.length, // Use actual pool count
  }

  const handleCreatePosition = (pool: Pool) => {
    setSelectedPool(pool)
    setShowCreatePosition(true)
  }

  // Применяем фильтры и сортировку
  useEffect(() => {
    let filtered = [...pools]

    // Маппинг сетей из фильтра в формат базы данных
    const networkMap: Record<string, string> = {
      'ARBITRUM': 'arbitrum',
      'ERC20': 'mainnet',
      'BEP20': 'bep20',
      'POLYGON': 'polygon',
      'OPTIMISM': 'optimism',
      'BASE': 'base',
      'UNI': 'mainnet',
      'TRX': 'tron',
      'SOL': 'solana',
    }

    // Применяем все фильтры
    if (filters.network && filters.network !== 'all') {
      const networkValue = networkMap[filters.network] || filters.network.toLowerCase()
      filtered = filtered.filter((pool) => {
        const poolNetwork = pool.network?.toLowerCase()
        return poolNetwork === networkValue || poolNetwork === filters.network.toLowerCase()
      })
    }

    // Фильтр по TVL
    if (filters.tvlMin) {
      const min = parseFloat(filters.tvlMin)
      if (!isNaN(min)) {
        filtered = filtered.filter((pool) => (pool.tvlUSD || 0) >= min)
      }
    }
    if (filters.tvlMax) {
      const max = parseFloat(filters.tvlMax)
      if (!isNaN(max)) {
        filtered = filtered.filter((pool) => (pool.tvlUSD || 0) <= max)
      }
    }

    // Фильтр по Fees (24h fees)
    if (filters.feeMin) {
      const min = parseFloat(filters.feeMin)
      if (!isNaN(min)) {
        filtered = filtered.filter((pool) => {
          const feePct = (pool.fee || 0) / 10000
          const fees24h = (pool.volumeUSD || 0) * feePct
          return fees24h >= min
        })
      }
    }
    if (filters.feeMax) {
      const max = parseFloat(filters.feeMax)
      if (!isNaN(max)) {
        filtered = filtered.filter((pool) => {
          const feePct = (pool.fee || 0) / 10000
          const fees24h = (pool.volumeUSD || 0) * feePct
          return fees24h <= max
        })
      }
    }

    // Фильтр по APR
    if (filters.aprMin) {
      const min = parseFloat(filters.aprMin)
      if (!isNaN(min)) {
        filtered = filtered.filter((pool) => (pool.apr || 0) >= min)
      }
    }
    if (filters.aprMax) {
      const max = parseFloat(filters.aprMax)
      if (!isNaN(max)) {
        filtered = filtered.filter((pool) => (pool.apr || 0) <= max)
      }
    }

    // Сортировка с учетом направления
    const sorted = filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'tvl':
          comparison = (b.tvlUSD || 0) - (a.tvlUSD || 0)
          break
        case 'volume':
          comparison = (b.volumeUSD || 0) - (a.volumeUSD || 0)
          break
        case 'apr':
          comparison = (b.apr || 0) - (a.apr || 0)
          break
        default:
          return 0
      }
      // Если сортировка по возрастанию, инвертируем результат
      return sortOrder === 'asc' ? -comparison : comparison
    })

    setFilteredPools(sorted)
  }, [pools, filters, sortBy, sortOrder])

  const handlePoolClick = (pool: Pool) => {
    router.push(`/pool/${pool.id}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4 glow-text text-left">
          {t('home.title', 'Advanced Liquidity Management')}
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl text-left">
          {t('home.subtitle', 'Manage your Uniswap V3 positions with advanced analytics and one-click optimization')}
        </p>
      </div>

      {/* Stats Overview */}
      <StatsOverview stats={stats} />

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          {/* Advanced Filters Button */}
          <PoolFilters onFiltersChange={setFilters} />
          
          {/* Sort by */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] bg-card text-foreground border-border">
                <SelectValue>
                  {sortBy === 'tvl' && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{t('sort.byTVL', 'Sort by TVL')}</span>
                    </div>
                  )}
                  {sortBy === 'volume' && (
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{t('sort.byVolume', 'Sort by Volume')}</span>
                    </div>
                  )}
                  {sortBy === 'apr' && (
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{t('sort.byAPR', 'Sort by APR')}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tvl">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>{t('sort.byTVL', 'Sort by TVL')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="volume">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span>{t('sort.byVolume', 'Sort by Volume')}</span>
                  </div>
                </SelectItem>
                <SelectItem value="apr">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>{t('sort.byAPR', 'Sort by APR')}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sort Order Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-10 h-10 p-0 bg-card text-foreground border-border"
              title={sortOrder === 'asc' ? t('sort.ascending', 'Ascending') : t('sort.descending', 'Descending')}
            >
              {sortOrder === 'asc' ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        <Button
          onClick={() => setShowCreatePosition(true)}
          className="glow-border"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('actions.createPosition', 'Create Position')}
        </Button>
      </div>

      {/* Pools Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card rounded-xl p-6 animate-pulse border border-border">
              <div className="h-20 bg-muted rounded mb-4"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPools.length > 0 ? (
            filteredPools.map((pool) => (
              <div
                key={pool.id}
                onClick={() => handlePoolClick(pool)}
                className="cursor-pointer"
              >
                <PoolCard
                  pool={pool}
                  onCreatePosition={(e) => {
                    e.stopPropagation()
                    handleCreatePosition(pool)
                  }}
                />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground text-lg">
                {t('pool.noPoolsFound', 'No pools found matching your filters')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Position Modal */}
      {showCreatePosition && (
        <CreatePositionModal
          pool={selectedPool}
          onClose={() => {
            setShowCreatePosition(false)
            setSelectedPool(null)
          }}
        />
      )}
    </div>
  )
}
