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
  bnb: {
    chainId: 56,
    name: 'BNB Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org/',
    nativeCurrency: 'BNB',
    explorerUrl: 'https://bscscan.com'
  },
  solana: {
    chainId: 0, // Solana doesn't use EVM chainId
    name: 'Solana',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    nativeCurrency: 'SOL',
    explorerUrl: 'https://solscan.io'
  },
  unichain: {
    chainId: 130, // Unichain chainId
    name: 'Unichain',
    rpcUrl: 'https://mainnet.unichain.org',
    nativeCurrency: 'UNI',
    explorerUrl: 'https://unichain.info'
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
    console.log(`\n🚀 ========== STARTING POOL IMPORT ==========`);
    console.log(`📥 Importing pool ${poolAddress} on ${network}...`);
    console.log(`🔗 GraphQL endpoint: ${graphClient['client']?.['endpoint'] || 'unknown'}`);
    
    // Получаем данные пула из The Graph
    console.log(`⏳ Fetching pool data from The Graph...`);
    const poolData = await graphClient.getPoolByAddress(poolAddress);
    console.log(`✅ GraphQL request completed`);
    
    if (!poolData) {
      return NextResponse.json(
        { success: false, error: 'Pool not found in The Graph' },
        { status: 404 }
      );
    }

    console.log(`✅ Pool data received: ${poolData.token0.symbol}/${poolData.token1.symbol}`);

    // НОВАЯ ЛОГИКА: Используем рассчитанные данные за последние 24 часа из poolHourData
    // Это дает РЕАЛЬНЫЕ данные за последние 24 часа, а не календарный день
    const calculated = poolData.calculated24h || {
      volumeUSD: 0,
      feesUSD: 0,
      tvlUSD: parseFloat(poolData.totalValueLockedUSD || '0')
    };

    const volume24h = calculated.volumeUSD;
    const fees24h = calculated.feesUSD;
    const tvl = calculated.tvlUSD;

    console.log(`📊 REAL 24H METRICS (from poolHourData):`, {
      volume24h,
      fees24h,
      tvl,
      apr: tvl > 0 ? (fees24h / tvl) * 365 * 100 : 0,
      dataSource: 'poolHourData (last 24 hours)',
      note: 'EXACTLY like Uniswap UI - uses hourly data!'
    });

    // Сохраняем или обновляем пул в базе данных
    console.log(`💾 Saving pool to database:`, {
      address: poolAddress.toLowerCase(),
      network: network,
      pair: `${poolData.token0.symbol}/${poolData.token1.symbol}`,
      volume24h: volume24h,
      fees24h: fees24h,
      tvl: tvl
    });

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
        // РЕАЛЬНЫЙ объем за последние 24 часа из poolHourData
        volumeUSD: volume24h,
        // TVL текущий из pool.totalValueLockedUSD
        tvlUSD: tvl,
        txCount: parseInt(poolData.txCount || '0'),
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        address: poolAddress.toLowerCase(),
        network: network,
        token0Address: poolData.token0.id.toLowerCase(),
        token0Symbol: poolData.token0.symbol,
        token0Name: poolData.token0.name,
        token0Decimals: parseInt(poolData.token0.decimals),
        token1Address: poolData.token1.id.toLowerCase(),
        token1Symbol: poolData.token1.symbol,
        token1Name: poolData.token1.name,
        token1Decimals: parseInt(poolData.token1.decimals),
        fee: parseInt(poolData.feeTier),
        liquidity: poolData.liquidity,
        sqrtPriceX96: poolData.sqrtPrice,
        tick: parseInt(poolData.tick || '0'),
        volumeUSD: volume24h,
        tvlUSD: tvl,
        txCount: parseInt(poolData.txCount || '0'),
        isActive: true
      }
    });

    console.log(`✅ Pool saved to database:`, {
      id: pool.id,
      address: pool.address,
      network: pool.network,
      isActive: pool.isActive,
      volumeUSD: pool.volumeUSD,
      tvlUSD: pool.tvlUSD
    });
    
    // Проверяем, что пул действительно сохранился и активен
    const verifyPool = await prisma.pool.findUnique({
      where: {
        address_network: {
          address: poolAddress.toLowerCase(),
          network: network
        }
      }
    });
    
    if (!verifyPool) {
      console.error(`❌ CRITICAL: Pool was not found after save!`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Pool was saved but could not be verified',
          pool: null
        },
        { status: 500 }
      );
    }
    
    if (!verifyPool.isActive) {
      console.error(`❌ CRITICAL: Pool is not active after save!`, {
        id: verifyPool.id,
        isActive: verifyPool.isActive
      });
    }
    
    console.log(`✅ Verification: Pool exists and isActive=${verifyPool.isActive}`);
    console.log(`🎉 ========== POOL IMPORT COMPLETED ==========\n`);

    // Получаем исторические данные за последние 90 дней для графика
    try {
      const dayData = await graphClient.getPoolDayData(poolAddress, 90);
      
      // Сохраняем исторические данные
      if (dayData && dayData.length > 0) {
        console.log(`📊 Saving ${dayData.length} days of historical data...`);
        
        for (const day of dayData) {
          const dayDate = new Date(day.date * 1000);
          await prisma.poolDayData.upsert({
            where: {
              poolId_date: {
                poolId: pool.id,
                date: dayDate
              }
            },
            update: {
              volumeUSD: parseFloat(day.volumeUSD || '0'),
              tvlUSD: parseFloat(day.tvlUSD || '0'),
              feesUSD: parseFloat(day.feesUSD || '0'),
              txCount: parseInt(day.txCount || '0'),
              open: parseFloat(day.open || day.close || '0'),
              high: parseFloat(day.high || day.close || '0'),
              low: parseFloat(day.low || day.close || '0'),
              close: parseFloat(day.close || '0')
            },
            create: {
              poolId: pool.id,
              date: dayDate,
              volumeUSD: parseFloat(day.volumeUSD || '0'),
              tvlUSD: parseFloat(day.tvlUSD || '0'),
              feesUSD: parseFloat(day.feesUSD || '0'),
              txCount: parseInt(day.txCount || '0'),
              open: parseFloat(day.open || day.close || '0'),
              high: parseFloat(day.high || day.close || '0'),
              low: parseFloat(day.low || day.close || '0'),
              close: parseFloat(day.close || '0')
            }
          });
        }
        console.log(`✅ Historical data saved: ${dayData.length} days`);
      } else {
        console.warn(`⚠️ No historical data returned from The Graph`);
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
        tvlUSD: tvl,  // ИСПРАВЛЕНО: используем рассчитанный TVL
        volumeUSD: volume24h,  // ИСПРАВЛЕНО: используем рассчитанный volume24h
        fees24h: fees24h,
        apr: tvl > 0 ? (fees24h / tvl) * 365 * 100 : 0
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
    console.log(`🔑 API Key present: ${!!process.env.NEXT_PUBLIC_GRAPH_API_KEY}`);
    
    let pools;
    try {
      pools = await graphClient.getTopPools(limit);
      console.log(`✅ GraphQL query successful, received ${pools?.length || 0} pools`);
    } catch (graphError) {
      console.error(`❌ GraphQL error for ${network}:`, graphError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to fetch pools from The Graph: ${graphError instanceof Error ? graphError.message : 'Unknown error'}`,
          details: graphError instanceof Error ? graphError.stack : undefined
        },
        { status: 500 }
      );
    }
    
    if (!pools || pools.length === 0) {
      console.warn(`⚠️ No pools returned from The Graph for ${network}`);
      return NextResponse.json(
        { success: false, error: 'No pools found in The Graph for this network' },
        { status: 404 }
      );
    }

    console.log(`✅ Received ${pools.length} pools from The Graph`);

    const imported = [];
    const failed = [];

    for (const poolData of pools) {
      try {
        const poolAddress = poolData.id.toLowerCase();
        console.log(`📥 Processing pool: ${poolAddress} (${poolData.token0.symbol}/${poolData.token1.symbol})`);
        
        // Получаем 24h объём и fees из дневных данных (последний день)
        let dayVolume = 0;
        let dayFees = 0;
        let currentTvl = parseFloat(poolData.totalValueLockedUSD || '0');
        
        try {
          const dayData = await graphClient.getPoolDayData(poolAddress, 2); // Берем 2 дня для сравнения
          console.log(`📅 Pool ${poolAddress}: Received ${dayData?.length || 0} days of dayData`);
          
          if (dayData && dayData.length > 0) {
            const latestDay = dayData[0]; // Последний день (самый свежий)
            console.log(`📅 Pool ${poolAddress} - Latest day:`, {
              date: new Date(latestDay.date * 1000).toISOString(),
              volumeUSD: latestDay.volumeUSD,
              feesUSD: latestDay.feesUSD,
              tvlUSD: latestDay.tvlUSD
            });
            
            dayVolume = parseFloat(latestDay.volumeUSD || '0');
            dayFees = parseFloat(latestDay.feesUSD || '0');
            // Используем TVL из последнего дня, если доступен
            if (latestDay.tvlUSD && parseFloat(latestDay.tvlUSD) > 0) {
              currentTvl = parseFloat(latestDay.tvlUSD);
            }
            
            // Логируем для сравнения с pool данными
            console.log(`📊 Pool ${poolAddress} - Comparison:`, {
              fromPool: {
                totalValueLockedUSD: poolData.totalValueLockedUSD,
                volumeUSD: poolData.volumeUSD,
                feesUSD: poolData.feesUSD
              },
              fromDayData: {
                volumeUSD: dayVolume,
                feesUSD: dayFees,
                tvlUSD: currentTvl
              }
            });
          } else {
            console.warn(`⚠️ Pool ${poolAddress}: No dayData returned from The Graph`);
          }
        } catch (e) {
          console.error(`❌ Pool ${poolAddress}: Failed to fetch day data:`, e);
          console.error(`   Error details:`, e instanceof Error ? e.stack : e);
        }
        
        console.log(`💰 Pool ${poolAddress} - Final metrics:`, {
          volume24h: dayVolume,
          fees24h: dayFees,
          tvl: currentTvl,
          apr: currentTvl > 0 ? (dayFees / currentTvl) * 365 * 100 : 0
        });
        
        // Check if pool already exists
        const existingPool = await prisma.pool.findUnique({
          where: {
            address_network: {
              address: poolAddress,
              network: network
            }
          }
        });
        
        const pool = await prisma.pool.upsert({
          where: {
            address_network: {
              address: poolAddress,
              network: network
            }
          },
          update: {
            liquidity: poolData.liquidity,
            sqrtPriceX96: poolData.sqrtPrice,
            tick: parseInt(poolData.tick || '0'),
            volumeUSD: dayVolume, // 24h volume
            tvlUSD: currentTvl, // Current TVL
            txCount: parseInt(poolData.txCount || '0'),
            updatedAt: new Date(),
            isActive: true // Ensure it's active
          },
          create: {
            address: poolAddress,
            network: network,
            token0Address: poolData.token0.id.toLowerCase(), // Ensure lowercase
            token0Symbol: poolData.token0.symbol,
            token0Name: poolData.token0.name,
            token0Decimals: parseInt(poolData.token0.decimals),
            token1Address: poolData.token1.id.toLowerCase(), // Ensure lowercase
            token1Symbol: poolData.token1.symbol,
            token1Name: poolData.token1.name,
            token1Decimals: parseInt(poolData.token1.decimals),
            fee: parseInt(poolData.feeTier),
            liquidity: poolData.liquidity,
            sqrtPriceX96: poolData.sqrtPrice,
            tick: parseInt(poolData.tick || '0'),
            volumeUSD: dayVolume, // 24h volume
            tvlUSD: currentTvl, // Current TVL
            txCount: parseInt(poolData.txCount || '0'),
            isActive: true
          }
        });
        
        const action = existingPool ? 'Updated' : 'Created';
        console.log(`✅ Pool ${action}: ${pool.id}, Address: ${pool.address}, Network: ${pool.network}, TVL: $${currentTvl.toLocaleString()}, 24h Volume: $${dayVolume.toLocaleString()}`);

        // Получаем исторические данные за последние 90 дней для графика
        try {
          const dayData = await graphClient.getPoolDayData(poolData.id, 90);
          
          // Сохраняем исторические данные
          if (dayData && dayData.length > 0) {
            console.log(`📊 Saving ${dayData.length} days of historical data for ${poolData.id}...`);
            
            for (const day of dayData) {
              const dayDate = new Date(day.date * 1000);
              await prisma.poolDayData.upsert({
                where: {
                  poolId_date: {
                    poolId: pool.id,
                    date: dayDate
                  }
                },
                update: {
                  volumeUSD: parseFloat(day.volumeUSD || '0'),
                  tvlUSD: parseFloat(day.tvlUSD || '0'),
                  feesUSD: parseFloat(day.feesUSD || '0'),
                  txCount: parseInt(day.txCount || '0'),
                  open: parseFloat(day.open || day.close || '0'),
                  high: parseFloat(day.high || day.close || '0'),
                  low: parseFloat(day.low || day.close || '0'),
                  close: parseFloat(day.close || '0')
                },
                create: {
                  poolId: pool.id,
                  date: dayDate,
                  volumeUSD: parseFloat(day.volumeUSD || '0'),
                  tvlUSD: parseFloat(day.tvlUSD || '0'),
                  feesUSD: parseFloat(day.feesUSD || '0'),
                  txCount: parseInt(day.txCount || '0'),
                  open: parseFloat(day.open || day.close || '0'),
                  high: parseFloat(day.high || day.close || '0'),
                  low: parseFloat(day.low || day.close || '0'),
                  close: parseFloat(day.close || '0')
                }
              });
            }
            console.log(`✅ Historical data saved for ${poolData.id}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch historical data for ${poolData.id}:`, error);
          // Продолжаем даже если исторические данные не удалось получить
        }

        imported.push({
          id: pool.id,
          address: pool.address,
          pair: `${poolData.token0.symbol}/${poolData.token1.symbol}`,
          tvlUSD: currentTvl
        });

        console.log(`✅ Imported/Updated: ${poolData.token0.symbol}/${poolData.token1.symbol} (${pool.address})`);
      } catch (error) {
        console.error(`❌ Failed to import pool ${poolData.id}:`, error);
        console.error(`   Error details:`, error instanceof Error ? error.stack : error);
        failed.push({
          address: poolData.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof Error ? error.stack : undefined
        });
      }
    }

    console.log(`✅ Import complete: ${imported.length} imported, ${failed.length} failed`);
    
    if (imported.length === 0 && failed.length > 0) {
      console.error(`❌ All pools failed to import. First error:`, failed[0]);
    }

    return NextResponse.json({
      success: imported.length > 0,
      imported: imported.length,
      failed: failed.length,
      pools: imported,
      errors: failed,
      message: imported.length > 0 
        ? `Successfully imported ${imported.length} pool(s)` 
        : `Failed to import any pools. Check errors for details.`
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
    // Get pagination parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    const validLimit = [25, 50, 100].includes(limit) ? limit : 50;
    const validPage = page > 0 ? page : 1;
    const validOffset = (validPage - 1) * validLimit;

    // Get total count (active and inactive for debugging)
    const totalCountActive = await prisma.pool.count({
      where: { isActive: true }
    });
    const totalCountAll = await prisma.pool.count({});
    
    console.log(`📊 Database stats: ${totalCountActive} active pools, ${totalCountAll} total pools`);
    
    // Get pools with pagination
    const pools = await prisma.pool.findMany({
      where: { isActive: true },
      orderBy: { tvlUSD: 'desc' },
      take: validLimit,
      skip: validOffset
    });

    const totalPages = Math.ceil(totalCountActive / validLimit);

    console.log(`📊 GET /api/admin/pools/import: Page ${validPage}/${totalPages}, Showing ${pools.length} pools (total: ${totalCountActive})`);
    
    // Group by network for debugging
    const byNetwork = pools.reduce((acc, p) => {
      acc[p.network] = (acc[p.network] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`📊 Pools by network:`, byNetwork);
    
    // Логируем первые несколько пулов для диагностики
    if (pools.length > 0) {
      console.log(`📋 First ${Math.min(3, pools.length)} pools:`, pools.slice(0, 3).map(p => ({
        id: p.id,
        address: p.address,
        network: p.network,
        pair: `${p.token0Symbol}/${p.token1Symbol}`,
        isActive: p.isActive
      })));
    } else {
      console.warn(`⚠️ No pools returned, but totalCountActive=${totalCountActive}`);
    }
    
    // Если пулов нет, проверим все пулы (включая неактивные)
    if (totalCountActive === 0 && totalCountAll > 0) {
      const allPools = await prisma.pool.findMany({
        take: 5,
        select: {
          id: true,
          address: true,
          network: true,
          isActive: true
        }
      });
      console.warn(`⚠️ No active pools found, but ${totalCountAll} total pools exist:`, allPools);
    }

    // Получаем последние дневные данные для каждого пула
    // ВАЖНО: Берем последний ПОЛНЫЙ день (не сегодняшний неполный)
    const poolIds = pools.map(p => p.id);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Получаем последние 2 дня для каждого пула, чтобы выбрать полный день
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

    return NextResponse.json({
      success: true,
      pools: pools.map(p => {
        const latestDay = dayDataMap.get(p.id);
        // ВАЖНО: Используем последний ПОЛНЫЙ день для volume и fees
        // TVL используем текущий из pool (актуальное значение)
        const volume24h = latestDay?.volumeUSD || 0;
        const fees24h = latestDay?.feesUSD || 0;
        const tvl = p.tvlUSD || 0;
        // Рассчитываем APR: (fees24h / tvl) * 365 * 100
        // Затем вычитаем 1% для отображения пользователю (если APR >= 1%)
        let apr = tvl > 0 ? (fees24h / tvl) * 365 * 100 : 0;
        if (apr >= 1) {
          apr = apr - 1; // Вычитаем 1% (наша комиссия)
        }
        
        return {
          id: p.id,
          address: p.address,
          network: p.network,
          pair: `${p.token0Symbol}/${p.token1Symbol}`,
          fee: p.fee,
          tvlUSD: tvl,
          volumeUSD: volume24h,
          fees24h,
          apr,
          liquidity: p.liquidity,
          updatedAt: p.updatedAt
        }
      }),
      pagination: {
        page: validPage,
        limit: validLimit,
        total: totalCountActive, // Исправлено: было totalCount, должно быть totalCountActive
        totalPages,
        hasNextPage: validPage < totalPages,
        hasPrevPage: validPage > 1
      }
    });

  } catch (error) {
    console.error('Error fetching pools:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pools' },
      { status: 500 }
    );
  }
}

