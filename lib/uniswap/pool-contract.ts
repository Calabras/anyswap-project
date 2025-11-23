// lib/uniswap/pool-contract.ts
import { ethers } from 'ethers';

// Minimal Uniswap V3 Pool ABI - only what we need
const POOL_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)',
  'function liquidity() external view returns (uint128)',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
];

const ERC20_ABI = [
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
  'function balanceOf(address account) external view returns (uint256)',
];

// RPC URLs и chainIds для разных сетей
const NETWORK_CONFIG: Record<string, { rpcUrl: string; chainId: number }> = {
  mainnet: {
    rpcUrl: 'https://eth.llamarpc.com',
    chainId: 1
  },
  arbitrum: {
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    chainId: 42161
  },
  polygon: {
    rpcUrl: 'https://polygon-rpc.com',
    chainId: 137
  },
  optimism: {
    rpcUrl: 'https://mainnet.optimism.io',
    chainId: 10
  },
  base: {
    rpcUrl: 'https://mainnet.base.org',
    chainId: 8453
  },
};

/**
 * Получить РЕАЛЬНЫЙ TVL пула напрямую из блокчейна
 * Это дает самые свежие данные - точно как на Uniswap UI!
 */
export async function getRealPoolTVL(
  poolAddress: string,
  network: string = 'arbitrum'
): Promise<{
  tvlUSD: number;
  token0Balance: string;
  token1Balance: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Price: number;
  token1Price: number;
}> {
  try {
    const networkConfig = NETWORK_CONFIG[network];
    if (!networkConfig) {
      throw new Error(`No RPC config for network: ${network}`);
    }

    // Создаем provider с явным указанием chainId для избежания "could not detect network"
    const provider = new ethers.providers.JsonRpcProvider({
      url: networkConfig.rpcUrl,
      timeout: 30000,
    }, {
      name: network,
      chainId: networkConfig.chainId,
    });

    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);

    // Получаем адреса токенов
    const [token0Address, token1Address] = await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
    ]);

    const token0Contract = new ethers.Contract(token0Address, ERC20_ABI, provider);
    const token1Contract = new ethers.Contract(token1Address, ERC20_ABI, provider);

    // Получаем балансы токенов в пуле + метаданные
    const [
      token0Balance,
      token1Balance,
      token0Decimals,
      token1Decimals,
      token0Symbol,
      token1Symbol,
    ] = await Promise.all([
      token0Contract.balanceOf(poolAddress),
      token1Contract.balanceOf(poolAddress),
      token0Contract.decimals(),
      token1Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.symbol(),
    ]);

    // Форматируем балансы
    const token0BalanceFormatted = ethers.utils.formatUnits(token0Balance, token0Decimals);
    const token1BalanceFormatted = ethers.utils.formatUnits(token1Balance, token1Decimals);

    // Получаем цены токенов из CoinGecko (бесплатный API)
    const prices = await getTokenPrices(token0Symbol, token1Symbol);

    // Рассчитываем TVL
    const token0Value = parseFloat(token0BalanceFormatted) * prices.token0Price;
    const token1Value = parseFloat(token1BalanceFormatted) * prices.token1Price;
    const tvlUSD = token0Value + token1Value;

    console.log(`📊 REAL TVL from blockchain:`, {
      pool: poolAddress,
      network,
      token0: `${token0BalanceFormatted} ${token0Symbol} ($${prices.token0Price})`,
      token1: `${token1BalanceFormatted} ${token1Symbol} ($${prices.token1Price})`,
      token0Value: `$${token0Value.toLocaleString()}`,
      token1Value: `$${token1Value.toLocaleString()}`,
      tvlUSD: `$${tvlUSD.toLocaleString()}`,
      source: 'Blockchain RPC (REAL-TIME)'
    });

    return {
      tvlUSD,
      token0Balance: token0BalanceFormatted,
      token1Balance: token1BalanceFormatted,
      token0Symbol,
      token1Symbol,
      token0Price: prices.token0Price,
      token1Price: prices.token1Price,
    };
  } catch (error) {
    console.error('❌ Error fetching real TVL from blockchain:', error);
    throw error;
  }
}

/**
 * Получить цены токенов из CoinGecko
 */
async function getTokenPrices(
  token0Symbol: string,
  token1Symbol: string
): Promise<{ token0Price: number; token1Price: number }> {
  // Маппинг символов токенов на CoinGecko IDs
  const COINGECKO_IDS: Record<string, string> = {
    WBTC: 'wrapped-bitcoin',
    BTC: 'bitcoin',
    WETH: 'weth',
    ETH: 'ethereum',
    USDC: 'usd-coin',
    USDT: 'tether',
    DAI: 'dai',
    ARB: 'arbitrum',
    MATIC: 'matic-network',
    OP: 'optimism',
    UNI: 'uniswap',
  };

  const token0Id = COINGECKO_IDS[token0Symbol.toUpperCase()] || token0Symbol.toLowerCase();
  const token1Id = COINGECKO_IDS[token1Symbol.toUpperCase()] || token1Symbol.toLowerCase();

  try {
    // CoinGecko API (бесплатный, без ключа, лимит 10-50 запросов/минуту)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${token0Id},${token1Id}&vs_currencies=usd`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    const token0Price = data[token0Id]?.usd || 0;
    const token1Price = data[token1Id]?.usd || 0;

    if (token0Price === 0 || token1Price === 0) {
      console.warn(`⚠️ Could not find prices for ${token0Symbol}/${token1Symbol}, using fallback`);
      // Fallback: если это стейблкоины, используем $1
      const token0Fallback = ['USDC', 'USDT', 'DAI'].includes(token0Symbol.toUpperCase()) ? 1 : 0;
      const token1Fallback = ['USDC', 'USDT', 'DAI'].includes(token1Symbol.toUpperCase()) ? 1 : 0;

      return {
        token0Price: token0Price || token0Fallback,
        token1Price: token1Price || token1Fallback,
      };
    }

    return { token0Price, token1Price };
  } catch (error) {
    console.error('❌ Error fetching token prices from CoinGecko:', error);
    // Fallback prices
    return { token0Price: 0, token1Price: 0 };
  }
}
