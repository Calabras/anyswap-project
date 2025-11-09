// components/admin/UserManagement.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { Ban, CheckCircle, DollarSign, Edit } from 'lucide-react'

interface User {
  id: string
  email?: string
  wallet_address?: string
  nickname?: string
  balance_usd: number | null | undefined
  email_verified: boolean
  created_at: string
  last_login_at?: string
  ip_address?: string
  is_banned: boolean
  auth_type: string
}

export default function UserManagement() {
  const { showToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [balanceChange, setBalanceChange] = useState('')
  const [balanceAction, setBalanceAction] = useState<'add' | 'subtract'>('add')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        showToast('Not authenticated', 'error')
        return
      }
      
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        showToast('Failed to fetch users', 'error')
      }
    } catch (error) {
      showToast('Error fetching users', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleBalanceChange = async () => {
    if (!selectedUser || !balanceChange) return

    try {
      const token = localStorage.getItem('authToken')
    const response = await fetch('/api/admin/users/balance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: parseFloat(balanceChange),
          action: balanceAction,
        }),
      })

      if (response.ok) {
        showToast('Balance updated successfully', 'success')
        setShowBalanceModal(false)
        setBalanceChange('')
        fetchUsers()
      } else {
        const data = await response.json()
        showToast(data.message || 'Failed to update balance', 'error')
      }
    } catch (error) {
      showToast('Error updating balance', 'error')
    }
  }

  const handleBanUser = async (userId: string, ban: boolean) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/users/ban', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, ban }),
      })

      if (response.ok) {
        showToast(ban ? 'User banned' : 'User unbanned', 'success')
        fetchUsers()
      } else {
        showToast('Failed to update user status', 'error')
      }
    } catch (error) {
      showToast('Error updating user status', 'error')
    }
  }

  const handleVerifyEmail = async (userId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/users/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        showToast('Email verified successfully', 'success')
        fetchUsers()
      } else {
        showToast('Failed to verify email', 'error')
      }
    } catch (error) {
      showToast('Error verifying email', 'error')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-sm font-medium">Email/Wallet</th>
                <th className="text-left p-3 text-sm font-medium">Nickname</th>
                <th className="text-left p-3 text-sm font-medium">Balance</th>
                <th className="text-left p-3 text-sm font-medium">Registered</th>
                <th className="text-left p-3 text-sm font-medium">Last Login</th>
                <th className="text-left p-3 text-sm font-medium">IP</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-accent/50">
                  <td className="p-3 text-sm">
                    {user.email || user.wallet_address || 'N/A'}
                  </td>
                  <td className="p-3 text-sm">{user.nickname || 'N/A'}</td>
                  <td className="p-3 text-sm">${(Number(user.balance_usd) || 0).toFixed(2)}</td>
                  <td className="p-3 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-sm">
                    {user.last_login_at 
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="p-3 text-sm">{user.ip_address || 'N/A'}</td>
                  <td className="p-3 text-sm">
                    <div className="flex items-center gap-2">
                      {user.email_verified ? (
                        <span className="text-green-400">Verified</span>
                      ) : (
                        <span className="text-yellow-400">Unverified</span>
                      )}
                      {user.is_banned && (
                        <span className="text-red-400">Banned</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user)
                          setShowBalanceModal(true)
                        }}
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Balance
                      </Button>
                      {!user.email_verified && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerifyEmail(user.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verify
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBanUser(user.id, !user.is_banned)}
                      >
                        <Ban className="h-3 w-3 mr-1" />
                        {user.is_banned ? 'Unban' : 'Ban'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Balance Change Modal */}
        <Dialog open={showBalanceModal} onOpenChange={setShowBalanceModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Balance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  User: {selectedUser?.email || selectedUser?.wallet_address}
                </label>
                <label className="block text-sm font-medium mb-2">
                  Current Balance: ${(Number(selectedUser?.balance_usd) || 0).toFixed(2)}
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Action</label>
                <div className="flex gap-2">
                  <Button
                    variant={balanceAction === 'add' ? 'default' : 'outline'}
                    onClick={() => setBalanceAction('add')}
                  >
                    Add
                  </Button>
                  <Button
                    variant={balanceAction === 'subtract' ? 'default' : 'outline'}
                    onClick={() => setBalanceAction('subtract')}
                  >
                    Subtract
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Amount (USD)</label>
                <Input
                  type="number"
                  value={balanceChange}
                  onChange={(e) => setBalanceChange(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBalanceModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBalanceChange}>
                  {balanceAction === 'add' ? 'Add' : 'Subtract'} Balance
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

