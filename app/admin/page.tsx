// app/admin/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, CreditCard, Layers, Settings } from 'lucide-react'
import UserManagement from '@/components/admin/UserManagement'
import PaymentSystemManagement from '@/components/admin/PaymentSystemManagement'
import PoolManagement from '@/components/admin/PoolManagement'
import SiteSettings from '@/components/admin/SiteSettings'

export default function AdminPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    // Check if user is admin
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (!token) {
          router.push('/')
          return
        }

        const response = await fetch('/api/admin/check', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          setIsAdmin(data.isAdmin)
          if (!data.isAdmin) {
            router.push('/dashboard')
          }
        } else {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Admin check error:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [isAuthenticated, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 glow-text">
            Admin Panel
          </h1>
          <p className="text-muted-foreground">Manage users, payment systems, and liquidity pools</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="pools" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Pools
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentSystemManagement />
          </TabsContent>

          <TabsContent value="pools">
            <PoolManagement />
          </TabsContent>

          <TabsContent value="settings">
            <SiteSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

