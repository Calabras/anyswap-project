// components/admin/PoolManagement.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import ConfirmModal from '@/components/modals/ConfirmModal';

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
  { value: 'bnb', label: 'BNB Chain', color: 'yellow' },
  { value: 'solana', label: 'Solana', color: 'purple' },
  { value: 'unichain', label: 'Unichain', color: 'green' },
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = pools.length > 0 && selectedIds.size === pools.length;
  const [confirm, setConfirm] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPools, setTotalPools] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Загрузка существующих пулов
  const fetchExistingPools = useCallback(async () => {
    try {
      setLoading(true);
      // Clear selection when changing page
      setSelectedIds(new Set());
      const url = `/api/admin/pools/import?page=${currentPage}&limit=${pageSize}`;
      console.log(`🔍 Fetching pools from: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`📥 Received data:`, {
        success: data.success,
        poolsCount: data.pools?.length || 0,
        pagination: data.pagination,
        firstPool: data.pools?.[0] ? {
          id: data.pools[0].id,
          address: data.pools[0].address,
          network: data.pools[0].network,
          pair: data.pools[0].pair
        } : null
      });
      
      if (data.success) {
        setPools(data.pools || []);
        if (data.pagination) {
          setTotalPools(data.pagination.total || 0);
          setTotalPages(data.pagination.totalPages || 1);
        }
      } else {
        console.error('❌ Failed to fetch pools:', data.error);
        showToast(data.error || 'Failed to fetch pools', 'error');
        setPools([]);
      }
    } catch (error) {
      console.error('❌ Error fetching pools:', error);
      showToast('Error loading pools. Please try again.', 'error');
      setPools([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, showToast]);

  useEffect(() => {
    fetchExistingPools();
  }, [fetchExistingPools]);

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
        // Reset to first page after import
        setCurrentPage(1);
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
        showToast(data.message || `Импортировано ${data.imported} пулов!`, 'success');
        if (data.failed > 0) {
          showToast(`Не удалось импортировать ${data.failed} пулов`, 'error');
          if (data.errors && data.errors.length > 0) {
            console.error('Import errors:', data.errors);
          }
        }
        // Reset to first page after import
        setCurrentPage(1);
        fetchExistingPools();
      } else {
        const errorMsg = data.error || data.message || 'Ошибка при импорте пулов';
        showToast(errorMsg, 'error');
        if (data.details) {
          console.error('Import error details:', data.details);
        }
        if (data.errors && data.errors.length > 0) {
          console.error('Import errors:', data.errors);
        }
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
          Uniswap V3 Pool Management
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Import and manage Uniswap V3 liquidity pools
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
            Import Pools
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
            Manage Pools ({totalPools > 0 ? totalPools : pools.length})
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
                Select network
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
                Import by URL or pool address
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Paste the full Uniswap URL or just the pool address
              </p>
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="https://app.uniswap.org/explore/pools/ethereum/0x4e68... or 0x4e68..."
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
                💡 Tip: Copy the pool URL from Uniswap when it is open in your browser
              </p>
            </div>

            {/* Import Top Pools */}
            <div className="bg-accent/30 p-4 rounded-lg border border-border">
              <h3 className="text-lg font-medium text-foreground mb-3">
                Import top pools by TVL
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Import top</span>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={importCount}
                  onChange={(e) => setImportCount(parseInt(e.target.value) || 10)}
                  className="w-20 bg-background border-border text-foreground"
                  disabled={loading}
                />
                <span className="text-sm text-muted-foreground">pools</span>
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
                  Import
                </Button>
              </div>
            </div>

            {/* Search Pools by Tokens */}
            <div className="bg-accent/30 p-4 rounded-lg border border-border">
              <h3 className="text-lg font-medium text-foreground mb-3">
                Search pools by tokens
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Input
                  type="text"
                  placeholder="Token0 address (optional)"
                  value={searchToken0}
                  onChange={(e) => setSearchToken0(e.target.value)}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  disabled={loading}
                />
                <Input
                  type="text"
                  placeholder="Token1 address (optional)"
                  value={searchToken1}
                  onChange={(e) => setSearchToken1(e.target.value)}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={async () => {
                  if (!searchToken0 && !searchToken1) {
                    showToast('Enter at least one token address', 'error');
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
                      showToast(`Found ${data.pools.length} pools`, 'success');
                      console.log('Search results:', data.pools);
                    } else {
                      showToast(data.error || 'Search error', 'error');
                    }
                  } catch (error) {
                    showToast('Network error', 'error');
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
                Search
              </Button>
            </div>

            {/* Info Alert */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    Import information
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    When importing, token info, current liquidity, 24h volume and 7-day history are fetched from The Graph.
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Sample pool addresses:</p>
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
            {/* Bulk actions */}
            {pools.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedIds.size} / {pools.length}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedIds.size === 0 || loading}
                    onClick={() => setConfirm({ open: true, ids: Array.from(selectedIds) })}
                  >
                    Delete selected
                  </Button>
                </div>
              </div>
            )}
            {pools.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  No imported pools
                </h3>
                <p className="text-sm text-muted-foreground">
                  Go to "Import Pools" tab to add pools
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-accent/50">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(new Set(pools.map(p => p.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Pool
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Network
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        TVL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        24h Volume
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        24h Fees
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        APR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Fee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {pools.map((pool) => (
                      <tr key={pool.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(pool.id)}
                            onChange={(e) => {
                              const copy = new Set(selectedIds);
                              if (e.target.checked) copy.add(pool.id);
                              else copy.delete(pool.id);
                              setSelectedIds(copy);
                            }}
                          />
                        </td>
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
                          {formatUSD(pool.fees24h || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-500">
                          {((pool.apr || 0)).toFixed(2)}%
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
                                    showToast('Pool data updated', 'success');
                                    fetchExistingPools();
                                  } else {
                                    showToast(data.error || 'Update error', 'error');
                                  }
                                } catch (error) {
                                  showToast('Network error', 'error');
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
                              onClick={async () => {
                                setConfirm({ open: true, ids: [pool.id] });
                              }}
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                              disabled={loading}
                            >
                              ×
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

            {/* Pagination */}
            {pools.length > 0 && (
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show:</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(parseInt(value));
                        setCurrentPage(1); // Reset to first page when changing page size
                      }}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">per page</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalPools)} of {totalPools} pools
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1 || loading}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          disabled={loading}
                          className="min-w-[40px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || loading}
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      {/* Confirm deletion modal */}
      <ConfirmModal
        open={confirm.open}
        title={confirm.ids.length > 1 ? 'Delete selected pools?' : 'Delete this pool?'}
        description="This will remove selected pools from admin list (soft delete)."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onCancel={() => setConfirm({ open: false, ids: [] })}
        onConfirm={async () => {
          setConfirm({ open: false, ids: [] });
          setLoading(true);
          try {
            if (confirm.ids.length > 1) {
              const res = await fetch('/api/admin/pools', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: confirm.ids })
              });
              const data = await res.json();
              if (data.success) {
                showToast('Selected pools deleted', 'success');
                setSelectedIds(new Set());
                // If current page becomes empty, go to previous page
                if (pools.length - confirm.ids.length === 0 && currentPage > 1) {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                }
              } else {
                showToast(data.error || 'Delete error', 'error');
              }
            } else if (confirm.ids.length === 1) {
              const res = await fetch(`/api/admin/pools?poolId=${confirm.ids[0]}`, { method: 'DELETE' });
              const data = await res.json();
              if (data.success) {
                showToast('Pool deleted', 'success');
                // If current page becomes empty, go to previous page
                if (pools.length === 1 && currentPage > 1) {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                }
              } else {
                showToast(data.error || 'Delete error', 'error');
              }
            }
            fetchExistingPools();
          } catch {
            showToast('Network error', 'error');
          } finally {
            setLoading(false);
          }
        }}
      />
    </Card>
  );
}
