// lib/uniswap/positions.ts
// Uniswap V3 SDK integration for position management

import { Pool, Position, NonfungiblePositionManager, nearestUsableTick } from '@uniswap/v3-sdk'
import { Token, CurrencyAmount, Percent } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { ethers } from 'ethers'

import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import ERC20_ABI from '@/lib/web3/erc20-abi'

const DEFAULT_RPC = process.env.UNISWAP_RPC_URL || process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://eth.llamarpc.com'
const NFPM_ADDRESS = process.env.UNISWAP_NFPM_ADDRESS || '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'

function getProvider() {
  return new ethers.providers.JsonRpcProvider(DEFAULT_RPC)
}

function getSigner(provider: ethers.providers.Provider) {
  const pk = process.env.UNISWAP_PRIVATE_KEY
  if (!pk) return null
  try {
    return new ethers.Wallet(pk, provider)
  } catch (e) {
    console.error('Failed to init signer', e)
    return null
  }
}

async function fetchTokenData(provider: ethers.providers.Provider, address: string) {
  const erc20 = new ethers.Contract(address, ERC20_ABI, provider)
  const [symbol, decimals] = await Promise.all([erc20.symbol(), erc20.decimals()])
  return { symbol, decimals: Number(decimals) }
}

async function fetchPoolState(provider: ethers.providers.Provider, poolAddress: string) {
  const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI.abi, provider)
  const [token0Address, token1Address, fee, liquidity, slot0, tickSpacing] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
    poolContract.liquidity(),
    poolContract.slot0(),
    poolContract.tickSpacing(),
  ])

  const [token0Data, token1Data] = await Promise.all([
    fetchTokenData(provider, token0Address),
    fetchTokenData(provider, token1Address),
  ])

  const token0 = new Token(1, token0Address, token0Data.decimals, token0Data.symbol)
  const token1 = new Token(1, token1Address, token1Data.decimals, token1Data.symbol)

  const pool = new Pool(
    token0,
    token1,
    Number(fee),
    slot0.sqrtPriceX96.toString(),
    liquidity.toString(),
    slot0.tick
  )

  return {
    token0,
    token1,
    fee: Number(fee),
    liquidity: liquidity.toString(),
    sqrtPriceX96: slot0.sqrtPriceX96.toString(),
    tick: slot0.tick as number,
    tickSpacing: Number(tickSpacing),
    pool,
  }
}

function priceFromSqrtPrice(
  sqrtPriceX96: JSBI,
  token0Decimals: number,
  token1Decimals: number
) {
  const numerator = JSBI.multiply(sqrtPriceX96, sqrtPriceX96)
  const denominator = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(192))
  const ratio = Number(JSBI.toString(numerator)) / Number(JSBI.toString(denominator))
  const decimalFactor = 10 ** (token0Decimals - token1Decimals)
  return ratio * decimalFactor
}

function withDeadline(minutes = 10) {
  return Math.floor(Date.now() / 1000) + minutes * 60
}

function buildTxResponse(to: string, data: string, value: string, signer: ethers.Signer | null) {
  if (signer) {
    return signer.sendTransaction({ to, data, value })
  }
  return null
}

export interface CreatePositionParams {
  poolAddress: string
  token0Address: string
  token1Address: string
  token0Symbol: string
  token1Symbol: string
  token0Decimals: number
  token1Decimals: number
  feeTier: number
  amountUSD: number
  minPrice?: number
  maxPrice?: number
  isFullRange: boolean
  currentPrice: number
  sqrtPriceX96?: string
  tick?: number
  recipientAddress?: string
}

export interface PositionData {
  positionId?: string
  token0Amount: string
  token1Amount: string
  liquidity: string
  tickLower: number
  tickUpper: number
  priceLower: number
  priceUpper: number
  calldata: string
  value: string
  to: string
  txHash?: string
}

export interface CollectFeesParams {
  positionId: string
  poolAddress: string
  token0Address: string
  token1Address: string
  recipientAddress?: string
}

export interface ClosePositionParams {
  positionId: string
  poolAddress: string
  token0Address: string
  token1Address: string
  collectFees: boolean
  recipientAddress?: string
}

/**
 * Calculate tick from price
 * tick = log(price) / log(1.0001)
 */
export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001))
}

/**
 * Calculate price from tick
 * price = 1.0001^tick
 */
export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick)
}

/**
 * Calculate tick range for price range
 */
export function calculateTickRange(
  minPrice: number,
  maxPrice: number,
  tickSpacing: number = 60
): { tickLower: number; tickUpper: number } {
  const tickLower = Math.floor(priceToTick(minPrice) / tickSpacing) * tickSpacing
  const tickUpper = Math.ceil(priceToTick(maxPrice) / tickSpacing) * tickSpacing
  return { tickLower, tickUpper }
}

/**
 * Calculate full range ticks
 */
export function getFullRangeTicks(tickSpacing: number = 60): { tickLower: number; tickUpper: number } {
  const MIN_TICK = -887272
  const MAX_TICK = 887272
  return {
    tickLower: Math.floor(MIN_TICK / tickSpacing) * tickSpacing,
    tickUpper: Math.ceil(MAX_TICK / tickSpacing) * tickSpacing,
  }
}

/**
 * Create position data structure (simplified for our use case)
 * In production, this would interact with Uniswap contracts via ethers.js
 */
export async function createPositionData(
  params: CreatePositionParams
): Promise<PositionData> {
  const provider = getProvider()
  const signer = getSigner(provider)
  const { amountUSD, minPrice, maxPrice, isFullRange, poolAddress } = params

  const { pool, token0, token1, tickSpacing, sqrtPriceX96 } = await fetchPoolState(provider, poolAddress)

  const currentPriceFromPool = priceFromSqrtPrice(JSBI.BigInt(sqrtPriceX96), token0.decimals, token1.decimals)
  const priceForRange = currentPriceFromPool || params.currentPrice
  const resolvedMinPrice = isFullRange ? undefined : minPrice
  const resolvedMaxPrice = isFullRange ? undefined : maxPrice

  // Calculate tick range using actual spacing
  let tickLower: number
  let tickUpper: number

  if (isFullRange || !resolvedMinPrice || !resolvedMaxPrice || !isFinite(resolvedMinPrice) || !isFinite(resolvedMaxPrice)) {
    const { tickLower: fullLower, tickUpper: fullUpper } = getFullRangeTicks(tickSpacing)
    tickLower = fullLower
    tickUpper = fullUpper
  } else {
    const lowerTick = nearestUsableTick(priceToTick(resolvedMinPrice), tickSpacing)
    const upperTick = nearestUsableTick(priceToTick(resolvedMaxPrice), tickSpacing)
    tickLower = Math.min(lowerTick, upperTick)
    tickUpper = Math.max(lowerTick, upperTick)
  }

  const priceLower = tickToPrice(tickLower)
  const priceUpper = tickToPrice(tickUpper)

  // Assume token1 is the quote asset (stable) when splitting USD
  const usdHalf = amountUSD / 2
  const token0Price = priceForRange || priceLower
  const ten = JSBI.BigInt(10)
  const token0DecimalsFactor = JSBI.exponentiate(ten, JSBI.BigInt(token0.decimals))
  const token1DecimalsFactor = JSBI.exponentiate(ten, JSBI.BigInt(token1.decimals))

  const amount0Raw = JSBI.BigInt(
    Math.max(0, Math.floor((usdHalf / (token0Price || 1)) * Number(token0DecimalsFactor.toString())))
  )
  const amount1Raw = JSBI.BigInt(Math.max(0, Math.floor(usdHalf * Number(token1DecimalsFactor.toString()))))

  const position = Position.fromAmounts({
    pool,
    tickLower,
    tickUpper,
    amount0: amount0Raw,
    amount1: amount1Raw,
    useFullPrecision: true,
  })

  const recipient = params.recipientAddress || (signer ? await signer.getAddress() : undefined)
  if (!recipient) {
    throw new Error('Recipient address required to mint position')
  }

  const { calldata, value } = NonfungiblePositionManager.addCallParameters(position, {
    recipient,
    slippageTolerance: new Percent(50, 10_000),
    deadline: withDeadline(),
  })

  const tx = await buildTxResponse(NFPM_ADDRESS, calldata, value, signer)
  const txHash = tx ? (await tx).hash : undefined

  return {
    positionId: txHash,
    token0Amount: position.amount0.toExact(),
    token1Amount: position.amount1.toExact(),
    liquidity: position.liquidity.toString(),
    tickLower,
    tickUpper,
    priceLower,
    priceUpper,
    calldata,
    value,
    to: NFPM_ADDRESS,
    txHash,
  }
}

/**
 * Collect fees from position
 * In production, this would call Uniswap's collect function
 */
export async function collectFeesData(
  params: CollectFeesParams
): Promise<{ token0Fees: string; token1Fees: string; feesUSD: number; calldata: string; value: string; to: string; txHash?: string }> {
  const provider = getProvider()
  const signer = getSigner(provider)
  const { pool } = await fetchPoolState(provider, params.poolAddress)

  const nfpm = new ethers.Contract(NFPM_ADDRESS, ['function positions(uint256) view returns (uint96,address,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)'], provider)
  const positionInfo = await nfpm.positions(params.positionId)

  const token0FeesRaw = JSBI.BigInt(positionInfo.tokensOwed0.toString())
  const token1FeesRaw = JSBI.BigInt(positionInfo.tokensOwed1.toString())

  const recipient = params.recipientAddress || (signer ? await signer.getAddress() : undefined)
  const collectOptions = {
    tokenId: params.positionId,
    expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(pool.token0, token0FeesRaw),
    expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(pool.token1, token1FeesRaw),
    recipient: recipient || params.poolAddress,
  }

  const { calldata, value } = NonfungiblePositionManager.collectCallParameters(collectOptions)
  const tx = await buildTxResponse(NFPM_ADDRESS, calldata, value, signer)
  const txHash = tx ? (await tx).hash : undefined

  const price = priceFromSqrtPrice(JSBI.BigInt(pool.sqrtPriceX96), pool.token0.decimals, pool.token1.decimals) || 0
  const token0Fees = CurrencyAmount.fromRawAmount(pool.token0, token0FeesRaw).toExact()
  const token1Fees = CurrencyAmount.fromRawAmount(pool.token1, token1FeesRaw).toExact()

  const feesUSD = parseFloat(token0Fees) * price + parseFloat(token1Fees)

  return { token0Fees, token1Fees, feesUSD, calldata, value, to: NFPM_ADDRESS, txHash }
}

/**
 * Close position and collect remaining liquidity + fees
 * In production, this would call Uniswap's decreaseLiquidity and collect functions
 */
export async function closePositionData(
  params: ClosePositionParams
): Promise<{ token0Amount: string; token1Amount: string; feesUSD: number; calldata: string; value: string; to: string; txHash?: string }> {
  const provider = getProvider()
  const signer = getSigner(provider)
  const { pool } = await fetchPoolState(provider, params.poolAddress)

  const nfpm = new ethers.Contract(NFPM_ADDRESS, ['function positions(uint256) view returns (uint96,address,address,address,address,uint24,int24,int24,uint128,uint256,uint256,uint128,uint128)'], provider)
  const positionInfo = await nfpm.positions(params.positionId)

  const position = new Position({
    pool,
    liquidity: JSBI.BigInt(positionInfo.liquidity.toString()),
    tickLower: positionInfo.tickLower,
    tickUpper: positionInfo.tickUpper,
  })

  const burnAmounts = position.burnAmountsWithSlippage(new Percent(50, 10_000))

  const recipient = params.recipientAddress || (signer ? await signer.getAddress() : undefined)
  const collectOptions = {
    expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(pool.token0, positionInfo.tokensOwed0.toString()),
    expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(pool.token1, positionInfo.tokensOwed1.toString()),
    recipient: recipient || params.poolAddress,
  }

  const { calldata, value } = NonfungiblePositionManager.removeCallParameters(position, {
    tokenId: params.positionId,
    liquidityPercentage: new Percent(1, 1),
    deadline: withDeadline(),
    slippageTolerance: new Percent(50, 10_000),
    collectOptions,
  })

  const tx = await buildTxResponse(NFPM_ADDRESS, calldata, value, signer)
  const txHash = tx ? (await tx).hash : undefined

  const token0Amount = burnAmounts.amount0.toExact()
  const token1Amount = burnAmounts.amount1.toExact()

  const price = priceFromSqrtPrice(JSBI.BigInt(pool.sqrtPriceX96), pool.token0.decimals, pool.token1.decimals) || 0
  const feesUSD = parseFloat(token0Amount) * price + parseFloat(token1Amount)

  return { token0Amount, token1Amount, feesUSD, calldata, value, to: NFPM_ADDRESS, txHash }
}

