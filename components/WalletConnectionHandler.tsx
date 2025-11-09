// components/WalletConnectionHandler.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export function WalletConnectionHandler() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { login, isAuthenticated, user } = useAuthStore()
  const processingRef = useRef(false)

  useEffect(() => {
    // Only handle wallet connection if:
    // 1. Wallet is connected
    // 2. User is not authenticated OR user is authenticated but doesn't have a wallet address
    // 3. Not currently processing
    // 4. Don't auto-connect if user registered via email (to avoid unwanted wallet linking)
    if (isConnected && address && !isAuthenticated && !processingRef.current) {
      // Only auto-connect if user explicitly connected wallet (not during email registration)
      // Check if we're in the middle of email registration
      const isEmailRegistration = typeof window !== 'undefined' && 
        (sessionStorage.getItem('registrationEmail') || localStorage.getItem('tempToken'))
      
      if (!isEmailRegistration) {
        handleWalletAuth(address)
      }
    }
  }, [isConnected, address, isAuthenticated])

  const handleWalletAuth = async (walletAddress: string) => {
    if (processingRef.current) return
    processingRef.current = true

    try {
      // Check if user exists with this wallet
      const response = await fetch('/api/auth/wallet/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // If user needs nickname, redirect to nickname page
        if (!data.user.nickname) {
          router.push('/auth/nickname?wallet=' + encodeURIComponent(walletAddress))
          return
        }

        // Login user
        login(data.user, data.token)
        
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        // User doesn't exist, need to register
        const errorData = await response.json()
        if (errorData.message?.includes('not found') || response.status === 404) {
          // Redirect to nickname page for new wallet user
          router.push('/auth/nickname?wallet=' + encodeURIComponent(walletAddress))
        }
      }
    } catch (error) {
      console.error('Wallet auth error:', error)
    } finally {
      processingRef.current = false
    }
  }

  return null
}

