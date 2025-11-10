// app/pools/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Users,
  ArrowUpRight,
  Info,
  Filter,
  Search,
  ChevronDown
} from 'lucide-react';

interface Pool {
  id: string;
  address: string;
  network: string;
  pair: string;
  token0Symbol: string;
  token1Symbol: string;
  fee: number;
  tvlUSD: number;
  volumeUSD: number;
  liquidity: string;
  apr?: number;
}

const NETWORK_COLORS = {
  mainnet: 'bg-blue-100 text-blue-800',
  polygon: 'bg-purple-100 text-purple-800',
  arbitrum: 'bg-orange-100 text-orange-800',
  optimism: 'bg-red-100 text-red-800',
  base: 'bg-indigo-100 text-indigo-800'
};

export default function PoolsPage() {
  const router = useRouter();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('all');
  const [sortBy, setSortBy] = useState<'tvl' | 'volume' | 'apr'>('tvl');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchPools();
  }, []);

  const fetchPools = async () => {
    try {
      const response = await fetch('/api/pools');
      const data = await response.json();
      if (data.success) {
        // Calculate APR for each pool
        const poolsWithAPR = data.pools.map((pool: any) => ({
          ...pool,
          apr: calculateAPR(pool)
        }));
        setPools(poolsWithAPR);
      }
    } catch (error) {
      console.error('Error fetching pools:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAPR = (pool: any) => {
    // Simplified APR calculation
    // In production, use actual fees collected and liquidity data
    const dailyVolume = pool.volumeUSD;
    const tvl = pool.tvlUSD;
    const feePercent = pool.fee / 10000; // Convert basis points to percentage
    
    if (tvl === 0) return 0;
    
    const dailyFees = dailyVolume * feePercent;
    const dailyReturn = dailyFees / tvl;
    const annualReturn = dailyReturn * 365;
    
    return annualReturn * 100; // Convert to percentage
  };

  const formatUSD = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatAPR = (apr: number) => {
    if (apr > 1000) return '>1000%';
    if (apr < 0.01) return '<0.01%';
    return `${apr.toFixed(2)}%`;
  };

  const filteredPools = pools
    .filter(pool => {
      const matchesSearch = pool.pair.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesNetwork = selectedNetwork === 'all' || pool.network === selectedNetwork;
      return matchesSearch && matchesNetwork;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'tvl':
          return b.tvlUSD - a.tvlUSD;
        case 'volume':
          return b.volumeUSD - a.volumeUSD;
        case 'apr':
          return (b.apr || 0) - (a.apr || 0);
        default:
          return 0;
      }
    });

  const handlePoolClick = (poolId: string) => {
    router.push(`/pools/${poolId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка пулов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Пулы ликвидности</h1>
              <p className="mt-2 text-gray-600">
                Предоставляйте ликвидность и зарабатывайте комиссии
              </p>
            </div>
            <button
              onClick={() => router.push('/pools/create')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Создать позицию
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Всего TVL</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatUSD(pools.reduce((acc, pool) => acc + pool.tvlUSD, 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Объем 24ч</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatUSD(pools.reduce((acc, pool) => acc + pool.volumeUSD, 0))}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Активных пулов</p>
                <p className="text-2xl font-bold text-gray-900">{pools.length}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Средний APR</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatAPR(
                    pools.reduce((acc, pool) => acc + (pool.apr || 0), 0) / pools.length
                  )}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Поиск пулов..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все сети</option>
                <option value="mainnet">Ethereum</option>
                <option value="polygon">Polygon</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="optimism">Optimism</option>
                <option value="base">Base</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="tvl">По TVL</option>
                <option value="volume">По объему</option>
                <option value="apr">По APR</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Фильтры
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Минимальный TVL
                  </label>
                  <input
                    type="number"
                    placeholder="$0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Минимальный APR
                  </label>
                  <input
                    type="number"
                    placeholder="0%"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Уровень комиссии
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">Все</option>
                    <option value="500">0.05%</option>
                    <option value="3000">0.3%</option>
                    <option value="10000">1%</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pools Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPools.map((pool) => (
            <div
              key={pool.id}
              onClick={() => handlePoolClick(pool.id)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="p-6">
                {/* Pool Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {pool.pair}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        NETWORK_COLORS[pool.network as keyof typeof NETWORK_COLORS] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {pool.network}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(pool.fee / 10000).toFixed(2)}% fee
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-gray-400" />
                </div>

                {/* Pool Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">TVL</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatUSD(pool.tvlUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Объем 24ч</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatUSD(pool.volumeUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">APR</span>
                    <span className={`text-sm font-medium ${
                      (pool.apr || 0) > 20 ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {formatAPR(pool.apr || 0)}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  Добавить ликвидность
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredPools.length === 0 && (
          <div className="text-center py-12">
            <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Пулы не найдены
            </h3>
            <p className="text-sm text-gray-600">
              Попробуйте изменить параметры поиска или фильтры
            </p>
          </div>
        )}
      </div>
    </div>
  );
}