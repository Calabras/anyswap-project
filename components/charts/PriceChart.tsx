// components/charts/PriceChart.tsx
'use client'

import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format } from 'date-fns'

interface ChartData {
  date: string
  volumeUSD: number
  tvlUSD: number
  feesUSD: number
  close?: number
}

interface PriceChartProps {
  data: ChartData[]
  type: 'volume' | 'tvl' | 'price'
  timeRange: '1D' | '1W' | '1M' | '1Y'
}

const PriceChart: React.FC<PriceChartProps> = ({ data, type, timeRange }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    return data.map((d) => ({
      ...d,
      timestamp: new Date(d.date).getTime(),
      formattedDate: format(new Date(d.date), 'MMM dd'),
    }))
  }, [data])

  const formatYAxis = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground mb-1">{data.formattedDate}</p>
          {type === 'volume' && (
            <>
              <p className="text-lg font-semibold text-foreground">
                Volume: {formatYAxis(data.volumeUSD)}
              </p>
              <p className="text-sm text-muted-foreground">
                Fees: {formatYAxis(data.feesUSD)}
              </p>
            </>
          )}
          {type === 'tvl' && (
            <p className="text-lg font-semibold text-foreground">
              TVL: {formatYAxis(data.tvlUSD)}
            </p>
          )}
          {type === 'price' && data.close !== undefined && (
            <p className="text-lg font-semibold text-foreground">
              Price: ${data.close.toFixed(4)}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      {type === 'volume' ? (
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="formattedDate"
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
            tickFormatter={formatYAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="volumeUSD"
            stroke="#FBBF24"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorVolume)"
          />
        </AreaChart>
      ) : type === 'tvl' ? (
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="formattedDate"
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
            tickFormatter={formatYAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="tvlUSD"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      ) : (
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="formattedDate"
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            style={{ fontSize: '12px' }}
            tickFormatter={(v) => `$${v.toFixed(2)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#8B5CF6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  )
}

export default PriceChart
