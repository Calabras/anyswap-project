// components/UserMenu.tsx
'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { useDisconnect } from 'wagmi'
import { User, Settings, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'

interface UserMenuProps {
  user: {
    id: string
    email?: string
    walletAddress?: string
    name?: string
    avatar?: string
    authType: 'email' | 'wallet'
  }
}

const UserMenu: React.FC<UserMenuProps> = ({ user }) => {
  const { t } = useTranslation()
  const { logout } = useAuthStore()
  const { disconnect } = useDisconnect()

  const displayName = user.name || user.email || user.walletAddress?.slice(0, 6) + '...' || 'User'
  const displayAddress = user.walletAddress 
    ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
    : null

  const handleLogout = () => {
    // Disconnect wallet if connected
    try {
      disconnect()
    } catch (error) {
      // Wallet might not be connected, ignore error
      console.log('Wallet disconnect skipped:', error)
    }
    
    // Clear all auth data
    logout()
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken')
      localStorage.removeItem('tempToken')
      localStorage.removeItem('auth-storage')
      sessionStorage.removeItem('registrationEmail')
    }
    
    // Redirect to home page
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden md:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* User Info */}
        <div className="px-2 py-1.5">
          <p className="font-semibold text-sm">{displayName}</p>
          {displayAddress && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">{displayAddress}</p>
          )}
          {user.email && (
            <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {/* Menu Items */}
        <Link href="/profile">
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            {t('menu.profile', 'Profile')}
          </DropdownMenuItem>
        </Link>
        <Link href="/settings">
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            {t('menu.settings', 'Settings')}
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          {t('menu.logout', 'Logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserMenu

