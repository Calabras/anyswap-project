// app/api/pools/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeError } from '@/lib/security/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const poolId = params.id

    if (!poolId) {
      return NextResponse.json(
        { message: 'Pool ID is required' },
        { status: 400 }
      )
    }

    // Get pool from database via Prisma
    const pool = await prisma.pool.findFirst({
      where: { id: poolId, isActive: true },
    })

    if (!pool) {
      return NextResponse.json(
        { message: 'Pool not found' },
        { status: 404 }
      )
    }

    // Fetch last 90 days day data for chart
    const dayData = await prisma.poolDayData.findMany({
      where: { poolId: pool.id },
      orderBy: { date: 'asc' }, // Ascending for proper chart display
      take: 90
    })

    // Get latest day data for 24h metrics
    // ВАЖНО: Берем последний ПОЛНЫЙ день (не сегодняшний неполный)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const recentDayData = await prisma.poolDayData.findMany({
      where: { poolId: pool.id },
      orderBy: { date: 'desc' },
      take: 2
    });
    
    // Выбираем последний ПОЛНЫЙ день (не сегодняшний)
    const latestFullDay = recentDayData.find(d => {
      const dayDate = new Date(d.date);
      return dayDate < todayStart;
    }) || recentDayData[0]; // Fallback на последний доступный день
    
    // ВАЖНО: Используем последний полный день для всех 24h метрик
    // volume24h и fees24h из последнего полного дня poolDayData
    // tvl из pool.tvlUSD (текущее актуальное значение)
    const volume24h = latestFullDay?.volumeUSD || 0; // Последний полный день
    const fees24h = latestFullDay?.feesUSD || 0; // Последний полный день
    const tvl = pool.tvlUSD || 0; // Текущее значение из pool

    // Calculate APR from 24h fees: (fees24h / tvl) * 365 * 100
    // Затем вычитаем 1% для отображения пользователю (если APR >= 1%)
    let apr = tvl > 0 ? (fees24h / tvl) * 365 * 100 : 0;
    if (apr >= 1) {
      apr = apr - 1; // Вычитаем 1% (наша комиссия)
    }

    // Calculate current price from latest day data or use default
    const currentPrice = latestFullDay?.close || 1

    return NextResponse.json(
      {
        pool: {
          id: pool.id,
          poolAddress: pool.address,
          network: pool.network,
          token0: {
            symbol: pool.token0Symbol,
            address: pool.token0Address,
          },
          token1: {
            symbol: pool.token1Symbol,
            address: pool.token1Address,
          },
          feeTier: pool.fee,
          tvl,
          volume24h,
          fees24h,
          apr,
          currentPrice,
          uniswapUrl: `https://app.uniswap.org/explore/pools/${pool.network}/${pool.address}`,
          dayData: dayData.map(d => ({
            date: d.date,
            volumeUSD: d.volumeUSD,
            tvlUSD: d.tvlUSD,
            feesUSD: d.feesUSD,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }))
        },
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    const sanitized = sanitizeError(error)
    return NextResponse.json(
      { message: sanitized.message },
      { status: sanitized.status }
    )
  }
}

