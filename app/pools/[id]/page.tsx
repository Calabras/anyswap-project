// app/pools/[id]/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

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
    dayData: { date: string; volumeUSD: number; tvlUSD: number; feesUSD: number }[]
  }
}

export default function PoolDetailsPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<PoolResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<'1D' | '1W' | '1M' | '1Y'>('1M')

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

  const rangeToDays: Record<typeof range, number> = {
    '1D': 1,
    '1W': 7,
    '1M': 30,
    '1Y': 365,
  }

  const filteredDayData = (data?.pool.dayData || []).filter(d => {
    const days = rangeToDays[range]
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return new Date(d.date).getTime() >= cutoff
  })

  const chartPoints = filteredDayData.map(d => ({ x: new Date(d.date).getTime(), y: d.volumeUSD }))
  const pricePoints = filteredDayData.map(d => ({ x: new Date(d.date).getTime(), y: d.close }))

  return (
    <div className="min-h-screen bg-background">
      {loading ? (
        <div className="text-center text-muted-foreground">Loading...</div>
      ) : !data ? (
        <div className="text-center text-muted-foreground">Pool not found</div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {data.pool.token0.symbol} / {data.pool.token1.symbol}{' '}
                <span className="text-sm text-muted-foreground">{(data.pool.feeTier / 10000).toFixed(2)}%</span>
              </h1>
              <div className="text-sm text-muted-foreground mt-1">
                <Link href={data.pool.uniswapUrl} className="text-primary hover:underline" target="_blank">
                  View on Uniswap
                </Link>
                <span className="mx-2">•</span>
                <span>{data.pool.network}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-400 text-black">
                Create Position
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">TVL</div>
              <div className="text-2xl font-bold text-foreground">{formatUSD(data.pool.tvl)}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">24h Volume</div>
              <div className="text-2xl font-bold text-foreground">{formatUSD(data.pool.volume24h)}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">24h Fees</div>
              <div className="text-2xl font-bold text-foreground">{formatUSD(data.pool.fees24h)}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">APR</div>
              <div className="text-2xl font-bold text-green-500">{data.pool.apr.toFixed(2)}%</div>
            </div>
          </div>

          {/* Simple Volume & Price Chart */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Volume</div>
                <div className="text-xs text-muted-foreground">Цена (закрытие) отображается линией</div>
              </div>
              <div className="flex gap-2">
                {(['1D', '1W', '1M', '1Y'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 rounded-full text-xs ${
                      range === r ? 'bg-accent text-foreground' : 'bg-card border border-border text-muted-foreground'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56 relative">
              <div className="absolute inset-0 flex items-end gap-1">
                {chartPoints.map((p, i) => {
                  const max = Math.max(...chartPoints.map(v => v.y), 1)
                  const h = Math.max(2, (p.y / max) * 180)
                  return <div key={i} className="bg-primary/60" style={{ width: 6, height: h }} />
                })}
              </div>
              {pricePoints.length > 1 && (
                <svg className="absolute inset-0" viewBox={`0 0 ${pricePoints.length - 1} 200`} preserveAspectRatio="none">
                  {(() => {
                    const ys = pricePoints.map(p => p.y)
                    const maxY = Math.max(...ys)
                    const minY = Math.min(...ys)
                    const span = maxY - minY || 1
                    const path = pricePoints
                      .map((p, idx) => {
                        const x = idx
                        const y = 200 - ((p.y - minY) / span) * 200
                        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
                      })
                      .join(' ')
                    return <path d={path} fill="none" stroke="#22c55e" strokeWidth="2" />
                  })()}
                </svg>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-lg font-semibold text-foreground mb-3">Links</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{data.pool.token0.symbol} / {data.pool.token1.symbol}</span>
                <Link href={`https://etherscan.io/address/${data.pool.poolAddress}`} target="_blank" className="text-primary hover:underline">
                  {data.pool.poolAddress.slice(0, 6)}...{data.pool.poolAddress.slice(-4)}
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{data.pool.token0.symbol}</span>
                <Link href={`https://etherscan.io/address/${data.pool.token0.address}`} target="_blank" className="text-primary hover:underline">
                  {data.pool.token0.address.slice(0, 6)}...{data.pool.token0.address.slice(-4)}
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{data.pool.token1.symbol}</span>
                <Link href={`https://etherscan.io/address/${data.pool.token1.address}`} target="_blank" className="text-primary hover:underline">
                  {data.pool.token1.address.slice(0, 6)}...{data.pool.token1.address.slice(-4)}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


