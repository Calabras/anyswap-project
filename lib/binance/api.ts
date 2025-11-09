// lib/binance/api.ts
// Binance API integration for cryptocurrency price conversion

export interface BinancePrice {
  symbol: string
  price: string
}

/**
 * Fetch current price for a cryptocurrency pair from Binance
 * @param symbol - Trading pair symbol (e.g., 'ETHUSDT', 'BTCUSDT')
 */
export async function getBinancePrice(symbol: string): Promise<number | null> {
  try {
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`)
    }

    const data: BinancePrice = await response.json()
    return parseFloat(data.price)
  } catch (error) {
    console.error(`Error fetching Binance price for ${symbol}:`, error)
    return null
  }
}

/**
 * Convert cryptocurrency amount to USDT
 * @param amount - Amount in cryptocurrency
 * @param symbol - Cryptocurrency symbol (e.g., 'ETH', 'BTC')
 */
export async function convertToUSDT(amount: number, symbol: string): Promise<number | null> {
  try {
    // Normalize symbol (remove common prefixes/suffixes)
    const normalizedSymbol = symbol.toUpperCase().replace(/^W/, '').replace(/\.E$/, '')
    const tradingPair = `${normalizedSymbol}USDT`
    
    const price = await getBinancePrice(tradingPair)
    if (!price) {
      return null
    }

    return amount * price
  } catch (error) {
    console.error(`Error converting ${symbol} to USDT:`, error)
    return null
  }
}

/**
 * Fetch multiple prices at once
 */
export async function getMultiplePrices(symbols: string[]): Promise<Record<string, number>> {
  try {
    const symbolString = symbols.join(',')
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`)
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`)
    }

    const data: BinancePrice[] = await response.json()
    const prices: Record<string, number> = {}
    
    for (const item of data) {
      // Extract base symbol from trading pair (e.g., 'ETHUSDT' -> 'ETH')
      const baseSymbol = item.symbol.replace('USDT', '')
      prices[baseSymbol] = parseFloat(item.price)
    }
    
    return prices
  } catch (error) {
    console.error('Error fetching multiple Binance prices:', error)
    return {}
  }
}

