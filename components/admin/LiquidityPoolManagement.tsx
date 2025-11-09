// components/admin/LiquidityPoolManagement.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ToastProvider'
import { Plus, Trash2 } from 'lucide-react'

interface LiquidityPool {
  id: string
  pool_address: string
  network: string
  token0_symbol: string
  token1_symbol: string
  tvl_usd: number
  volume_24h_usd: number
  fees_24h_usd: number
  apr: number
  uniswap_url?: string
  is_active: boolean
}

export default function LiquidityPoolManagement() {
  const { showToast } = useToast()
  const [pools, setPools] = useState<LiquidityPool[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [uniswapUrl, setUniswapUrl] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all')

  useEffect(() => {
    fetchPools()
  }, [selectedNetwork])

  const fetchPools = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const url = selectedNetwork === 'all' 
        ? '/api/admin/pools'
        : `/api/admin/pools?network=${selectedNetwork}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPools(data.pools)
      } else {
        showToast('Failed to fetch pools', 'error')
      }
    } catch (error) {
      showToast('Error fetching pools', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPool = async () => {
    if (!uniswapUrl) {
      showToast('Please enter Uniswap pool URL', 'error')
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/pools', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uniswapUrl }),
      })

      if (response.ok) {
        showToast('Pool added successfully', 'success')
        setShowAddModal(false)
        setUniswapUrl('')
        fetchPools()
      } else {
        const data = await response.json()
        showToast(data.message || 'Failed to add pool', 'error')
      }
    } catch (error) {
      showToast('Error adding pool', 'error')
    }
  }

  const handleDeletePool = async (poolId: string) => {
    if (!confirm('Are you sure you want to delete this pool?')) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/pools', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: poolId }),
      })

      if (response.ok) {
        showToast('Pool deleted successfully', 'success')
        fetchPools()
      } else {
        showToast('Failed to delete pool', 'error')
      }
    } catch (error) {
      showToast('Error deleting pool', 'error')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading pools...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Liquidity Pool Management</CardTitle>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Pool
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Network Filter */}
        <div className="mb-4">
          <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by network" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Networks</SelectItem>
              <SelectItem value="BEP20">BEP-20</SelectItem>
              <SelectItem value="ERC20">ERC-20</SelectItem>
              <SelectItem value="SOL">SOL</SelectItem>
              <SelectItem value="UNISWAP">UNISWAP</SelectItem>
              <SelectItem value="TRX">TRX</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pools Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-sm font-medium">Pool</th>
                <th className="text-left p-3 text-sm font-medium">Network</th>
                <th className="text-left p-3 text-sm font-medium">TVL</th>
                <th className="text-left p-3 text-sm font-medium">Volume 24h</th>
                <th className="text-left p-3 text-sm font-medium">Fees 24h</th>
                <th className="text-left p-3 text-sm font-medium">APR</th>
                <th className="text-left p-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((pool) => (
                <tr key={pool.id} className="border-b border-border hover:bg-accent/50">
                  <td className="p-3 text-sm">
                    {pool.token0_symbol}/{pool.token1_symbol}
                  </td>
                  <td className="p-3 text-sm">{pool.network}</td>
                  <td className="p-3 text-sm">${pool.tvl_usd.toLocaleString()}</td>
                  <td className="p-3 text-sm">${pool.volume_24h_usd.toLocaleString()}</td>
                  <td className="p-3 text-sm">${pool.fees_24h_usd.toLocaleString()}</td>
                  <td className="p-3 text-sm">{pool.apr.toFixed(2)}%</td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePool(pool.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Pool Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Liquidity Pool</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Uniswap Pool URL
                </label>
                <Input
                  value={uniswapUrl}
                  onChange={(e) => setUniswapUrl(e.target.value)}
                  placeholder="https://app.uniswap.org/pools/..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the full URL of the pool from Uniswap.org
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPool}>Add Pool</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

