// app/auth/nickname/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NicknamePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuthStore()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const walletAddress = searchParams.get('wallet')
  const email = searchParams.get('email')

  useEffect(() => {
    if (!walletAddress && !email) {
      router.push('/')
    }
  }, [walletAddress, email, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nickname || nickname.length < 3) {
      setError('Nickname must be at least 3 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      const endpoint = walletAddress 
        ? '/api/auth/wallet/complete'
        : '/api/auth/register/complete'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nickname,
          ...(walletAddress ? { walletAddress } : { email })
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Login user
        login(data.user, data.token)
        
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to set nickname')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center glow-text">
            Choose Your Nickname
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Your nickname will be used to identify you. It cannot be changed later.
            </p>
            
            <Input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname (min 3 characters)"
              required
              minLength={3}
              maxLength={20}
              autoFocus
              className="text-lg"
            />
            
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            
            <Button
              type="submit"
              disabled={loading || nickname.length < 3}
              className="w-full glow-border"
              size="lg"
            >
              {loading ? 'Completing...' : 'Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

