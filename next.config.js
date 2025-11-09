/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize chunk loading
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
  },
  
  webpack: (config, { isServer, dev }) => {
    // Игнорируем опциональные зависимости, которые не нужны в веб-приложении
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'pino-pretty': false,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    // Игнорируем эти модули в webpack
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    }

    // Optimize chunk splitting for better loading (only in production)
    // In development, let Next.js handle chunking automatically
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for large libraries
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      }
    }
    
    // In development, use default Next.js chunking
    // Don't override optimization in dev mode to avoid chunk loading issues
    
    return config
  },
}

module.exports = nextConfig

