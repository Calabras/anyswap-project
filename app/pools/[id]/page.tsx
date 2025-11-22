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

  const chartPoints = (data?.pool.dayData || []).map(d => ({ x: new Date(d.date).getTime(), y: d.volumeUSD }))

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

          {/* Simple Volume Chart */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-muted-foreground">Volume</div>
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
            <div className="h-48 flex items-end gap-1">
              {chartPoints.map((p, i) => {
                const max = Math.max(...chartPoints.map(v => v.y), 1)
                const h = Math.max(2, (p.y / max) * 180)
                return <div key={i} className="bg-primary/60" style={{ width: 6, height: h }} />
              })}
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


