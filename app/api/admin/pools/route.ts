// app/api/admin/pools/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - получение списка пулов для админки
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const network = searchParams.get('network');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'tvlUSD';
    const search = searchParams.get('search');

    // Строим условия фильтрации
    const where: any = {};

    if (network && network !== 'all') {
      where.network = network;
    }

    if (search) {
      where.OR = [
        { token0Symbol: { contains: search, mode: 'insensitive' } },
        { token1Symbol: { contains: search, mode: 'insensitive' } },
        { token0Name: { contains: search, mode: 'insensitive' } },
        { token1Name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Определяем сортировку
    const orderBy: any = {};
    switch (sortBy) {
      case 'tvlUSD':
        orderBy.tvlUSD = 'desc';
        break;
      case 'volumeUSD':
        orderBy.volumeUSD = 'desc';
        break;
      case 'updatedAt':
        orderBy.updatedAt = 'desc';
        break;
      default:
        orderBy.tvlUSD = 'desc';
    }

    // Получаем пулы
    const pools = await prisma.pool.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      select: {
        id: true,
        address: true,
        network: true,
        token0Address: true,
        token0Symbol: true,
        token0Name: true,
        token0Decimals: true,
        token1Address: true,
        token1Symbol: true,
        token1Name: true,
        token1Decimals: true,
        fee: true,
        liquidity: true,
        sqrtPriceX96: true,
        tick: true,
        volumeUSD: true,
        tvlUSD: true,
        txCount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Получаем последние дневные данные для каждого пула (берем несколько дней, чтобы выбрать полный день)
    const poolIds = pools.map(p => p.id);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const recentDayData = await prisma.poolDayData.findMany({
      where: {
        poolId: { in: poolIds }
      },
      orderBy: { date: 'desc' }
    });

    // Создаем мапу, выбирая последний ПОЛНЫЙ день (не сегодняшний)
    const dayDataMap = new Map<string, typeof recentDayData[0]>();
    for (const poolId of poolIds) {
      const poolDays = recentDayData.filter(d => d.poolId === poolId);
      // Ищем последний день, который НЕ сегодня (полный день)
      const fullDay = poolDays.find(d => {
        const dayDate = new Date(d.date);
        return dayDate < todayStart;
      });
      // Если есть полный день, используем его, иначе используем последний доступный
      if (fullDay) {
        dayDataMap.set(poolId, fullDay);
      } else if (poolDays.length > 0) {
        // Fallback: используем последний доступный день (может быть неполным)
        dayDataMap.set(poolId, poolDays[0]);
      }
    }

    const total = await prisma.pool.count({ where });

    // Форматируем ответ с использованием poolDayData
    const formattedPools = pools.map(pool => {
      const latestFullDay = dayDataMap.get(pool.id);
      
      // ВАЖНО: Используем последний ПОЛНЫЙ день для volume и fees
      // TVL используем из pool (текущее актуальное значение)
      const volume24h = latestFullDay?.volumeUSD || 0;
      const fees24h = latestFullDay?.feesUSD || 0; // fees24h ТОЛЬКО из poolDayData!
      const tvl = pool.tvlUSD || 0; // Текущее значение из pool, не из dayData!
      
      // Рассчитываем APR: (fees24h / tvl) * 365 * 100
      // Затем вычитаем 1% для отображения пользователю (если APR >= 1%)
      let apr = tvl > 0 ? (fees24h / tvl) * 365 * 100 : 0;
      if (apr >= 1) {
        apr = apr - 1; // Вычитаем 1% (наша комиссия)
      }
      
      // Логируем для первого пула (для отладки)
      if (pool.id === pools[0]?.id) {
        console.log(`📊 API /api/admin/pools - Pool ${pool.address}:`, {
          hasDayData: !!latestFullDay,
          dayDataDate: latestFullDay ? new Date(latestFullDay.date).toISOString() : null,
          fromPool: {
            volumeUSD: pool.volumeUSD,
            tvlUSD: pool.tvlUSD
          },
          fromDayData: {
            volumeUSD: latestFullDay?.volumeUSD,
            feesUSD: latestFullDay?.feesUSD,
            tvlUSD: latestFullDay?.tvlUSD
          },
          final: {
            volume24h,
            fees24h,
            tvl,
            apr
          }
        });
      }
      
      return {
        id: pool.id,
        address: pool.address,
        network: pool.network,
        pair: `${pool.token0Symbol}/${pool.token1Symbol}`,
        token0: {
          address: pool.token0Address,
          symbol: pool.token0Symbol,
          name: pool.token0Name,
          decimals: pool.token0Decimals
        },
        token1: {
          address: pool.token1Address,
          symbol: pool.token1Symbol,
          name: pool.token1Name,
          decimals: pool.token1Decimals
        },
        fee: pool.fee,
        liquidity: pool.liquidity,
        sqrtPriceX96: pool.sqrtPriceX96,
        tick: pool.tick,
        volumeUSD: volume24h,
        tvlUSD: tvl,
        fees24h,
        apr,
        txCount: pool.txCount,
        isActive: pool.isActive,
        createdAt: pool.createdAt,
        updatedAt: pool.updatedAt
      };
    });

    return NextResponse.json({
      success: true,
      pools: formattedPools,
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Error fetching pools:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch pools',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - создание/обновление статуса пула
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { poolId, isActive } = body;

    if (!poolId) {
      return NextResponse.json(
        { success: false, error: 'Pool ID is required' },
        { status: 400 }
      );
    }

    // Проверка авторизации
    // const session = await getServerSession();
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Обновляем статус пула
    const pool = await prisma.pool.update({
      where: { id: poolId },
      data: { isActive: isActive ?? true }
    });

    return NextResponse.json({
      success: true,
      pool: {
        id: pool.id,
        address: pool.address,
        network: pool.network,
        pair: `${pool.token0Symbol}/${pool.token1Symbol}`,
        isActive: pool.isActive
      }
    });

  } catch (error) {
    console.error('Error updating pool:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update pool',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - удаление пула (мягкое удаление - deactivation)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const poolId = searchParams.get('poolId');
    // Support bulk deletion via JSON body: { ids: string[] }
    let ids: string[] | null = null;
    try {
      const body = await request.json();
      if (Array.isArray(body?.ids)) {
        ids = body.ids as string[];
      }
    } catch {
      // ignore if no body
    }

    if (!poolId && (!ids || ids.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Pool ID is required' },
        { status: 400 }
      );
    }

    // Проверка авторизации
    // const session = await getServerSession();
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    if (ids && ids.length > 0) {
      await prisma.pool.updateMany({
        where: { id: { in: ids } },
        data: { isActive: false }
      });
      return NextResponse.json({
        success: true,
        message: 'Pools deactivated successfully',
        count: ids.length
      });
    }

    // Деактивируем один пул вместо удаления
    const pool = await prisma.pool.update({
      where: { id: poolId as string },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Pool deactivated successfully',
      pool: {
        id: pool.id,
        address: pool.address,
        isActive: pool.isActive
      }
    });

  } catch (error) {
    console.error('Error deleting pool:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete pool',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
