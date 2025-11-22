// components/Header.tsx
'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, Globe, User, LogOut, ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import AuthModal from './modals/AuthModal'
import WithdrawModal from './modals/WithdrawModal'
import { useAuthStore } from '@/store/authStore'
import UserMenu from './UserMenu'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const Header: React.FC = () => {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const { user, isAuthenticated } = useAuthStore()

  const languages = [
    { code: 'en', name: 'EN', flag: '🇬🇧' },
    { code: 'ru', name: 'RU', flag: '🇷🇺' },
    { code: 'cn', name: 'CN', flag: '🇨🇳' },
  ]

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    setShowLangMenu(false)
  }

  return (
    <>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Navigation */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="text-2xl font-bold text-primary glow-text">
                  AnySwap
                </div>
              </Link>

              {/* Navigation */}
              <nav className="hidden md:flex items-center gap-2">
                <Link href="/">
                  <Button variant="ghost" className="text-base font-semibold">
                    All Pools
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  className="text-base font-semibold"
                  onClick={() => {
                    if (isAuthenticated) {
                      router.push('/positions')
                    } else {
                      setShowAuthModal(true)
                    }
                  }}
                >
                  {t('nav.positions', 'My Positions')}
                </Button>
              </nav>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Language Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Globe className="h-4 w-4" />
                    {i18n.language.toUpperCase()}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={i18n.language === lang.code ? "bg-accent" : ""}
                    >
                      {lang.flag} {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Auth Button */}
              {!isAuthenticated ? (
                <Button
                  onClick={() => setShowAuthModal(true)}
                  className="gap-2"
                  size="sm"
                >
                  <UserPlus className="h-4 w-4" />
                  {t('header.joinNow')}
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  {/* Admin Button */}
                  {user?.isAdmin && (
                    <Button
                      onClick={() => router.push('/admin')}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <span className="hidden md:inline">Admin</span>
                    </Button>
                  )}
                  
                  {/* Deposit Button */}
                  <Button
                    onClick={() => router.push('/deposit')}
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-yellow-500 to-amber-400 text-black hover:from-yellow-400 hover:to-amber-300"
                  >
                    <ArrowDown className="h-4 w-4" />
                    <span className="hidden md:inline">{t('header.deposit', 'Deposit')}</span>
                  </Button>
                  
                  {/* Withdraw Button */}
                  <Button
                    onClick={() => setShowWithdrawModal(true)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <ArrowUp className="h-4 w-4" />
                    <span className="hidden md:inline">{t('header.withdraw', 'Withdraw')}</span>
                  </Button>
                  
                  {/* User Menu */}
                  <UserMenu user={user} />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
      />
    </>
  )
}

export default Header
