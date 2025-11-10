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
          isActive: true,
          createdAt: true,
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
      isActive: pool.isActive,
      createdAt: pool.createdAt,
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

    // Деактивируем пул вместо удаления
    const pool = await prisma.pool.update({
      where: { id: poolId },
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
