// components/admin/PoolManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { 
  Search, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  AlertCircle,
  Loader2,
  Database,
  Activity,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Pool {
  id: string;
  address: string;
  network: string;
  pair: string;
  fee: number;
  tvlUSD: number;
  volumeUSD: number;
  liquidity: string;
  updatedAt?: Date;
}

const NETWORKS = [
  { value: 'mainnet', label: 'Ethereum Mainnet', color: 'blue' },
  { value: 'polygon', label: 'Polygon', color: 'purple' },
  { value: 'arbitrum', label: 'Arbitrum', color: 'orange' },
  { value: 'optimism', label: 'Optimism', color: 'red' },
  { value: 'base', label: 'Base', color: 'indigo' },
];

// Parse Uniswap URL to extract pool address
function parseUniswapUrl(url: string): { poolAddress: string; network: string } | null {
  try {
    // Format: https://app.uniswap.org/explore/pools/{network}/{address}
    const match = url.match(/explore\/pools\/([^\/]+)\/([^\/\?]+)/);
    if (match) {
      const network = match[1] === 'ethereum' ? 'mainnet' : match[1];
      return { poolAddress: match[2], network };
    }
    
    // Alternative format: https://app.uniswap.org/pools/{address}
    const match2 = url.match(/pools\/([^\/\?]+)/);
    if (match2) {
      return { poolAddress: match2[1], network: 'mainnet' };
    }
    
    return null;
  } catch {
    return null;
  }
}

export default function PoolManagement() {
  const { showToast } = useToast();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('mainnet');
  const [poolInput, setPoolInput] = useState('');
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

  // Импорт одного пула по адресу или URL
  const handleImportSinglePool = async () => {
    if (!poolInput) {
      showToast('Введите адрес пула или URL', 'error');
      return;
    }

    setLoading(true);
    try {
      let poolAddress = poolInput.trim();
      let network = selectedNetwork;
      
      // Check if it's a URL - parse it
      if (poolInput.includes('uniswap.org')) {
        const parsed = parseUniswapUrl(poolInput);
        if (parsed) {
          poolAddress = parsed.poolAddress;
          network = parsed.network;
          console.log(`📋 Parsed URL: address=${poolAddress}, network=${network}`);
        } else {
          showToast('Неверный формат URL. Используйте: https://app.uniswap.org/explore/pools/{network}/{address}', 'error');
          setLoading(false);
          return;
        }
      }
      
      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(poolAddress)) {
        showToast('Неверный формат адреса пула', 'error');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/pools/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import-single',
          poolAddress,
          network
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showToast(`Пул ${data.pool.pair} успешно импортирован!`, 'success');
        setPoolInput('');
        fetchExistingPools();
      } else {
        showToast(data.error || 'Ошибка при импорте пула', 'error');
      }
    } catch (error) {
      showToast('Ошибка сети при импорте пула', 'error');
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
        showToast(`Импортировано ${data.imported} пулов!`, 'success');
        if (data.failed > 0) {
          showToast(`Не удалось импортировать ${data.failed} пулов`, 'error');
        }
        fetchExistingPools();
      } else {
        showToast(data.error || 'Ошибка при импорте пулов', 'error');
      }
    } catch (error) {
      showToast('Ошибка сети при импорте пулов', 'error');
      console.error('Import error:', error);
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

  return (
    <Card className="bg-card border-border">
      {/* Header */}
      <CardHeader className="border-b border-border">
        <CardTitle className="text-foreground">
          Управление пулами Uniswap V3
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Импортируйте и управляйте пулами ликвидности из Uniswap V3
        </p>
      </CardHeader>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'import'
                ? 'text-primary border-b-2 border-primary bg-accent/50'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
            }`}
          >
            <Download className="inline-block w-4 h-4 mr-2" />
            Импорт пулов
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'manage'
                ? 'text-primary border-b-2 border-primary bg-accent/50'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
            }`}
          >
            <Database className="inline-block w-4 h-4 mr-2" />
            Управление пулами ({pools.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-6">
        {activeTab === 'import' && (
          <div className="space-y-6">
            {/* Network Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Выберите сеть
              </label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork} disabled={loading}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NETWORKS.map(network => (
                    <SelectItem key={network.value} value={network.value}>
                      {network.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Import Single Pool */}
            <div className="bg-accent/30 p-4 rounded-lg border border-border">
              <h3 className="text-lg font-medium text-foreground mb-3">
                Импорт по URL или адресу пула
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Вставьте полный URL с Uniswap или только адрес пула
              </p>
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="https://app.uniswap.org/explore/pools/ethereum/0x4e68... или 0x4e68..."
                  value={poolInput}
                  onChange={(e) => setPoolInput(e.target.value)}
                  className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
                  disabled={loading}
                />
                <Button
                  onClick={handleImportSinglePool}
                  disabled={loading || !poolInput}
                  className="glow-border"
                  variant="outline"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Совет: Просто скопируйте URL из браузера когда открыт пул на Uniswap
              </p>
            </div>

            {/* Import Top Pools */}
            <div className="bg-accent/30 p-4 rounded-lg border border-border">
              <h3 className="text-lg font-medium text-foreground mb-3">
                Импорт топ пулов по TVL
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Импортировать топ</span>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={importCount}
                  onChange={(e) => setImportCount(parseInt(e.target.value) || 10)}
                  className="w-20 bg-background border-border text-foreground"
                  disabled={loading}
                />
                <span className="text-sm text-muted-foreground">пулов</span>
                <Button
                  onClick={handleImportTopPools}
                  disabled={loading}
                  className="ml-auto bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <TrendingUp className="w-4 h-4 mr-2" />
                  )}
                  Импортировать
                </Button>
              </div>
            </div>

            {/* Search Pools by Tokens */}
            <div className="bg-accent/30 p-4 rounded-lg border border-border">
              <h3 className="text-lg font-medium text-foreground mb-3">
                Поиск пулов по токенам
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Input
                  type="text"
                  placeholder="Адрес токена 0 (опционально)"
                  value={searchToken0}
                  onChange={(e) => setSearchToken0(e.target.value)}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  disabled={loading}
                />
                <Input
                  type="text"
                  placeholder="Адрес токена 1 (опционально)"
                  value={searchToken1}
                  onChange={(e) => setSearchToken1(e.target.value)}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={async () => {
                  if (!searchToken0 && !searchToken1) {
                    showToast('Введите хотя бы один адрес токена', 'error');
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
                      showToast(`Найдено ${data.pools.length} пулов`, 'success');
                      console.log('Search results:', data.pools);
                    } else {
                      showToast(data.error || 'Ошибка при поиске пулов', 'error');
                    }
                  } catch (error) {
                    showToast('Ошибка сети при поиске пулов', 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || (!searchToken0 && !searchToken1)}
                variant="outline"
                className="glow-border"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Найти пулы
              </Button>
            </div>

            {/* Info Alert */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    Информация об импорте
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    При импорте пулов автоматически загружаются данные о токенах, 
                    текущей ликвидности, объемах торгов и исторические данные за 
                    последние 7 дней. Данные обновляются из The Graph API.
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Примеры адресов для тестирования:</p>
                    <ul className="space-y-1 pl-4">
                      <li>• USDC/ETH: <code className="text-primary">0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8</code></li>
                      <li>• WBTC/ETH: <code className="text-primary">0xcbcdf9626bc03e24f779434178a73a0b4bad62ed</code></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="space-y-4">
            {pools.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Нет импортированных пулов
                </h3>
                <p className="text-sm text-muted-foreground">
                  Перейдите на вкладку "Импорт пулов" чтобы добавить пулы
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-accent/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Пул
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Сеть
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        TVL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Объем 24ч
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Комиссия
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {pools.map((pool) => (
                      <tr key={pool.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {pool.pair}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              {pool.address.slice(0, 6)}...{pool.address.slice(-4)}
                              <a 
                                href={`https://app.uniswap.org/explore/pools/${pool.network === 'mainnet' ? 'ethereum' : pool.network}/${pool.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/20 text-primary">
                            {NETWORKS.find(n => n.value === pool.network)?.label || pool.network}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">
                          {formatUSD(pool.tvlUSD)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {formatUSD(pool.volumeUSD)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {(pool.fee / 10000).toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={async () => {
                                setLoading(true);
                                try {
                                  const response = await fetch('/api/admin/pools/import', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      action: 'update',
                                      poolAddress: pool.address,
                                      network: pool.network
                                    })
                                  });
                                  const data = await response.json();
                                  if (data.success) {
                                    showToast('Данные пула обновлены', 'success');
                                    fetchExistingPools();
                                  } else {
                                    showToast(data.error || 'Ошибка при обновлении', 'error');
                                  }
                                } catch (error) {
                                  showToast('Ошибка сети', 'error');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              size="sm"
                              variant="ghost"
                              className="text-primary hover:text-primary/80 hover:bg-primary/10"
                              disabled={loading}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                              disabled={loading}
                            >
                              <Activity className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
