// app/api/pools/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Получаем параметры из query string
    const searchParams = request.nextUrl.searchParams;
    const network = searchParams.get('network');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'tvlUSD';
    const search = searchParams.get('search');

    // Строим условия фильтрации
    const where: any = {
      isActive: true
    };

    if (network && network !== 'all') {
      where.network = network;
    }

    if (search) {
      where.OR = [
        { token0Symbol: { contains: search, mode: 'insensitive' } },
        { token1Symbol: { contains: search, mode: 'insensitive' } },
        { token0Name: { contains: search, mode: 'insensitive' } },
        { token1Name: { contains: search, mode: 'insensitive' } }
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
      case 'fee':
        orderBy.fee = 'asc';
        break;
      default:
        orderBy.tvlUSD = 'desc';
    }

    // Получаем пулы
    const [pools, total] = await Promise.all([
      prisma.pool.findMany({
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
          updatedAt: true
        }
      }),
      prisma.pool.count({ where })
    ]);

    // Форматируем ответ
    const formattedPools = pools.map(pool => ({
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
      volumeUSD: pool.volumeUSD,
      tvlUSD: pool.tvlUSD,
      txCount: pool.txCount,
      token0Symbol: pool.token0Symbol,
      token1Symbol: pool.token1Symbol,
      updatedAt: pool.updatedAt
    }));

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

// POST endpoint для создания позиции в пуле
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      poolId,
      amount0,
      amount1,
      tickLower,
      tickUpper,
      userId
    } = body;

    // Проверка авторизации
    // const session = await getServerSession();
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Получаем информацию о пуле
    const pool = await prisma.pool.findUnique({
      where: { id: poolId }
    });

    if (!pool) {
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // Создаем позицию
    const position = await prisma.position.create({
      data: {
        userId: userId || 'temp-user-id', // В production используйте реальный userId из сессии
        poolId,
        tickLower: tickLower || -887272, // MIN_TICK
        tickUpper: tickUpper || 887272,  // MAX_TICK
        liquidity: '0',
        amount0: amount0.toString(),
        amount1: amount1.toString(),
        depositedToken0: amount0.toString(),
        depositedToken1: amount1.toString(),
        status: 'PENDING'
      }
    });

    // Создаем транзакцию
    const transaction = await prisma.transaction.create({
      data: {
        userId: userId || 'temp-user-id',
        positionId: position.id,
        type: 'ADD_LIQUIDITY',
        status: 'PENDING',
        network: pool.network,
        amount: amount0.toString(),
        metadata: {
          poolAddress: pool.address,
          token0Amount: amount0,
          token1Amount: amount1
        }
      }
    });

    return NextResponse.json({
      success: true,
      position: {
        id: position.id,
        poolId: position.poolId,
        amount0: position.amount0,
        amount1: position.amount1,
        status: position.status
      },
      transaction: {
        id: transaction.id,
        status: transaction.status
      }
    });

  } catch (error) {
    console.error('Error creating position:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create position',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}