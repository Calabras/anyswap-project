// app/api/positions/prepare/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool, Position, NonfungiblePositionManager, nearestUsableTick } from '@uniswap/v3-sdk';
import { Token, CurrencyAmount, Percent } from '@uniswap/sdk-core';
import { ethers } from 'ethers';
import JSBI from 'jsbi';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';

// Адрес NonfungiblePositionManager (одинаковый на всех сетях)
const NONFUNGIBLE_POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';

// RPC endpoints
const RPC_URLS: Record<string, string> = {
  mainnet: 'https://eth.llamarpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  polygon: 'https://polygon-rpc.com',
  optimism: 'https://mainnet.optimism.io',
  base: 'https://mainnet.base.org',
};

// Chain IDs
const CHAIN_IDS: Record<string, number> = {
  mainnet: 1,
  arbitrum: 42161,
  polygon: 137,
  optimism: 10,
  base: 8453,
};

/**
 * POST /api/positions/prepare
 *
 * Подготавливает calldata для создания позиции в Uniswap V3
 * БЕЗ использования приватных ключей - возвращает calldata для подписи кошельком
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      poolAddress,
      token0Address,
      token1Address,
      token0Decimals,
      token1Decimals,
      feeTier,
      amount0Desired,  // Желаемое количество token0 (в wei или с decimals)
      amount1Desired,  // Желаемое количество token1
      minPrice,        // Минимальная цена (опционально)
      maxPrice,        // Максимальная цена (опционально)
      isFullRange,     // Full range или custom range
      network = 'mainnet',
      userAddress,     // Адрес пользователя который создает позицию
      slippageTolerance = 0.5, // Slippage tolerance в процентах (по умолчанию 0.5%)
    } = body;

    console.log('🔧 Preparing position creation...', {
      pool: poolAddress,
      network,
      user: userAddress,
      amount0Desired,
      amount1Desired,
      isFullRange
    });

    // Валидация
    if (!poolAddress || !token0Address || !token1Address || !userAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!ethers.utils.isAddress(poolAddress) || !ethers.utils.isAddress(token0Address) ||
        !ethers.utils.isAddress(token1Address) || !ethers.utils.isAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Получаем provider
    const rpcUrl = RPC_URLS[network] || RPC_URLS.mainnet;
    const chainId = CHAIN_IDS[network] || 1;

    const provider = new ethers.providers.JsonRpcProvider({
      url: rpcUrl,
      timeout: 30000,
    }, {
      name: network,
      chainId: chainId,
    });

    // Получаем состояние пула из блокчейна
    const poolContract = new ethers.Contract(
      poolAddress,
      IUniswapV3PoolABI.abi,
      provider
    );

    const [liquidity, slot0] = await Promise.all([
      poolContract.liquidity(),
      poolContract.slot0(),
    ]);

    console.log('📊 Pool state:', {
      sqrtPriceX96: slot0.sqrtPriceX96.toString(),
      tick: slot0.tick,
      liquidity: liquidity.toString()
    });

    // Создаем Token instances для SDK
    const token0 = new Token(chainId, token0Address, token0Decimals);
    const token1 = new Token(chainId, token1Address, token1Decimals);

    // Создаем Pool instance
    const pool = new Pool(
      token0,
      token1,
      feeTier,
      slot0.sqrtPriceX96.toString(),
      liquidity.toString(),
      slot0.tick
    );

    // Рассчитываем tick range
    let tickLower: number;
    let tickUpper: number;
    const tickSpacing = pool.tickSpacing;

    if (isFullRange) {
      // Full range position
      tickLower = nearestUsableTick(-887272, tickSpacing);
      tickUpper = nearestUsableTick(887272, tickSpacing);
      console.log('📏 Using full range:', { tickLower, tickUpper });
    } else {
      // Custom range
      if (!minPrice || !maxPrice) {
        return NextResponse.json(
          { success: false, error: 'Min and max prices required for custom range' },
          { status: 400 }
        );
      }

      tickLower = nearestUsableTick(
        Math.floor(Math.log(minPrice) / Math.log(1.0001)),
        tickSpacing
      );
      tickUpper = nearestUsableTick(
        Math.ceil(Math.log(maxPrice) / Math.log(1.0001)),
        tickSpacing
      );
      console.log('📏 Using custom range:', { tickLower, tickUpper, minPrice, maxPrice });
    }

    // Создаем CurrencyAmount для token0 и token1
    const amount0 = CurrencyAmount.fromRawAmount(
      token0,
      JSBI.BigInt(amount0Desired)
    );
    const amount1 = CurrencyAmount.fromRawAmount(
      token1,
      JSBI.BigInt(amount1Desired)
    );

    // Создаем Position используя Uniswap SDK
    const position = Position.fromAmounts({
      pool,
      tickLower,
      tickUpper,
      amount0: amount0.quotient,
      amount1: amount1.quotient,
      useFullPrecision: true,
    });

    console.log('✅ Position created:', {
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      liquidity: position.liquidity.toString(),
      amount0: position.amount0.toSignificant(6),
      amount1: position.amount1.toSignificant(6)
    });

    // Создаем mint options
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 минут
    const slippagePercent = new Percent(Math.floor(slippageTolerance * 100), 10_000);

    const mintOptions = {
      recipient: userAddress,
      deadline: deadline,
      slippageTolerance: slippagePercent,
      useNative: undefined, // Не используем нативный ETH
    };

    // Генерируем calldata для транзакции
    const { calldata, value } = NonfungiblePositionManager.addCallParameters(
      position,
      mintOptions
    );

    console.log('🚀 Calldata generated:', {
      to: NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
      value: value,
      calldataLength: calldata.length
    });

    // Рассчитываем минимальные amounts с учетом slippage
    const amount0Min = position.amount0.multiply(new Percent(10_000 - Math.floor(slippageTolerance * 100), 10_000));
    const amount1Min = position.amount1.multiply(new Percent(10_000 - Math.floor(slippageTolerance * 100), 10_000));

    return NextResponse.json({
      success: true,
      data: {
        // Данные для транзакции
        to: NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
        calldata: calldata,
        value: value,

        // Информация о позиции
        position: {
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
          liquidity: position.liquidity.toString(),
          amount0: position.amount0.toSignificant(6),
          amount1: position.amount1.toSignificant(6),
          amount0Raw: position.amount0.quotient.toString(),
          amount1Raw: position.amount1.quotient.toString(),
          amount0Min: amount0Min.quotient.toString(),
          amount1Min: amount1Min.quotient.toString(),
        },

        // Дополнительная информация
        priceRange: {
          lower: tickToPrice(position.tickLower),
          upper: tickToPrice(position.tickUpper),
          current: parseFloat(pool.token0Price.toSignificant(6))
        },

        // Параметры
        deadline,
        slippageTolerance,
      }
    });

  } catch (error) {
    console.error('❌ Error preparing position:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to prepare position',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Преобразование tick в price
 */
function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}
