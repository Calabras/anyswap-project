// app/pools/[id]/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with recharts
const PriceChart = dynamic(() => import('@/components/charts/PriceChart'), {
  ssr: false,
  loading: () => <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart...</div>
})

interface PoolResponse {
  pool: {
    id: string
    poolAddress: string
    network: string
    token0: { symbol: string; address: string }
    token1: { symbol: string; address: string }
    feeTier: number
    tvl: number
    volume24h: number
    fees24h: number
    apr: number
    uniswapUrl: string
    dayData: { date: string; volumeUSD: number; tvlUSD: number; feesUSD: number; close?: number }[]
  }
}

type ChartType = 'volume' | 'tvl' | 'price'

export default function PoolDetailsPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<PoolResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<'1D' | '1W' | '1M' | '1Y'>('1M')
  const [chartType, setChartType] = useState<ChartType>('volume')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/pools/${params.id}`)
        const json = await res.json()
        setData(json)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [params.id])

  const formatUSD = (v: number) =>
    v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${v.toFixed(2)}`

  // Filter data based on time range
  const getFilteredData = () => {
    if (!data?.pool.dayData) return []

    const now = new Date()
    let startDate: Date

    switch (range) {
      case '1D':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '1W':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '1M':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '1Y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    return data.pool.dayData
      .filter(d => new Date(d.date) >= startDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const filteredData = getFilteredData()

  return (
    <div className="min-h-screen bg-background p-6">
      {loading ? (
        <div className="text-center text-muted-foreground">Loading...</div>
      ) : !data ? (
        <div className="text-center text-muted-foreground">Pool not found</div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {data.pool.token0.symbol} / {data.pool.token1.symbol}{' '}
                <span className="text-lg text-muted-foreground">{(data.pool.feeTier / 10000).toFixed(2)}%</span>
              </h1>
              <div className="text-sm text-muted-foreground mt-2">
                <Link href={data.pool.uniswapUrl} className="text-primary hover:underline" target="_blank">
                  View on Uniswap ↗
                </Link>
                <span className="mx-2">•</span>
                <span className="capitalize">{data.pool.network}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-semibold hover:from-yellow-400 hover:to-amber-300 transition-all shadow-lg">
                Create Position
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="text-sm text-muted-foreground mb-2">TVL</div>
              <div className="text-3xl font-bold text-foreground">{formatUSD(data.pool.tvl)}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="text-sm text-muted-foreground mb-2">24h Volume</div>
              <div className="text-3xl font-bold text-foreground">{formatUSD(data.pool.volume24h)}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="text-sm text-muted-foreground mb-2">24h Fees</div>
              <div className="text-3xl font-bold text-foreground">{formatUSD(data.pool.fees24h)}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
              <div className="text-sm text-muted-foreground mb-2">APR</div>
              <div className="text-3xl font-bold text-green-500">{data.pool.apr.toFixed(2)}%</div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType('volume')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    chartType === 'volume'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-foreground hover:bg-accent/80'
                  }`}
                >
                  Volume
                </button>
                <button
                  onClick={() => setChartType('tvl')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    chartType === 'tvl'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-foreground hover:bg-accent/80'
                  }`}
                >
                  TVL
                </button>
                <button
                  onClick={() => setChartType('price')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    chartType === 'price'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent text-foreground hover:bg-accent/80'
                  }`}
                >
                  Price
                </button>
              </div>
              <div className="flex gap-2">
                {(['1D', '1W', '1M', '1Y'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      range === r
                        ? 'bg-accent text-foreground'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <PriceChart data={filteredData} type={chartType} timeRange={range} />
          </div>

          {/* Pool Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pool Info */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Pool Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pool Address</span>
                  <Link
                    href={`https://etherscan.io/address/${data.pool.poolAddress}`}
                    target="_blank"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {data.pool.poolAddress.slice(0, 6)}...{data.pool.poolAddress.slice(-4)}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Network</span>
                  <span className="text-foreground font-medium capitalize">{data.pool.network}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Fee Tier</span>
                  <span className="text-foreground font-medium">{(data.pool.feeTier / 10000).toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {/* Token Info */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Tokens</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{data.pool.token0.symbol}</span>
                  <Link
                    href={`https://etherscan.io/address/${data.pool.token0.address}`}
                    target="_blank"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {data.pool.token0.address.slice(0, 6)}...{data.pool.token0.address.slice(-4)}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{data.pool.token1.symbol}</span>
                  <Link
                    href={`https://etherscan.io/address/${data.pool.token1.address}`}
                    target="_blank"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {data.pool.token1.address.slice(0, 6)}...{data.pool.token1.address.slice(-4)}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
