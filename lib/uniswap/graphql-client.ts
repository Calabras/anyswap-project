// lib/uniswap/graphql-client.ts
import { gql, GraphQLClient } from 'graphql-request';

// The Graph API endpoints for Uniswap V3
// Using Gateway endpoints which require API key but are reliable
const GRAPH_ENDPOINTS: Record<string, string> = {
  // Using The Graph's decentralized network via Gateway
  // These are the official Uniswap V3 subgraph IDs
  mainnet: 'https://gateway-arbitrum.network.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV', // Uniswap V3 Ethereum
  polygon: 'https://gateway-arbitrum.network.thegraph.com/api/subgraphs/id/3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm', // Uniswap V3 Polygon
  arbitrum: 'https://gateway-arbitrum.network.thegraph.com/api/subgraphs/id/FbCGRftH4a3yZugY7TnbYgPJVEv2LvMT6oF1fxPe9aJM', // Uniswap V3 Arbitrum
  optimism: 'https://gateway-arbitrum.network.thegraph.com/api/subgraphs/id/Cghf4LfVqPiFw6fp6Y5X5Ubc8UpmUhSfJL82zwiBFLaj', // Uniswap V3 Optimism
  base: 'https://gateway-arbitrum.network.thegraph.com/api/subgraphs/id/43Hwfi3dJSoGpyas9VwNoDAv28ijqvXaPAWzfzfgjYdw', // Uniswap V3 Base
  bnb: 'https://gateway-arbitrum.network.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV', // BNB Chain (using mainnet for now, need actual subgraph)
  solana: 'https://gateway-arbitrum.network.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV', // Solana (using mainnet for now, need actual subgraph)
  unichain: 'https://gateway-arbitrum.network.thegraph.com/api/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV', // Unichain (using mainnet for now, need actual subgraph)
};

// Public hosted-service endpoints (no API key). Useful for development.
const PUBLIC_ENDPOINTS: Record<string, string> = {
  mainnet: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
  polygon: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
  arbitrum: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal',
  optimism: 'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis',
  base: 'https://api.thegraph.com/subgraphs/name/ianlapham/base-v3',
  bnb: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', // Placeholder
  solana: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', // Placeholder
  unichain: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', // Placeholder
};

export class UniswapGraphClient {
  private client: GraphQLClient;
  private network: string;

  constructor(network: string = 'mainnet', apiKey?: string) {
    this.network = network;
    const baseEndpoint = GRAPH_ENDPOINTS[network as keyof typeof GRAPH_ENDPOINTS] || GRAPH_ENDPOINTS.mainnet;
    
    // Build endpoint with API key
    const apiKeyToUse = apiKey || process.env.NEXT_PUBLIC_GRAPH_API_KEY;
    
    // Extract subgraph ID from base endpoint
    // Format: https://gateway-arbitrum.network.thegraph.com/api/subgraphs/id/{SUBGRAPH_ID}
    const subgraphIdMatch = baseEndpoint.match(/\/subgraphs\/id\/([^\/]+)/);
    const subgraphId = subgraphIdMatch ? subgraphIdMatch[1] : null;
    
    let endpoint;
    if (apiKeyToUse && subgraphId) {
      // Build proper Gateway URL: https://gateway-arbitrum.network.thegraph.com/api/{KEY}/subgraphs/id/{ID}
      endpoint = `https://gateway-arbitrum.network.thegraph.com/api/${apiKeyToUse}/subgraphs/id/${subgraphId}`;
      console.log(`🌐 Using Graph Gateway with API key for ${network}`);
    } else {
      // No API key provided → use public hosted endpoint for development
      endpoint = PUBLIC_ENDPOINTS[network as keyof typeof PUBLIC_ENDPOINTS] || PUBLIC_ENDPOINTS.mainnet;
      console.warn(`⚠️ No API key provided. Falling back to public The Graph endpoint for ${network}.`);
    }
    
    this.client = new GraphQLClient(endpoint, {
      headers: {},
      timeout: 30000, // 30 seconds
    });
  }

  // Получение информации о пуле по адресу
  async getPoolByAddress(poolAddress: string) {
    const query = gql`
      query GetPool($poolAddress: String!) {
        pool(id: $poolAddress) {
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
          liquidity
          sqrtPrice
          token0Price
          token1Price
          volumeUSD
          volumeToken0
          volumeToken1
          txCount
          totalValueLockedUSD
          totalValueLockedToken0
          totalValueLockedToken1
          tick
          observationIndex
          liquidityProviderCount
          poolDayData(
            first: 2
            orderBy: date
            orderDirection: desc
          ) {
            date
            volumeUSD
            feesUSD
            tvlUSD
            volumeToken0
            volumeToken1
            txCount
          }
          poolHourData(
            first: 26
            orderBy: periodStartUnix
            orderDirection: desc
          ) {
            periodStartUnix
            volumeUSD
            feesUSD
            tvlUSD
            volumeToken0
            volumeToken1
            txCount
          }
        }
      }
    `;

    try {
      const variables = { 
        poolAddress: poolAddress.toLowerCase() 
      };
      console.log(`🔍 GraphQL query for pool ${poolAddress} on ${this.network}`);
      const data = await this.client.request(query, variables);
      
      if (data.pool) {
        console.log(`✅ Pool data received:`, {
          id: data.pool.id,
          pair: `${data.pool.token0.symbol}/${data.pool.token1.symbol}`,
          totalValueLockedUSD: data.pool.totalValueLockedUSD,
          volumeUSD: data.pool.volumeUSD,
          poolDayDataCount: data.pool.poolDayData?.length || 0,
          latestDayData: data.pool.poolDayData?.[0] ? {
            date: new Date(data.pool.poolDayData[0].date * 1000).toISOString(),
            volumeUSD: data.pool.poolDayData[0].volumeUSD,
            feesUSD: data.pool.poolDayData[0].feesUSD,
            tvlUSD: data.pool.poolDayData[0].tvlUSD
          } : null
        });
      }
      
      return data.pool;
    } catch (error) {
      console.error('❌ Error fetching pool:', error);
      if (error instanceof Error) {
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
      }
      throw new Error(`Failed to fetch pool data: ${error}`);
    }
  }

  // Получение списка топ пулов
  async getTopPools(limit: number = 10, orderBy: string = 'totalValueLockedUSD') {
    const query = gql`
      query GetTopPools($limit: Int!, $orderBy: String!) {
        pools(
          first: $limit
          orderBy: $orderBy
          orderDirection: desc
          where: { totalValueLockedUSD_gt: "1000" }
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
          liquidity
          sqrtPrice
          token0Price
          token1Price
          volumeUSD
          totalValueLockedUSD
          txCount
          tick
          liquidityProviderCount
        }
      }
    `;

    try {
      console.log(`🔍 Fetching top ${limit} pools from ${this.network}...`);
      const variables = { limit, orderBy };
      const data = await this.client.request(query, variables);
      
      if (!data || !data.pools) {
        console.warn(`⚠️ No pools data returned from GraphQL query`);
        return [];
      }
      
      console.log(`✅ Successfully fetched ${data.pools.length} pools`);
      return data.pools;
    } catch (error: any) {
      console.error(`❌ GraphQL error fetching top pools for ${this.network}:`, error);
      console.error(`   Error message:`, error?.message);
      console.error(`   Error response:`, error?.response);
      console.error(`   Error request:`, error?.request);
      
      // Provide more detailed error message
      let errorMessage = 'Failed to fetch top pools';
      if (error?.response?.errors) {
        errorMessage = error.response.errors.map((e: any) => e.message).join(', ');
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      throw new Error(`${errorMessage} (network: ${this.network})`);
    }
  }

  // Получение позиций пользователя
  async getUserPositions(userAddress: string) {
    const query = gql`
      query GetUserPositions($userAddress: String!) {
        positions(where: { owner: $userAddress }) {
          id
          owner
          pool {
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
            liquidity
            token0Price
            token1Price
            totalValueLockedUSD
          }
          token0
          token1
          tickLower {
            tickIdx
            price0
            price1
          }
          tickUpper {
            tickIdx
            price0
            price1
          }
          liquidity
          depositedToken0
          depositedToken1
          withdrawnToken0
          withdrawnToken1
          collectedFeesToken0
          collectedFeesToken1
          transaction {
            id
            timestamp
          }
        }
      }
    `;

    try {
      const variables = { 
        userAddress: userAddress.toLowerCase() 
      };
      const data = await this.client.request(query, variables);
      return data.positions;
    } catch (error) {
      console.error('Error fetching user positions:', error);
      throw new Error(`Failed to fetch user positions: ${error}`);
    }
  }

  // Поиск пулов по токенам
  async searchPoolsByTokens(token0?: string, token1?: string) {
    let whereClause = '';
    const conditions = [];
    
    if (token0) {
      conditions.push(`token0: "${token0.toLowerCase()}"`);
    }
    if (token1) {
      conditions.push(`token1: "${token1.toLowerCase()}"`);
    }
    
    if (conditions.length > 0) {
      whereClause = `where: { ${conditions.join(', ')} }`;
    }

    const query = gql`
      query SearchPools {
        pools(
          first: 50
          orderBy: totalValueLockedUSD
          orderDirection: desc
          ${whereClause}
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
          liquidity
          sqrtPrice
          token0Price
          token1Price
          volumeUSD
          totalValueLockedUSD
          txCount
        }
      }
    `;

    try {
      const data = await this.client.request(query);
      return data.pools;
    } catch (error) {
      console.error('Error searching pools:', error);
      throw new Error(`Failed to search pools: ${error}`);
    }
  }

  // Получение исторических данных пула
  async getPoolDayData(poolAddress: string, days: number = 7) {
    const query = gql`
      query GetPoolDayData($poolAddress: String!, $days: Int!) {
        poolDayDatas(
          first: $days
          orderBy: date
          orderDirection: desc
          where: { pool: $poolAddress }
        ) {
          date
          pool {
            id
          }
          liquidity
          sqrtPrice
          token0Price
          token1Price
          tick
          tvlUSD
          volumeToken0
          volumeToken1
          volumeUSD
          feesUSD
          txCount
          open
          high
          low
          close
        }
      }
    `;

    try {
      const variables = { 
        poolAddress: poolAddress.toLowerCase(),
        days 
      };
      const data = await this.client.request(query, variables);
      return data.poolDayDatas;
    } catch (error) {
      console.error('Error fetching pool day data:', error);
      throw new Error(`Failed to fetch pool day data: ${error}`);
    }
  }

  // Получение тиков пула (для построения графика ликвидности)
  async getPoolTicks(poolAddress: string) {
    const query = gql`
      query GetPoolTicks($poolAddress: String!) {
        ticks(
          first: 1000
          where: { pool: $poolAddress }
          orderBy: tickIdx
        ) {
          tickIdx
          liquidityGross
          liquidityNet
          price0
          price1
          volumeToken0
          volumeToken1
          volumeUSD
          untrackedVolumeUSD
          feesUSD
          feeGrowthOutside0X128
          feeGrowthOutside1X128
        }
      }
    `;

    try {
      const variables = { 
        poolAddress: poolAddress.toLowerCase() 
      };
      const data = await this.client.request(query, variables);
      return data.ticks;
    } catch (error) {
      console.error('Error fetching pool ticks:', error);
      throw new Error(`Failed to fetch pool ticks: ${error}`);
    }
  }
}

export default UniswapGraphClient;