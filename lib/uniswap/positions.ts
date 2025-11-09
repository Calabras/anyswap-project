// lib/uniswap/positions.ts
// Uniswap V3 SDK integration for position management

import { Pool, Position, NonfungiblePositionManager } from '@uniswap/v3-sdk'
import { Token, CurrencyAmount, Percent } from '@uniswap/sdk-core'
import { ethers } from 'ethers'

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
}

export interface PositionData {
  positionId: string
  token0Amount: string
  token1Amount: string
  liquidity: string
  tickLower: number
  tickUpper: number
  priceLower: number
  priceUpper: number
}

export interface CollectFeesParams {
  positionId: string
  poolAddress: string
  token0Address: string
  token1Address: string
}

export interface ClosePositionParams {
  positionId: string
  poolAddress: string
  token0Address: string
  token1Address: string
  collectFees: boolean
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
  const { amountUSD, minPrice, maxPrice, isFullRange, currentPrice, feeTier } = params

  // Determine tick spacing based on fee tier
  const tickSpacing = feeTier === 100 ? 1 : feeTier === 500 ? 10 : feeTier === 3000 ? 60 : feeTier === 10000 ? 200 : 60

  // Calculate tick range
  let tickLower: number
  let tickUpper: number

  if (isFullRange) {
    const fullRange = getFullRangeTicks(tickSpacing)
    tickLower = fullRange.tickLower
    tickUpper = fullRange.tickUpper
  } else {
    if (!minPrice || !maxPrice) {
      throw new Error('Min and max prices are required when not using full range')
    }
    const range = calculateTickRange(minPrice, maxPrice, tickSpacing)
    tickLower = range.tickLower
    tickUpper = range.tickUpper
  }

  // Calculate price bounds
  const priceLower = tickToPrice(tickLower)
  const priceUpper = tickToPrice(tickUpper)

  // Calculate token amounts based on current price and range
  // Simplified calculation - in production, use Uniswap SDK Position class
  let token0Amount: string
  let token1Amount: string

  if (currentPrice < priceLower) {
    // Price is below range - all in token0
    token0Amount = amountUSD.toString()
    token1Amount = '0'
  } else if (currentPrice > priceUpper) {
    // Price is above range - all in token1
    token0Amount = '0'
    token1Amount = (amountUSD / currentPrice).toString()
  } else {
    // Price is in range - split between tokens
    const sqrtPrice = Math.sqrt(currentPrice)
    const sqrtPriceLower = Math.sqrt(priceLower)
    const sqrtPriceUpper = Math.sqrt(priceUpper)
    
    // Simplified liquidity calculation
    const liquidity = amountUSD / (sqrtPriceUpper - sqrtPriceLower)
    token0Amount = (liquidity * (sqrtPrice - sqrtPriceLower)).toString()
    token1Amount = (liquidity * (sqrtPriceUpper - sqrtPrice) / sqrtPrice).toString()
  }

  // Generate position ID (in production, this comes from the contract)
  const positionId = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`

  // Calculate liquidity (simplified)
  const liquidity = amountUSD.toString()

  return {
    positionId,
    token0Amount,
    token1Amount,
    liquidity,
    tickLower,
    tickUpper,
    priceLower,
    priceUpper,
  }
}

/**
 * Collect fees from position
 * In production, this would call Uniswap's collect function
 */
export async function collectFeesData(
  params: CollectFeesParams
): Promise<{ token0Fees: string; token1Fees: string; feesUSD: number }> {
  // In production, this would:
  // 1. Query the position from Uniswap contract
  // 2. Calculate accumulated fees
  // 3. Call collect() function
  
  // For now, return mock data - replace with actual Uniswap contract calls
  // This should query the position's feeGrowthInside0LastX128 and feeGrowthInside1LastX128
  const token0Fees = '0' // Get from contract
  const token1Fees = '0' // Get from contract
  
  // Convert to USD (simplified - use actual price feeds)
  const feesUSD = 0 // Calculate from token amounts and prices
  
  return { token0Fees, token1Fees, feesUSD }
}

/**
 * Close position and collect remaining liquidity + fees
 * In production, this would call Uniswap's decreaseLiquidity and collect functions
 */
export async function closePositionData(
  params: ClosePositionParams
): Promise<{ token0Amount: string; token1Amount: string; feesUSD: number }> {
  // In production, this would:
  // 1. Decrease liquidity to 0 (burn position)
  // 2. Collect remaining tokens and fees
  // 3. Return amounts to user
  
  // For now, return mock data
  const token0Amount = '0' // Get from contract
  const token1Amount = '0' // Get from contract
  const feesUSD = 0 // Calculate from collected fees
  
  return { token0Amount, token1Amount, feesUSD }
}

