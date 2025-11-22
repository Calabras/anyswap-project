'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Activity, DollarSign, TrendingUp, Plus, Coins, X } from 'lucide-react'
import CreatePositionModal from '@/components/modals/CreatePositionModal'

export default function PoolDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [range, setRange] = useState<'1D' | '1W' | '1M' | '1Y' | 'ALL'>('1M')
  const chartRef = useRef<HTMLDivElement | null>(null)
  const chartInstanceRef = useRef<any>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [userRange, setUserRange] = useState<{ min?: number; max?: number; full?: boolean } | null>(null)
  const [editMin, setEditMin] = useState<string>('')
  const [editMax, setEditMax] = useState<string>('')

  useEffect(() => {
    const fetchPool = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/pools/${params.id}`)
        const json = await res.json()
        setData(json.pool)
      } finally {
        setLoading(false)
      }
    }
    fetchPool()
    const interval = setInterval(fetchPool, 60000)
    return () => clearInterval(interval)
  }, [params.id])

  // Try to fetch user's active position range for this pool
  useEffect(() => {
    const loadUserRange = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
        if (!token) return
        const res = await fetch('/api/positions/list?status=active', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const json = await res.json()
        const pos = (json.positions || []).find((p: any) => p.poolId === params.id)
        if (pos) {
          if (pos.isFullRange) {
            setUserRange({ full: true })
            setEditMin('')
            setEditMax('')
          } else if (pos.minPrice && pos.maxPrice) {
            setUserRange({ min: pos.minPrice, max: pos.maxPrice })
            setEditMin(String(pos.minPrice))
            setEditMax(String(pos.maxPrice))
          }
        }
      } catch {}
    }
    loadUserRange()
  }, [params.id])

  // Filter series by selected range - calculate this before conditional returns
  const series = data && Array.isArray(data.dayData) ? data.dayData : []
  const filtered = (() => {
    switch (range) {
      case '1D': return series.slice(-1)
      case '1W': return series.slice(-7)
      case '1M': return series.slice(-30)
      case '1Y': return series.slice(-365)
      default: return series
    }
  })()

  // Render interactive chart with lightweight-charts if available
  // This must be before conditional returns to follow Rules of Hooks
  useEffect(() => {
    // Only render chart if data is available and we have filtered data
    if (!data || filtered.length === 0) {
      console.log('Chart: No data or empty filtered array', { hasData: !!data, filteredLength: filtered.length })
      // Clean up chart if it exists
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove()
        chartInstanceRef.current = null
      }
      return
    }
    
    let mounted = true
    const render = async () => {
      try {
        // Wait for chart container to be available
        if (!chartRef.current) {
          console.log('Chart: chartRef.current is null, waiting...')
          // Retry after a short delay
          setTimeout(() => {
            if (mounted && chartRef.current) render()
          }, 100)
          return
        }

        const mod: any = await import('lightweight-charts')
        if (!mounted || !chartRef.current) return
        
        console.log('Chart: Rendering with', filtered.length, 'data points')
        
        // dispose old chart completely
        if (chartInstanceRef.current) {
          try {
            chartInstanceRef.current.remove()
          } catch (e) {
            console.warn('Error removing old chart:', e)
          }
          chartInstanceRef.current = null
        }
        
        // Clear container
        if (chartRef.current) {
          chartRef.current.innerHTML = ''
        }
        
        const chart = mod.createChart(chartRef.current, {
          width: chartRef.current.clientWidth,
          height: 400,
          layout: { 
            background: { color: 'transparent' }, 
            textColor: '#cbd5e1' 
          },
          grid: { 
            vertLines: { color: '#1f2937' }, 
            horzLines: { color: '#1f2937' } 
          },
          rightPriceScale: { borderColor: '#334155' },
          leftPriceScale: { borderColor: '#334155', visible: true },
          timeScale: { borderColor: '#334155' },
        })
        
        // candles (OHLC)
        const candles = chart.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        })
        
        // volume histogram on right scale
        const hist = chart.addHistogramSeries({
          color: '#f59e0b',
          priceFormat: { type: 'volume' },
          priceScaleId: 'right',
        })
        
        // inverted price (1/close) на левой шкале
        const invertedLine = chart.addLineSeries({
          color: '#38bdf8',
          lineWidth: 1,
          priceScaleId: 'left',
        })
        
        // Determine price range
        let min = Number.NEGATIVE_INFINITY
        let max = Number.POSITIVE_INFINITY
        
        // Check user range from state
        if (userRange) {
          if (userRange.full) {
            min = Number.NEGATIVE_INFINITY
            max = Number.POSITIVE_INFINITY
          } else {
            if (Number.isFinite(userRange.min as number)) min = userRange.min as number
            if (Number.isFinite(userRange.max as number)) max = userRange.max as number
          }
        } else {
          // Check localStorage
          try {
            const key = `lastPositionRange:${params.id}`
            const saved = localStorage.getItem(key)
            if (saved) {
              const parsed = JSON.parse(saved)
              if (Number.isFinite(parsed.min) && parsed.min !== Number.NEGATIVE_INFINITY) min = parsed.min
              if (Number.isFinite(parsed.max) && parsed.max !== Number.POSITIVE_INFINITY) max = parsed.max
            }
          } catch {}
        }
        
        // Process candle data
        const candlePoints = filtered
          .filter((d: any) => d.date) // Filter out invalid dates
          .map((d: any) => {
            const dateObj = d.date instanceof Date ? d.date : new Date(d.date)
            const time = Math.floor(dateObj.getTime() / 1000)
            if (isNaN(time)) return null
            
            const open = Number(d.open || d.close || 0)
            const high = Number(d.high || d.close || 0)
            const low = Number(d.low || d.close || 0)
            const close = Number(d.close || 0)
            
            if (open === 0 && high === 0 && low === 0 && close === 0) return null
            
            const inRange =
              (close >= (isFinite(min) ? min : Number.NEGATIVE_INFINITY)) &&
              (close <= (isFinite(max) ? max : Number.POSITIVE_INFINITY))
            
            const inColor = '#fde047' // жёлтый
            const outColor = '#475569' // slate-600
            
            return {
              time: time as any,
              open,
              high,
              low,
              close,
              color: inRange ? inColor : outColor,
              borderColor: inRange ? inColor : outColor,
              wickColor: inRange ? inColor : outColor,
            }
          })
          .filter((p: any) => p !== null)
        
        // Process volume data
        const coloredVolumes = filtered
          .filter((d: any) => d.date)
          .map((d: any) => {
            const dateObj = d.date instanceof Date ? d.date : new Date(d.date)
            const time = Math.floor(dateObj.getTime() / 1000)
            if (isNaN(time)) return null
            
            const close = Number(d.close || 0)
            const volume = Number(d.volumeUSD || 0)
            
            if (volume === 0) return null
            
            const inRange =
              (close >= (isFinite(min) ? min : Number.NEGATIVE_INFINITY)) &&
              (close <= (isFinite(max) ? max : Number.POSITIVE_INFINITY))
            
            return {
              time: time as any,
              value: volume,
              color: inRange ? '#f59e0b' : '#64748b',
            }
          })
          .filter((p: any) => p !== null)
        
        // Process inverse price line
        const inversePoints = filtered
          .filter((d: any) => d.date)
          .map((d: any) => {
            const dateObj = d.date instanceof Date ? d.date : new Date(d.date)
            const time = Math.floor(dateObj.getTime() / 1000)
            if (isNaN(time)) return null
            
            const close = Number(d.close || 0)
            if (close === 0) return null
            
            return {
              time: time as any,
              value: 1 / close,
            }
          })
          .filter((p: any) => p !== null)
        
        console.log('Chart: Setting data', { 
          candles: candlePoints.length, 
          volumes: coloredVolumes.length, 
          inverse: inversePoints.length 
        })
        
        if (candlePoints.length > 0) {
          candles.setData(candlePoints)
        }
        if (coloredVolumes.length > 0) {
          hist.setData(coloredVolumes)
        }
        if (inversePoints.length > 0) {
          invertedLine.setData(inversePoints)
        }
        
        // Add Min/Max price lines if range is set
        if (isFinite(min) && min !== Number.NEGATIVE_INFINITY) {
          chart.createPriceLine({
            price: min,
            color: '#fde047',
            lineWidth: 2,
            lineStyle: 2, // dashed
            axisLabelVisible: true,
            title: 'Min',
          })
        }
        if (isFinite(max) && max !== Number.POSITIVE_INFINITY) {
          chart.createPriceLine({
            price: max,
            color: '#fde047',
            lineWidth: 2,
            lineStyle: 2, // dashed
            axisLabelVisible: true,
            title: 'Max',
          })
        }
        
        chart.timeScale().fitContent()
        
        // Tooltip
        if (chartRef.current && !tooltipRef.current) {
          const node = document.createElement('div')
          node.style.position = 'absolute'
          node.style.pointerEvents = 'none'
          node.style.zIndex = '10'
          node.style.background = 'rgba(17,24,39,0.9)'
          node.style.border = '1px solid #334155'
          node.style.borderRadius = '6px'
          node.style.padding = '6px 8px'
          node.style.color = '#e5e7eb'
          node.style.fontSize = '12px'
          node.style.display = 'none'
          chartRef.current.appendChild(node)
          tooltipRef.current = node
        }
        
        chart.subscribeCrosshairMove((param: any) => {
          if (!tooltipRef.current || !param.time || !param.point) {
            if (tooltipRef.current) tooltipRef.current.style.display = 'none'
            return
          }
          const t = new Date((param.time as number) * 1000)
          const candle = param.seriesData.get(candles)
          const volume = param.seriesData.get(hist)
          const inv = param.seriesData.get(invertedLine)
          let html = `<div>${t.toLocaleDateString()}</div>`
          if (candle) {
            html += `<div>O: ${candle.open} H: ${candle.high} L: ${candle.low} C: ${candle.close}</div>`
          }
          if (volume) {
            html += `<div>Vol: $${Number(volume.value).toLocaleString()}</div>`
          }
          if (inv) {
            html += `<div>Inv: ${Number(inv.value).toFixed(6)}</div>`
          }
          if (tooltipRef.current) {
            tooltipRef.current.innerHTML = html
            tooltipRef.current.style.left = `${param.point.x + 12}px`
            tooltipRef.current.style.top = `${param.point.y + 12}px`
            tooltipRef.current.style.display = 'block'
          }
        })
        
        chartInstanceRef.current = chart
        console.log('Chart: Rendered successfully')
      } catch (e) {
        console.error('Chart rendering error:', e)
      }
    }
    
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      render()
    }, 100)
    
    return () => {
      mounted = false
      clearTimeout(timeoutId)
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove()
        chartInstanceRef.current = null
      }
    }
  }, [filtered, data, userRange, params.id])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Pool not found
      </div>
    )
  }

  const feePct = (data.feeTier || 0) / 10000

  return (
    <div className="space-y-6">
      <button
        className="text-muted-foreground hover:text-foreground flex items-center gap-2"
        onClick={() => router.push('/')}
      >
        <ArrowLeft className="w-4 h-4" /> Back to pools
      </button>

      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold text-foreground">
          {data.token0.symbol} / {data.token1.symbol}{' '}
          <span className="text-sm text-muted-foreground ml-2">
            {(data.feeTier / 10000).toFixed(2)}%
          </span>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-400 text-black"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4 inline mr-2" /> Create Position
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> TVL
          </div>
          <div className="text-xl font-semibold text-foreground mt-1">${(data.tvl || 0).toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Activity className="w-4 h-4" /> 24h Volume
          </div>
          <div className="text-xl font-semibold text-foreground mt-1">${(data.volume24h || 0).toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> 24h Fees
          </div>
          <div className="text-xl font-semibold text-foreground mt-1">${(data.fees24h || 0).toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">APR</div>
          <div className="text-xl font-semibold text-green-500 mt-1">
            {((data.apr || 0)).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Controls for range */}
      <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {userRange?.full
              ? 'Active position: Full range'
              : userRange?.min !== undefined && userRange?.max !== undefined
              ? `Active position: Min ${userRange.min} — Max ${userRange.max}`
              : 'No active position found'}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={editMin}
              onChange={(e) => setEditMin(e.target.value)}
              className="px-2 py-1 bg-background border border-border rounded text-sm w-32 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
            <input
              type="number"
              placeholder="Max"
              value={editMax}
              onChange={(e) => setEditMax(e.target.value)}
              className="px-2 py-1 bg-background border border-border rounded text-sm w-32 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
            />
            <button
              className="px-3 py-1.5 rounded bg-primary/20 text-primary text-sm"
              onClick={() => {
                const min = parseFloat(editMin)
                const max = parseFloat(editMax)
                if (!isNaN(min) && !isNaN(max)) {
                  setUserRange({ min, max })
                  try {
                    localStorage.setItem(
                      `lastPositionRange:${params.id}`,
                      JSON.stringify({ min, max })
                    )
                  } catch {}
                }
              }}
            >
              Apply
            </button>
            <button
              className="px-3 py-1.5 rounded bg-accent/40 text-foreground text-sm"
              onClick={() => {
                setUserRange({ full: true })
                setEditMin('')
                setEditMax('')
                try {
                  localStorage.removeItem(`lastPositionRange:${params.id}`)
                } catch {}
                // Force chart re-render by updating range state
                setRange(prev => prev === '1M' ? '1W' : '1M')
                setTimeout(() => setRange('1M'), 50)
              }}
            >
              Full range
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted-foreground">Price & Volume Chart</div>
          <div className="flex gap-1">
            {(['1D', '1W', '1M', '1Y', 'ALL'] as const).map(r => (
              <button
                key={r}
                className={`px-2 py-1 rounded-full text-xs ${range === r ? 'bg-primary/20 text-primary' : 'bg-accent/30 text-foreground'}`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        {/* Interactive chart (falls back to nothing if lib not installed) */}
        {filtered.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">No chart data available</p>
              <p className="text-sm">Historical data will appear here once the pool is synced with Uniswap.</p>
            </div>
          </div>
        ) : (
          <div ref={chartRef} className="w-full" style={{ minHeight: '400px' }} />
        )}
      </div>

      {/* Links */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-lg font-semibold text-foreground mb-3">Links</div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-foreground">{data.token0.symbol} / {data.token1.symbol}</div>
            <a className="text-primary hover:underline" href={data.uniswapUrl} target="_blank">Open in Uniswap</a>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground">{data.token0.symbol}</div>
            <code className="bg-accent/30 px-2 py-1 rounded">{data.token0.address}</code>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground">{data.token1.symbol}</div>
            <code className="bg-accent/30 px-2 py-1 rounded">{data.token1.address}</code>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreatePositionModal pool={{
          id: params.id as string,
          token0: { symbol: data.token0.symbol },
          token1: { symbol: data.token1.symbol },
          fee: data.feeTier,
          apr: data.apr
        }} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}


