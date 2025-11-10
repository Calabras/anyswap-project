// app/api/admin/pools/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import UniswapGraphClient from '@/lib/uniswap/graphql-client';
import { ethers } from 'ethers';

// Конфигурация сетей
const NETWORK_CONFIG = {
  mainnet: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://etherscan.io'
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
    nativeCurrency: 'MATIC',
    explorerUrl: 'https://polygonscan.com'
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://arbiscan.io'
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: `https://opt-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://optimistic.etherscan.io'
  },
  base: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://basescan.org'
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
    nativeCurrency: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io'
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, poolAddress, network = 'mainnet', limit } = body;

    console.log(`🚀 Pool import request: action=${action}, network=${network}, poolAddress=${poolAddress}`);

    // Проверка авторизации (добавьте свою логику)
    // const session = await getServerSession();
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Инициализация клиента для The Graph
    const graphClient = new UniswapGraphClient(
      network,
      process.env.NEXT_PUBLIC_GRAPH_API_KEY
    );

    switch (action) {
      case 'import-single':
        return await importSinglePool(poolAddress, network, graphClient);
      
      case 'import-top':
        return await importTopPools(network, graphClient, limit || 10);
      
      case 'search':
        return await searchPools(body.token0, body.token1, network, graphClient);
      
      case 'update':
        return await updatePoolData(poolAddress, network, graphClient);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Pool import error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Импорт одного пула по адресу
async function importSinglePool(
  poolAddress: string, 
  network: string, 
  graphClient: UniswapGraphClient
) {
  if (!poolAddress || !ethers.utils.isAddress(poolAddress)) {
    return NextResponse.json(
      { success: false, error: 'Invalid pool address' },
      { status: 400 }
    );
  }

  try {
    console.log(`📥 Importing pool ${poolAddress} on ${network}...`);
    
    // Получаем данные пула из The Graph
    const poolData = await graphClient.getPoolByAddress(poolAddress);
    
    if (!poolData) {
      return NextResponse.json(
        { success: false, error: 'Pool not found in The Graph' },
        { status: 404 }
      );
    }

    console.log(`✅ Pool data received: ${poolData.token0.symbol}/${poolData.token1.symbol}`);

    // Сохраняем или обновляем пул в базе данных
    const pool = await prisma.pool.upsert({
      where: {
        address_network: {
          address: poolAddress.toLowerCase(),
          network: network
        }
      },
      update: {
        liquidity: poolData.liquidity,
        sqrtPriceX96: poolData.sqrtPrice,
        tick: parseInt(poolData.tick || '0'),
        volumeUSD: parseFloat(poolData.volumeUSD || '0'),
        tvlUSD: parseFloat(poolData.totalValueLockedUSD || '0'),
        txCount: parseInt(poolData.txCount || '0'),
        updatedAt: new Date()
      },
      create: {
        address: poolAddress.toLowerCase(),
        network: network,
        token0Address: poolData.token0.id,
        token0Symbol: poolData.token0.symbol,
        token0Name: poolData.token0.name,
        token0Decimals: parseInt(poolData.token0.decimals),
        token1Address: poolData.token1.id,
        token1Symbol: poolData.token1.symbol,
        token1Name: poolData.token1.name,
        token1Decimals: parseInt(poolData.token1.decimals),
        fee: parseInt(poolData.feeTier),
        liquidity: poolData.liquidity,
        sqrtPriceX96: poolData.sqrtPrice,
        tick: parseInt(poolData.tick || '0'),
        volumeUSD: parseFloat(poolData.volumeUSD || '0'),
        tvlUSD: parseFloat(poolData.totalValueLockedUSD || '0'),
        txCount: parseInt(poolData.txCount || '0'),
        isActive: true
      }
    });

    console.log(`💾 Pool saved to database: ${pool.id}`);

    // Получаем исторические данные за последние 7 дней
    try {
      const dayData = await graphClient.getPoolDayData(poolAddress, 7);
      
      // Сохраняем исторические данные
      if (dayData && dayData.length > 0) {
        console.log(`📊 Saving ${dayData.length} days of historical data...`);
        
        for (const day of dayData) {
          await prisma.poolDayData.upsert({
            where: {
              poolId_date: {
                poolId: pool.id,
                date: new Date(day.date * 1000)
              }
            },
            update: {
              volumeUSD: parseFloat(day.volumeUSD || '0'),
              tvlUSD: parseFloat(day.tvlUSD || '0'),
              feesUSD: parseFloat(day.feesUSD || '0'),
              txCount: parseInt(day.txCount || '0')
            },
            create: {
              poolId: pool.id,
              date: new Date(day.date * 1000),
              volumeUSD: parseFloat(day.volumeUSD || '0'),
              tvlUSD: parseFloat(day.tvlUSD || '0'),
              feesUSD: parseFloat(day.feesUSD || '0'),
              txCount: parseInt(day.txCount || '0'),
              open: parseFloat(day.open || '0'),
              high: parseFloat(day.high || '0'),
              low: parseFloat(day.low || '0'),
              close: parseFloat(day.close || '0')
            }
          });
        }
        console.log(`✅ Historical data saved`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch historical data:`, error);
      // Продолжаем даже если исторические данные не удалось получить
    }

    return NextResponse.json({
      success: true,
      pool: {
        id: pool.id,
        address: pool.address,
        network: pool.network,
        pair: `${poolData.token0.symbol}/${poolData.token1.symbol}`,
        token0Symbol: poolData.token0.symbol,
        token1Symbol: poolData.token1.symbol,
        fee: poolData.feeTier,
        tvlUSD: poolData.totalValueLockedUSD,
        volumeUSD: poolData.volumeUSD
      }
    });

  } catch (error) {
    console.error('❌ Error importing pool:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to import pool', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Импорт топ пулов
async function importTopPools(
  network: string, 
  graphClient: UniswapGraphClient,
  limit: number = 10
) {
  try {
    console.log(`📥 Importing top ${limit} pools from ${network}...`);
    
    const pools = await graphClient.getTopPools(limit);
    
    if (!pools || pools.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No pools found' },
        { status: 404 }
      );
    }

    console.log(`✅ Received ${pools.length} pools from The Graph`);

    const imported = [];
    const failed = [];

    for (const poolData of pools) {
      try {
        const pool = await prisma.pool.upsert({
          where: {
            address_network: {
              address: poolData.id.toLowerCase(),
              network: network
            }
          },
          update: {
            liquidity: poolData.liquidity,
            sqrtPriceX96: poolData.sqrtPrice,
            volumeUSD: parseFloat(poolData.volumeUSD || '0'),
            tvlUSD: parseFloat(poolData.totalValueLockedUSD || '0'),
            txCount: parseInt(poolData.txCount || '0'),
            updatedAt: new Date()
          },
          create: {
            address: poolData.id.toLowerCase(),
            network: network,
            token0Address: poolData.token0.id,
            token0Symbol: poolData.token0.symbol,
            token0Name: poolData.token0.name,
            token0Decimals: parseInt(poolData.token0.decimals),
            token1Address: poolData.token1.id,
            token1Symbol: poolData.token1.symbol,
            token1Name: poolData.token1.name,
            token1Decimals: parseInt(poolData.token1.decimals),
            fee: parseInt(poolData.feeTier),
            liquidity: poolData.liquidity,
            sqrtPriceX96: poolData.sqrtPrice,
            volumeUSD: parseFloat(poolData.volumeUSD || '0'),
            tvlUSD: parseFloat(poolData.totalValueLockedUSD || '0'),
            txCount: parseInt(poolData.txCount || '0'),
            isActive: true
          }
        });

        imported.push({
          id: pool.id,
          address: pool.address,
          pair: `${poolData.token0.symbol}/${poolData.token1.symbol}`,
          tvlUSD: poolData.totalValueLockedUSD
        });

        console.log(`✅ Imported: ${poolData.token0.symbol}/${poolData.token1.symbol} (${pool.address})`);
      } catch (error) {
        console.error(`❌ Failed to import pool ${poolData.id}:`, error);
        failed.push({
          address: poolData.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`✅ Import complete: ${imported.length} imported, ${failed.length} failed`);

    return NextResponse.json({
      success: true,
      imported: imported.length,
      failed: failed.length,
      pools: imported,
      errors: failed
    });

  } catch (error) {
    console.error('❌ Error importing top pools:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to import top pools', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Поиск пулов
async function searchPools(
  token0: string | undefined,
  token1: string | undefined,
  network: string,
  graphClient: UniswapGraphClient
) {
  try {
    console.log(`🔍 Searching pools: token0=${token0}, token1=${token1}, network=${network}`);
    
    const pools = await graphClient.searchPoolsByTokens(token0, token1);
    
    console.log(`✅ Found ${pools.length} pools`);
    
    return NextResponse.json({
      success: true,
      pools: pools.map((p: any) => ({
        address: p.id,
        pair: `${p.token0.symbol}/${p.token1.symbol}`,
        fee: p.feeTier,
        tvlUSD: p.totalValueLockedUSD,
        volumeUSD: p.volumeUSD
      }))
    });

  } catch (error) {
    console.error('❌ Error searching pools:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to search pools', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Обновление данных пула
async function updatePoolData(
  poolAddress: string,
  network: string,
  graphClient: UniswapGraphClient
) {
  try {
    console.log(`🔄 Updating pool ${poolAddress} on ${network}...`);
    
    const poolData = await graphClient.getPoolByAddress(poolAddress);
    
    if (!poolData) {
      return NextResponse.json(
        { success: false, error: 'Pool not found' },
        { status: 404 }
      );
    }

    const pool = await prisma.pool.update({
      where: {
        address_network: {
          address: poolAddress.toLowerCase(),
          network: network
        }
      },
      data: {
        liquidity: poolData.liquidity,
        sqrtPriceX96: poolData.sqrtPrice,
        tick: parseInt(poolData.tick || '0'),
        volumeUSD: parseFloat(poolData.volumeUSD || '0'),
        tvlUSD: parseFloat(poolData.totalValueLockedUSD || '0'),
        txCount: parseInt(poolData.txCount || '0'),
        updatedAt: new Date()
      }
    });

    console.log(`✅ Pool updated: ${pool.id}`);

    return NextResponse.json({
      success: true,
      pool: {
        id: pool.id,
        address: pool.address,
        tvlUSD: pool.tvlUSD,
        volumeUSD: pool.volumeUSD,
        updatedAt: pool.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Error updating pool:', error);
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

// GET endpoint - получение списка импортированных пулов
export async function GET(request: NextRequest) {
  try {
    const pools = await prisma.pool.findMany({
      where: { isActive: true },
      orderBy: { tvlUSD: 'desc' },
      take: 50
    });

    return NextResponse.json({
      success: true,
      pools: pools.map(p => ({
        id: p.id,
        address: p.address,
        network: p.network,
        pair: `${p.token0Symbol}/${p.token1Symbol}`,
        fee: p.fee,
        tvlUSD: p.tvlUSD,
        volumeUSD: p.volumeUSD,
        liquidity: p.liquidity,
        updatedAt: p.updatedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching pools:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pools' },
      { status: 500 }
    );
  }
}

