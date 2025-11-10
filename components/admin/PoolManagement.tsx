// components/admin/PoolManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  AlertCircle,
  Check,
  X,
  Loader2,
  Database,
  Activity
} from 'lucide-react';

interface Pool {
  id: string;
  address: string;
  network: string;
  pair: string;
  fee: number;
  tvlUSD: number;
  volumeUSD: number;
  liquidity: string;
}

const NETWORKS = [
  { value: 'mainnet', label: 'Ethereum Mainnet', color: 'blue' },
  { value: 'polygon', label: 'Polygon', color: 'purple' },
  { value: 'arbitrum', label: 'Arbitrum', color: 'orange' },
  { value: 'optimism', label: 'Optimism', color: 'red' },
  { value: 'base', label: 'Base', color: 'indigo' },
  { value: 'sepolia', label: 'Sepolia Testnet', color: 'gray' }
];

export default function PoolManagement() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('mainnet');
  const [poolAddress, setPoolAddress] = useState('');
  const [searchToken0, setSearchToken0] = useState('');
  const [searchToken1, setSearchToken1] = useState('');
  const [importCount, setImportCount] = useState(10);
  const [activeTab, setActiveTab] = useState<'import' | 'manage'>('import');

  // Загрузка существующих пулов
  useEffect(() => {
    fetchExistingPools();
  }, []);

  const fetchExistingPools = async () => {
    try {
      const response = await fetch('/api/admin/pools/import');
      const data = await response.json();
      if (data.success) {
        setPools(data.pools);
      }
    } catch (error) {
      console.error('Error fetching pools:', error);
    }
  };

  // Импорт одного пула по адресу
  const handleImportSinglePool = async () => {
    if (!poolAddress) {
      toast.error('Введите адрес пула');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/pools/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import-single',
          poolAddress,
          network: selectedNetwork
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Пул ${data.pool.pair} успешно импортирован!`);
        setPoolAddress('');
        fetchExistingPools();
      } else {
        toast.error(data.error || 'Ошибка при импорте пула');
      }
    } catch (error) {
      toast.error('Ошибка сети при импорте пула');
      console.error('Import error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Импорт топ пулов
  const handleImportTopPools = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pools/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import-top',
          network: selectedNetwork,
          limit: importCount
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Импортировано ${data.imported} пулов!`);
        if (data.failed > 0) {
          toast.error(`Не удалось импортировать ${data.failed} пулов`);
        }
        fetchExistingPools();
      } else {
        toast.error(data.error || 'Ошибка при импорте пулов');
      }
    } catch (error) {
      toast.error('Ошибка сети при импорте пулов');
      console.error('Import error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Поиск пулов по токенам
  const handleSearchPools = async () => {
    if (!searchToken0 && !searchToken1) {
      toast.error('Введите хотя бы один адрес токена');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/pools/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          token0: searchToken0,
          token1: searchToken1,
          network: selectedNetwork
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Найдено ${data.pools.length} пулов`);
        // Показать результаты поиска
        console.log('Search results:', data.pools);
      } else {
        toast.error(data.error || 'Ошибка при поиске пулов');
      }
    } catch (error) {
      toast.error('Ошибка сети при поиске пулов');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обновление данных пула
  const handleUpdatePool = async (poolAddress: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pools/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          poolAddress,
          network: selectedNetwork
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Данные пула обновлены');
        fetchExistingPools();
      } else {
        toast.error(data.error || 'Ошибка при обновлении пула');
      }
    } catch (error) {
      toast.error('Ошибка сети при обновлении пула');
      console.error('Update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Управление пулами Uniswap V3
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Импортируйте и управляйте пулами ликвидности из Uniswap V3
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Download className="inline-block w-4 h-4 mr-2" />
              Импорт пулов
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'manage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Database className="inline-block w-4 h-4 mr-2" />
              Управление пулами ({pools.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* Network Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите сеть
                </label>
                <select
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {NETWORKS.map(network => (
                    <option key={network.value} value={network.value}>
                      {network.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Import Single Pool */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Импорт по адресу пула
                </h3>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    placeholder="0x... (адрес пула)"
                    value={poolAddress}
                    onChange={(e) => setPoolAddress(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <button
                    onClick={handleImportSinglePool}
                    disabled={loading || !poolAddress}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Import Top Pools */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Импорт топ пулов по TVL
                </h3>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">Импортировать топ</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={importCount}
                    onChange={(e) => setImportCount(parseInt(e.target.value))}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-600">пулов</span>
                  <button
                    onClick={handleImportTopPools}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <TrendingUp className="inline-block w-4 h-4 mr-2" />
                        Импортировать
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Search Pools by Tokens */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Поиск пулов по токенам
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Адрес токена 0 (опционально)"
                    value={searchToken0}
                    onChange={(e) => setSearchToken0(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <input
                    type="text"
                    placeholder="Адрес токена 1 (опционально)"
                    value={searchToken1}
                    onChange={(e) => setSearchToken1(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <button
                  onClick={handleSearchPools}
                  disabled={loading || (!searchToken0 && !searchToken1)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="inline-block w-4 h-4 mr-2" />
                      Найти пулы
                    </>
                  )}
                </button>
              </div>

              {/* Info Alert */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">
                      Информация об импорте
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      При импорте пулов автоматически загружаются данные о токенах, 
                      текущей ликвидности, объемах торгов и исторические данные за 
                      последние 7 дней. Данные обновляются из The Graph API.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-4">
              {pools.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    Нет импортированных пулов
                  </h3>
                  <p className="text-sm text-gray-600">
                    Перейдите на вкладку "Импорт пулов" чтобы добавить пулы
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Пул
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Сеть
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          TVL
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Объем 24ч
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Комиссия
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pools.map((pool) => (
                        <tr key={pool.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {pool.pair}
                              </div>
                              <div className="text-xs text-gray-500">
                                {pool.address.slice(0, 6)}...{pool.address.slice(-4)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {NETWORKS.find(n => n.value === pool.network)?.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatUSD(pool.tvlUSD)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatUSD(pool.volumeUSD)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(pool.fee / 10000).toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleUpdatePool(pool.address)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                              disabled={loading}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              className="text-green-600 hover:text-green-900"
                              disabled={loading}
                            >
                              <Activity className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}