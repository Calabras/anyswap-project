// lib/web3/config.ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, polygon, optimism, arbitrum, base, zora, sepolia } from 'wagmi/chains'
import { http } from 'viem'

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || 'your-project-id'

const chains = [
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  zora,
  ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' ? [sepolia] : []),
] as const

// Configure transports for each chain
const transports: Record<number, ReturnType<typeof http>> = {}
chains.forEach((chain) => {
  if (process.env.NEXT_PUBLIC_ALCHEMY_ID) {
    // Use Alchemy RPC if available
    // For different chains, use appropriate Alchemy endpoints
    let alchemyUrl: string
    if (chain.id === mainnet.id) {
      alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`
    } else if (chain.id === polygon.id) {
      alchemyUrl = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`
    } else if (chain.id === optimism.id) {
      alchemyUrl = `https://opt-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`
    } else if (chain.id === arbitrum.id) {
      alchemyUrl = `https://arb-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`
    } else if (chain.id === base.id) {
      alchemyUrl = `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`
    } else {
      // Fallback to public RPC for other chains
      alchemyUrl = chain.rpcUrls.default.http[0]
    }
    transports[chain.id] = http(alchemyUrl)
  } else {
    // Use public RPC
    transports[chain.id] = http(chain.rpcUrls.default.http[0])
  }
})

// Create config lazily to avoid issues during SSR
let wagmiConfig: ReturnType<typeof getDefaultConfig> | null = null

export function getConfig() {
  if (!wagmiConfig) {
    wagmiConfig = getDefaultConfig({
      appName: 'AnySwap',
      projectId,
      chains,
      transports,
      ssr: true,
    })
  }
  return wagmiConfig
}

export const config = getConfig()

export { chains }

