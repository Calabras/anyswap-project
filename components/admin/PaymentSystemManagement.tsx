// components/admin/PaymentSystemManagement.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ToastProvider'
import { Trash2, Edit, Power, PowerOff } from 'lucide-react'

interface PaymentSystem {
  id: string
  name: string
  type: string
  is_active: boolean
  api_key?: string
  api_secret?: string
  config?: any
}

export default function PaymentSystemManagement() {
  const { showToast } = useToast()
  const [systems, setSystems] = useState<PaymentSystem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSystem, setSelectedSystem] = useState<PaymentSystem | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    api_key: '',
    api_secret: '',
  })

  useEffect(() => {
    fetchSystems()
  }, [])

  const fetchSystems = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/payment-systems', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSystems(data.systems)
      } else {
        showToast('Failed to fetch payment systems', 'error')
      }
    } catch (error) {
      showToast('Error fetching payment systems', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (system: PaymentSystem) => {
    setSelectedSystem(system)
    setEditForm({
      name: system.name,
      api_key: system.api_key || '',
      api_secret: system.api_secret || '',
    })
    setShowEditModal(true)
  }

  const handleSave = async () => {
    if (!selectedSystem) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/payment-systems', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedSystem.id,
          ...editForm,
        }),
      })

      if (response.ok) {
        showToast('Payment system updated successfully', 'success')
        setShowEditModal(false)
        fetchSystems()
      } else {
        showToast('Failed to update payment system', 'error')
      }
    } catch (error) {
      showToast('Error updating payment system', 'error')
    }
  }

  const handleToggleActive = async (systemId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/payment-systems/toggle', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: systemId, is_active: !isActive }),
      })

      if (response.ok) {
        showToast(isActive ? 'Payment system disabled' : 'Payment system enabled', 'success')
        fetchSystems()
      } else {
        showToast('Failed to update payment system', 'error')
      }
    } catch (error) {
      showToast('Error updating payment system', 'error')
    }
  }

  const handleDelete = async () => {
    if (!selectedSystem) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/payment-systems', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: selectedSystem.id }),
      })

      if (response.ok) {
        showToast('Payment system deleted successfully', 'success')
        setShowDeleteModal(false)
        fetchSystems()
      } else {
        showToast('Failed to delete payment system', 'error')
      }
    } catch (error) {
      showToast('Error deleting payment system', 'error')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading payment systems...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment System Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-sm font-medium">Name</th>
                <th className="text-left p-3 text-sm font-medium">Type</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {systems.map((system) => (
                <tr key={system.id} className="border-b border-border hover:bg-accent/50">
                  <td className="p-3 text-sm">{system.name}</td>
                  <td className="p-3 text-sm">{system.type}</td>
                  <td className="p-3 text-sm">
                    {system.is_active ? (
                      <span className="text-green-400">Active</span>
                    ) : (
                      <span className="text-red-400">Disabled</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(system.id, system.is_active)}
                      >
                        {system.is_active ? (
                          <PowerOff className="h-3 w-3 mr-1" />
                        ) : (
                          <Power className="h-3 w-3 mr-1" />
                        )}
                        {system.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(system)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSystem(system)
                          setShowDeleteModal(true)
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Payment System</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Payment system name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">API Key</label>
                <Input
                  type="password"
                  value={editForm.api_key}
                  onChange={(e) => setEditForm({ ...editForm, api_key: e.target.value })}
                  placeholder="API Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">API Secret</label>
                <Input
                  type="password"
                  value={editForm.api_secret}
                  onChange={(e) => setEditForm({ ...editForm, api_secret: e.target.value })}
                  placeholder="API Secret"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Payment System</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete {selectedSystem?.name}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

