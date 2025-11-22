// lib/uniswap/positions-advanced.ts
// Advanced Uniswap V3 SDK integration for real position management

import { Pool, Position, NonfungiblePositionManager, nearestUsableTick } from '@uniswap/v3-sdk'
import { Token, CurrencyAmount, Percent } from '@uniswap/sdk-core'
import { ethers } from 'ethers'
import JSBI from 'jsbi'

// Contract ABIs
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import NonfungiblePositionManagerABI from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json'
import ERC20ABI from '@/lib/abis/ERC20.json'

// Contract addresses
const NONFUNGIBLE_POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'

export interface CreateRealPositionParams {
  poolAddress: string
  token0Address: string
  token1Address: string
  token0Decimals: number
  token1Decimals: number
  feeTier: number
  amountUSD: number
  minPrice?: number
  maxPrice?: number
  isFullRange: boolean
  network: string
  userAddress: string
}

export interface RealPositionData {
  tokenId: string
  token0Amount: string
  token1Amount: string
  liquidity: string
  tickLower: number
  tickUpper: number
  txHash: string
}

/**
 * Get provider for network
 */
function getProvider(network: string): ethers.providers.JsonRpcProvider {
  const rpcUrls: Record<string, string> = {
    mainnet: `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
    polygon: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
    arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
    optimism: `https://opt-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
    base: `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`,
  }

  const rpcUrl = rpcUrls[network] || rpcUrls.mainnet
  return new ethers.providers.JsonRpcProvider(rpcUrl)
}

/**
 * Get chain ID from network name
 */
function getChainId(network: string): number {
  const chainIds: Record<string, number> = {
    mainnet: 1,
    polygon: 137,
    arbitrum: 42161,
    optimism: 10,
    base: 8453,
  }
  return chainIds[network] || 1
}

/**
 * Fetch pool state from blockchain
 */
export async function fetchPoolState(
  poolAddress: string,
  token0Address: string,
  token1Address: string,
  feeTier: number,
  token0Decimals: number,
  token1Decimals: number,
  network: string
): Promise<Pool> {
  const provider = getProvider(network)
  const chainId = getChainId(network)

  // Create pool contract
  const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI.abi,
    provider
  )

  // Fetch pool data
  const [liquidity, slot0] = await Promise.all([
    poolContract.liquidity(),
    poolContract.slot0(),
  ])

  // Create Token instances
  const token0 = new Token(chainId, token0Address, token0Decimals)
  const token1 = new Token(chainId, token1Address, token1Decimals)

  // Create Pool instance
  const pool = new Pool(
    token0,
    token1,
    feeTier,
    slot0.sqrtPriceX96.toString(),
    liquidity.toString(),
    slot0.tick
  )

  return pool
}

/**
 * Calculate position from USD amount
 */
export async function calculatePositionFromUSD(
  pool: Pool,
  amountUSD: number,
  minPrice?: number,
  maxPrice?: number,
  isFullRange: boolean = false
): Promise<{ position: Position; amount0: CurrencyAmount<Token>; amount1: CurrencyAmount<Token> }> {
  // Get price of token0 in USD (simplified - in production fetch from price oracle)
  const token0PriceUSD = 1850 // Example: ETH price
  const currentPrice = parseFloat(pool.token0Price.toSignificant(6))

  // Calculate tick range
  let tickLower: number
  let tickUpper: number
  const tickSpacing = pool.tickSpacing

  if (isFullRange) {
    tickLower = nearestUsableTick(-887272, tickSpacing)
    tickUpper = nearestUsableTick(887272, tickSpacing)
  } else {
    if (!minPrice || !maxPrice) {
      throw new Error('Min and max prices required for non-full-range position')
    }
    tickLower = nearestUsableTick(
      Math.floor(Math.log(minPrice) / Math.log(1.0001)),
      tickSpacing
    )
    tickUpper = nearestUsableTick(
      Math.ceil(Math.log(maxPrice) / Math.log(1.0001)),
      tickSpacing
    )
  }

  // Calculate amounts based on USD
  // Simplified: split 50/50 in USD terms
  const amount0USD = amountUSD / 2
  const amount1USD = amountUSD / 2

  const amount0Raw = Math.floor((amount0USD / token0PriceUSD) * 10 ** pool.token0.decimals)
  const amount1Raw = Math.floor((amount1USD / 1) * 10 ** pool.token1.decimals) // Assume token1 is USD stablecoin

  const amount0 = CurrencyAmount.fromRawAmount(pool.token0, JSBI.BigInt(amount0Raw))
  const amount1 = CurrencyAmount.fromRawAmount(pool.token1, JSBI.BigInt(amount1Raw))

  // Create position
  const position = Position.fromAmounts({
    pool,
    tickLower,
    tickUpper,
    amount0: amount0.quotient,
    amount1: amount1.quotient,
    useFullPrecision: true,
  })

  return { position, amount0, amount1 }
}

/**
 * Create real Uniswap position (SERVER-SIDE ONLY)
 *
 * IMPORTANT: This function should ONLY be called from server-side code
 * with proper security measures. Never expose private keys on client-side.
 *
 * In production, you should use:
 * 1. HSM (Hardware Security Module) for key storage
 * 2. Multi-sig wallets
 * 3. Or custodial wallet services
 */
export async function createRealPosition(
  params: CreateRealPositionParams,
  privateKey: string // Should come from secure vault, not hardcoded
): Promise<RealPositionData> {
  const provider = getProvider(params.network)
  const wallet = new ethers.Wallet(privateKey, provider)
  const chainId = getChainId(params.network)

  console.log('🔐 Creating real Uniswap position...')
  console.log('Pool:', params.poolAddress)
  console.log('User:', params.userAddress)
  console.log('Amount USD:', params.amountUSD)

  // Fetch pool state
  const pool = await fetchPoolState(
    params.poolAddress,
    params.token0Address,
    params.token1Address,
    params.feeTier,
    params.token0Decimals,
    params.token1Decimals,
    params.network
  )

  // Calculate position
  const { position, amount0, amount1 } = await calculatePositionFromUSD(
    pool,
    params.amountUSD,
    params.minPrice,
    params.maxPrice,
    params.isFullRange
  )

  console.log('📊 Position calculated:')
  console.log('Tick Lower:', position.tickLower)
  console.log('Tick Upper:', position.tickUpper)
  console.log('Amount0:', amount0.toSignificant(6))
  console.log('Amount1:', amount1.toSignificant(6))

  // Approve tokens
  const token0Contract = new ethers.Contract(params.token0Address, ERC20ABI, wallet)
  const token1Contract = new ethers.Contract(params.token1Address, ERC20ABI, wallet)

  console.log('✅ Approving tokens...')
  const approve0Tx = await token0Contract.approve(
    NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
    amount0.quotient.toString()
  )
  await approve0Tx.wait()

  const approve1Tx = await token1Contract.approve(
    NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
    amount1.quotient.toString()
  )
  await approve1Tx.wait()

  // Create mint call parameters
  const mintOptions = {
    recipient: params.userAddress,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
    slippageTolerance: new Percent(50, 10_000), // 0.5%
  }

  const { calldata, value } = NonfungiblePositionManager.addCallParameters(position, mintOptions)

  // Execute mint transaction
  console.log('🚀 Minting position...')
  const nfpmContract = new ethers.Contract(
    NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
    NonfungiblePositionManagerABI.abi,
    wallet
  )

  const tx = await wallet.sendTransaction({
    to: NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
    data: calldata,
    value: value,
    gasLimit: 500000,
  })

  console.log('⏳ Waiting for confirmation...')
  const receipt = await tx.wait()
  console.log('✅ Position created! TX:', receipt.transactionHash)

  // Extract tokenId from logs
  const transferEvent = receipt.logs
    .map((log: any) => {
      try {
        return nfpmContract.interface.parseLog(log)
      } catch {
        return null
      }
    })
    .find((parsed: any) => parsed?.name === 'IncreaseLiquidity' || parsed?.name === 'Transfer')

  const tokenId = transferEvent?.args?.tokenId?.toString() || '0'

  return {
    tokenId,
    token0Amount: amount0.toSignificant(6),
    token1Amount: amount1.toSignificant(6),
    liquidity: position.liquidity.toString(),
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    txHash: receipt.transactionHash,
  }
}

/**
 * Collect fees from position
 */
export async function collectRealFees(
  tokenId: string,
  network: string,
  privateKey: string
): Promise<{ amount0: string; amount1: string; txHash: string }> {
  const provider = getProvider(network)
  const wallet = new ethers.Wallet(privateKey, provider)

  const nfpmContract = new ethers.Contract(
    NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
    NonfungiblePositionManagerABI.abi,
    wallet
  )

  // Collect all fees
  const collectTx = await nfpmContract.collect({
    tokenId,
    recipient: wallet.address,
    amount0Max: ethers.constants.MaxUint128,
    amount1Max: ethers.constants.MaxUint128,
  })

  const receipt = await collectTx.wait()

  return {
    amount0: '0', // Parse from logs
    amount1: '0', // Parse from logs
    txHash: receipt.transactionHash,
  }
}

/**
 * Close position (remove all liquidity)
 */
export async function closeRealPosition(
  tokenId: string,
  network: string,
  privateKey: string
): Promise<{ amount0: string; amount1: string; txHash: string }> {
  const provider = getProvider(network)
  const wallet = new ethers.Wallet(privateKey, provider)

  const nfpmContract = new ethers.Contract(
    NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
    NonfungiblePositionManagerABI.abi,
    wallet
  )

  // Get position info
  const position = await nfpmContract.positions(tokenId)
  const liquidity = position.liquidity

  // Decrease liquidity to 0
  const decreaseTx = await nfpmContract.decreaseLiquidity({
    tokenId,
    liquidity,
    amount0Min: 0,
    amount1Min: 0,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
  })

  await decreaseTx.wait()

  // Collect tokens
  const collectTx = await nfpmContract.collect({
    tokenId,
    recipient: wallet.address,
    amount0Max: ethers.constants.MaxUint128,
    amount1Max: ethers.constants.MaxUint128,
  })

  const receipt = await collectTx.wait()

  return {
    amount0: '0', // Parse from logs
    amount1: '0', // Parse from logs
    txHash: receipt.transactionHash,
  }
}
