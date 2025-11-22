// components/filters/PoolFilters.tsx
'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filter, X, Network, Zap, Layers, Coins, Activity } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type NetworkType = 'BEP20' | 'ERC20' | 'UNI' | 'ARBITRUM' | 'TRX' | 'SOL' | 'all'

interface PoolFiltersProps {
  onFiltersChange: (filters: FilterState) => void
}

export interface FilterState {
  network: NetworkType
  tvlMin: string
  tvlMax: string
  feeMin: string
  feeMax: string
  aprMin: string
  aprMax: string
}

// Network icons mapping
const networkIcons: Record<NetworkType, React.ReactNode> = {
  all: <Network className="w-4 h-4" />,
  BEP20: <Zap className="w-4 h-4" />,
  ERC20: <Layers className="w-4 h-4" />,
  UNI: <Coins className="w-4 h-4" />,
  ARBITRUM: <Activity className="w-4 h-4" />,
  TRX: <Zap className="w-4 h-4" />,
  SOL: <Coins className="w-4 h-4" />,
}

export default function PoolFilters({ onFiltersChange }: PoolFiltersProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    network: 'all',
    tvlMin: '',
    tvlMax: '',
    feeMin: '',
    feeMax: '',
    aprMin: '',
    aprMax: '',
  })

  const networks: { value: NetworkType; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: t('filters.allNetworks', 'All Networks'), icon: networkIcons.all },
    { value: 'BEP20', label: 'BEP-20', icon: networkIcons.BEP20 },
    { value: 'ERC20', label: 'ERC-20', icon: networkIcons.ERC20 },
    { value: 'UNI', label: 'UNISWAP', icon: networkIcons.UNI },
    { value: 'ARBITRUM', label: 'ARBITRUM', icon: networkIcons.ARBITRUM },
    { value: 'TRX', label: 'TRX', icon: networkIcons.TRX },
    { value: 'SOL', label: 'SOL', icon: networkIcons.SOL },
  ]

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const resetFilters = () => {
    const resetFilters: FilterState = {
      network: 'all',
      tvlMin: '',
      tvlMax: '',
      feeMin: '',
      feeMax: '',
      aprMin: '',
      aprMax: '',
    }
    setFilters(resetFilters)
    onFiltersChange(resetFilters)
  }

  const hasActiveFilters = 
    filters.network !== 'all' ||
    filters.tvlMin || filters.tvlMax ||
    filters.feeMin || filters.feeMax ||
    filters.aprMin || filters.aprMax

  const selectedNetwork = networks.find(n => n.value === filters.network)

  return (
    <>
      {/* Filters Button - Same size as sort selects */}
      <Button
        variant="outline"
        className="w-[180px] bg-card text-foreground border-border justify-start"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span>{t('filters.title', 'Filters')}</span>
          {hasActiveFilters && (
            <span className="ml-auto w-2 h-2 bg-primary rounded-full"></span>
          )}
        </div>
      </Button>

      {/* Advanced Filters Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                {t('filters.title', 'Filters')}
              </DialogTitle>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>{t('filters.reset', 'Reset')}</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Network Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('filters.network', 'Network')}
              </label>
              <Select
                value={filters.network}
                onValueChange={(value) => handleFilterChange('network', value as NetworkType)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {selectedNetwork && (
                      <div className="flex items-center gap-2">
                        {selectedNetwork.icon}
                        <span>{selectedNetwork.label}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {networks.map((network) => (
                    <SelectItem key={network.value} value={network.value}>
                      <div className="flex items-center gap-2">
                        {network.icon}
                        <span>{network.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* TVL Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                24h TVL Volume ($)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  value={filters.tvlMin}
                  onChange={(e) => handleFilterChange('tvlMin', e.target.value)}
                  placeholder={t('filters.from', 'From')}
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
                <Input
                  type="number"
                  value={filters.tvlMax}
                  onChange={(e) => handleFilterChange('tvlMax', e.target.value)}
                  placeholder={t('filters.to', 'To')}
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
              </div>
            </div>

            {/* Fee Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                24h Fees ($)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  value={filters.feeMin}
                  onChange={(e) => handleFilterChange('feeMin', e.target.value)}
                  placeholder={t('filters.from', 'From')}
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
                <Input
                  type="number"
                  value={filters.feeMax}
                  onChange={(e) => handleFilterChange('feeMax', e.target.value)}
                  placeholder={t('filters.to', 'To')}
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
              </div>
            </div>

            {/* APR Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                APR (%)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  value={filters.aprMin}
                  onChange={(e) => handleFilterChange('aprMin', e.target.value)}
                  placeholder={t('filters.from', 'From')}
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
                <Input
                  type="number"
                  value={filters.aprMax}
                  onChange={(e) => handleFilterChange('aprMax', e.target.value)}
                  placeholder={t('filters.to', 'To')}
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
              </div>
            </div>

            {/* Active Badge */}
            {hasActiveFilters && (
              <div className="flex items-center justify-center pt-2">
                <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                  {t('filters.active', 'Active')}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

