// lib/uniswap/api.ts
// Uniswap V3 API integration using The Graph

export interface UniswapPoolData {
  poolAddress: string
  network: string
  token0: {
    symbol: string
    address: string
    name?: string
    decimals: number
  }
  token1: {
    symbol: string
    address: string
    name?: string
    decimals: number
  }
  feeTier: number
  tvl: number
  volume24h: number
  fees24h: number
  apr: number
  sqrtPrice?: string
  tick?: number
  liquidity?: string
}

// The Graph API endpoints for different networks
// Priority: Use custom URLs from env, then API key with decentralized network, then fallback
function getGraphEndpoint(network: string): string {
  // Check for custom URL in environment variables first
  const customUrlKey = `NEXT_PUBLIC_GRAPH_${network.toUpperCase()}_URL` as keyof typeof process.env
  if (process.env[customUrlKey]) {
    return process.env[customUrlKey]!
  }

  // Try using API key with decentralized network
  const apiKey = process.env.NEXT_PUBLIC_GRAPH_API_KEY || process.env.GRAPH_API_KEY
  if (apiKey) {
    // Check for custom Subgraph ID for this network
    const subgraphIdKey = `NEXT_PUBLIC_GRAPH_${network.toUpperCase()}_SUBGRAPH_ID` as keyof typeof process.env
    const subgraphId = process.env[subgraphIdKey]
    
    if (subgraphId) {
      // Use custom Subgraph ID with decentralized network
      return `https://gateway-arbitrum.network.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`
    }
    
    // If no custom Subgraph ID, try using hosted service with API key in headers
    // (will be handled in queryTheGraph function)
  }

  // Fallback to hosted service endpoints (may not work without API key)
  const hostedServiceEndpoints: Record<string, string> = {
    ethereum: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    polygon: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
    arbitrum: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal',
    optimism: 'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis',
    base: 'https://api.thegraph.com/subgraphs/name/ianlapham/base-v3',
  }

  // Return hosted service endpoint for the network
  return hostedServiceEndpoints[network] || hostedServiceEndpoints.ethereum
}

const GRAPH_ENDPOINTS: Record<string, string> = {
  ethereum: getGraphEndpoint('ethereum'),
  polygon: getGraphEndpoint('polygon'),
  arbitrum: getGraphEndpoint('arbitrum'),
  optimism: getGraphEndpoint('optimism'),
  base: getGraphEndpoint('base'),
}

/**
 * Parse Uniswap pool URL and extract pool address
 * Examples:
 * - https://app.uniswap.org/pools/0x1234...5678
 * - https://app.uniswap.org/explore/pools/ethereum/0x1234...5678
 * - https://app.uniswap.org/explore/pools/polygon/0x1234...5678
 */
export function parseUniswapUrl(url: string): { poolAddress: string; network: string } | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(p => p) // Remove empty parts
    
    // Find 'pools' in path
    const poolIndex = pathParts.indexOf('pools')
    
    if (poolIndex === -1) {
      return null
    }
    
    // Check if it's the new format: /explore/pools/{network}/{address}
    if (pathParts[poolIndex - 1] === 'explore' && pathParts.length > poolIndex + 2) {
      // Format: /explore/pools/{network}/{pool_address}
      const network = pathParts[poolIndex + 1]
      const poolAddress = pathParts[poolIndex + 2]
      
      if (poolAddress && poolAddress.startsWith('0x')) {
        // Map network names to our internal format
        const networkMap: Record<string, string> = {
          ethereum: 'ethereum',
          polygon: 'polygon',
          arbitrum: 'arbitrum',
          optimism: 'optimism',
          base: 'base',
        }
        
        return {
          poolAddress,
          network: networkMap[network.toLowerCase()] || 'ethereum',
        }
      }
    } else if (pathParts.length > poolIndex + 1) {
      // Old format: /pools/{pool_address}
      const poolAddress = pathParts[poolIndex + 1]
      
      if (poolAddress && poolAddress.startsWith('0x')) {
        // Determine network from URL (fallback to ethereum)
        let network = 'ethereum' // default
        if (url.includes('polygon')) {
          network = 'polygon'
        } else if (url.includes('arbitrum')) {
          network = 'arbitrum'
        } else if (url.includes('optimism')) {
          network = 'optimism'
        } else if (url.includes('base')) {
          network = 'base'
        }
        
        return { poolAddress, network }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error parsing Uniswap URL:', error)
    return null
  }
}

/**
 * Query The Graph API for pool data
 */
async function queryTheGraph(
  network: string,
  query: string,
  variables?: Record<string, any>
): Promise<any> {
  // Get endpoint dynamically (in case env vars changed)
  const endpoint = getGraphEndpoint(network)
  
  if (!endpoint) {
    throw new Error(`Unsupported network: ${network}`)
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  // Add API key to headers if available
  const apiKey = process.env.NEXT_PUBLIC_GRAPH_API_KEY || process.env.GRAPH_API_KEY
  if (apiKey) {
    // Try adding API key as header (some endpoints may require it)
    headers['Authorization'] = `Bearer ${apiKey}`
    // Also try as query parameter for hosted service
    if (endpoint.includes('api.thegraph.com')) {
      // Hosted service might accept API key in headers or query
      // We'll try headers first
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Graph API error for ${network}:`, response.status, errorText)
      throw new Error(`Graph API error: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    if (data.errors) {
      const errorMessages = data.errors.map((e: any) => e.message || JSON.stringify(e)).join(', ')
      console.error(`Graph API errors for ${network}:`, data.errors)
      
      // Provide helpful error message
      if (errorMessages.includes('removed') || errorMessages.includes('endpoint') || errorMessages.includes('subgraph not found')) {
        const apiKey = process.env.NEXT_PUBLIC_GRAPH_API_KEY || process.env.GRAPH_API_KEY
        if (!apiKey) {
          throw new Error(
            `The Graph endpoint requires authentication. ` +
            `Please set up API key in .env file: NEXT_PUBLIC_GRAPH_API_KEY=your_api_key. ` +
            `See GRAPH_API_SETUP.md for instructions. ` +
            `Original error: ${errorMessages}`
          )
        } else {
          throw new Error(
            `The Graph endpoint has been removed or Subgraph ID is invalid. ` +
            `Please check your Subgraph ID in .env file or set NEXT_PUBLIC_GRAPH_${network.toUpperCase()}_SUBGRAPH_ID. ` +
            `If you created a Subgraph in Studio, copy its Subgraph ID from the Studio interface. ` +
            `See GRAPH_API_SETUP.md for instructions. ` +
            `Original error: ${errorMessages}`
          )
        }
      }
      
      throw new Error(`Graph API errors: ${errorMessages}`)
    }

    return data.data
  } catch (error: any) {
    // Provide more helpful error messages
    if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
      throw new Error(
        `Failed to connect to The Graph API for ${network}. ` +
        `Please check your internet connection and API key configuration. ` +
        `See GRAPH_API_SETUP.md for setup instructions.`
      )
    }
    throw error
  }
}

/**
 * Fetch pool data from Uniswap V3 via The Graph API
 */
export async function fetchUniswapPoolData(
  poolAddress: string,
  network: string = 'ethereum'
): Promise<UniswapPoolData | null> {
  try {
    // Normalize pool address (remove 0x prefix if needed, ensure lowercase)
    const normalizedAddress = poolAddress.toLowerCase().startsWith('0x')
      ? poolAddress.toLowerCase()
      : `0x${poolAddress.toLowerCase()}`

    // Query pool data from The Graph
    // Include poolDayData for 24h volume and fees
    const poolQuery = `
      query GetPool($id: ID!) {
        pool(id: $id) {
          id
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
          feeTier
          totalValueLockedUSD
          volumeUSD
          feesUSD
          sqrtPrice
          tick
          liquidity
          poolDayData(
            first: 1
            orderBy: date
            orderDirection: desc
          ) {
            volumeUSD
            feesUSD
            date
          }
        }
      }
    `

    const data = await queryTheGraph(network, poolQuery, {
      id: normalizedAddress,
    })

    if (!data || !data.pool) {
      console.warn(`Pool not found: ${normalizedAddress} on ${network} network`)
      throw new Error(`Pool ${normalizedAddress} not found on ${network} network. Please verify the pool address.`)
    }

    const pool = data.pool

    // Calculate 24h volume and fees
    // Use poolDayData for 24h metrics, fallback to pool totals
    let volume24h = 0
    let fees24h = 0
    
    if (pool.poolDayData && pool.poolDayData.length > 0) {
      // Use most recent day data for 24h metrics
      const dayData = pool.poolDayData[0]
      volume24h = parseFloat(dayData.volumeUSD || '0')
      fees24h = parseFloat(dayData.feesUSD || '0')
    } else {
      // Fallback to total values if day data not available
      volume24h = parseFloat(pool.volumeUSD || '0')
      fees24h = parseFloat(pool.feesUSD || '0')
    }
    
    const tvl = parseFloat(pool.totalValueLockedUSD || '0')

    // Calculate APR: (fees24h * 365) / tvl * 100
    const apr = tvl > 0 ? (fees24h * 365 / tvl) * 100 : 0

    // Map network to our internal format
    const networkMap: Record<string, string> = {
      ethereum: 'ERC20',
      polygon: 'POLYGON',
      arbitrum: 'ARBITRUM',
      optimism: 'OPTIMISM',
      base: 'BASE',
    }

    return {
      poolAddress: normalizedAddress,
      network: networkMap[network] || network.toUpperCase(),
      token0: {
        symbol: pool.token0.symbol,
        address: pool.token0.id,
        name: pool.token0.name,
        decimals: parseInt(pool.token0.decimals),
      },
      token1: {
        symbol: pool.token1.symbol,
        address: pool.token1.id,
        name: pool.token1.name,
        decimals: parseInt(pool.token1.decimals),
      },
      feeTier: parseInt(pool.feeTier),
      tvl,
      volume24h,
      fees24h,
      apr,
      sqrtPrice: pool.sqrtPrice,
      tick: pool.tick ? parseInt(pool.tick) : undefined,
      liquidity: pool.liquidity,
    }
  } catch (error: any) {
    console.error('Error fetching Uniswap pool data:', error)
    // Re-throw the error so it can be caught by the caller
    throw error
  }
}

/**
 * Fetch pool data from Uniswap URL
 */
export async function fetchPoolFromUrl(uniswapUrl: string): Promise<UniswapPoolData | null> {
  const parsed = parseUniswapUrl(uniswapUrl)
  if (!parsed) {
    throw new Error('Invalid Uniswap URL format. Expected: https://app.uniswap.org/explore/pools/{network}/{pool_address} or https://app.uniswap.org/pools/{pool_address}')
  }

  const poolData = await fetchUniswapPoolData(parsed.poolAddress, parsed.network)
  if (!poolData) {
    throw new Error(`Pool ${parsed.poolAddress} not found on ${parsed.network} network. Please verify the pool address.`)
  }
  
  return poolData
}

/**
 * Fetch multiple pools by addresses
 */
export async function fetchMultiplePools(
  poolAddresses: string[],
  network: string = 'ethereum'
): Promise<UniswapPoolData[]> {
  const pools: UniswapPoolData[] = []
  
  for (const address of poolAddresses) {
    const pool = await fetchUniswapPoolData(address, network)
    if (pool) {
      pools.push(pool)
    }
  }
  
  return pools
}

/**
 * Search pools by token symbols
 */
export async function searchPoolsByTokens(
  token0Symbol: string,
  token1Symbol: string,
  network: string = 'ethereum',
  limit: number = 10
): Promise<UniswapPoolData[]> {
  try {
    const searchQuery = `
      query SearchPools($token0Symbol: String!, $token1Symbol: String!, $first: Int!) {
        pools(
          where: {
            token0_: { symbol_contains_nocase: $token0Symbol }
            token1_: { symbol_contains_nocase: $token1Symbol }
          }
          first: $first
          orderBy: totalValueLockedUSD
          orderDirection: desc
        ) {
          id
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
          feeTier
          totalValueLockedUSD
          volumeUSD
          feesUSD
          sqrtPrice
          tick
          liquidity
        }
      }
    `

    const data = await queryTheGraph(network, searchQuery, {
      token0Symbol,
      token1Symbol,
      first: limit,
    })

    if (!data || !data.pools) {
      return []
    }

    return data.pools.map((pool: any) => {
      const tvl = parseFloat(pool.totalValueLockedUSD || '0')
      const fees24h = parseFloat(pool.feesUSD || '0')
      const apr = tvl > 0 ? (fees24h * 365 / tvl) * 100 : 0

      const networkMap: Record<string, string> = {
        ethereum: 'ERC20',
        polygon: 'POLYGON',
        arbitrum: 'ARBITRUM',
        optimism: 'OPTIMISM',
        base: 'BASE',
      }

      return {
        poolAddress: pool.id.toLowerCase(),
        network: networkMap[network] || network.toUpperCase(),
        token0: {
          symbol: pool.token0.symbol,
          address: pool.token0.id,
          name: pool.token0.name,
          decimals: parseInt(pool.token0.decimals),
        },
        token1: {
          symbol: pool.token1.symbol,
          address: pool.token1.id,
          name: pool.token1.name,
          decimals: parseInt(pool.token1.decimals),
        },
        feeTier: parseInt(pool.feeTier),
        tvl,
        volume24h: parseFloat(pool.volumeUSD || '0'),
        fees24h,
        apr,
        sqrtPrice: pool.sqrtPrice,
        tick: pool.tick ? parseInt(pool.tick) : undefined,
        liquidity: pool.liquidity,
      }
    })
  } catch (error) {
    console.error('Error searching pools:', error)
    return []
  }
}
