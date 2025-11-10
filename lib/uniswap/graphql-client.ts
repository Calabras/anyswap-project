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
};

export class UniswapGraphClient {
  private client: GraphQLClient;
  private network: string;

  constructor(network: string = 'mainnet', apiKey?: string) {
    this.network = network;
    const baseEndpoint = GRAPH_ENDPOINTS[network as keyof typeof GRAPH_ENDPOINTS] || GRAPH_ENDPOINTS.mainnet;
    
    // Build endpoint with API key
    const apiKeyToUse = apiKey || process.env.NEXT_PUBLIC_GRAPH_API_KEY;
    const endpoint = apiKeyToUse 
      ? baseEndpoint.replace('/subgraphs/id/', `/api/${apiKeyToUse}/subgraphs/id/`)
      : baseEndpoint;
    
    console.log(`🌐 Using Graph endpoint: ${endpoint.substring(0, 60)}...`);
    
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
        }
      }
    `;

    try {
      const variables = { 
        poolAddress: poolAddress.toLowerCase() 
      };
      const data = await this.client.request(query, variables);
      return data.pool;
    } catch (error) {
      console.error('Error fetching pool:', error);
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
          liquidityProviderCount
        }
      }
    `;

    try {
      const variables = { limit, orderBy };
      const data = await this.client.request(query, variables);
      return data.pools;
    } catch (error) {
      console.error('Error fetching top pools:', error);
      throw new Error(`Failed to fetch top pools: ${error}`);
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