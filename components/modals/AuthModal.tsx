// components/modals/AuthModal.tsx
'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet, ArrowRight, Mail } from 'lucide-react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import EmailAuthForm from './EmailAuthForm'

interface AuthModalProps {
  onClose: () => void
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { t } = useTranslation()
  const { openConnectModal } = useConnectModal()
  const [showEmailForm, setShowEmailForm] = useState(false)

  const walletOptions = [
    {
      name: 'Uniswap Wallet',
      icon: '🦄',
      logo: 'https://app.uniswap.org/favicon.png',
    },
    {
      name: 'WalletConnect',
      icon: '🔗',
      logo: 'https://avatars.githubusercontent.com/u/37784886?s=200&v=4',
    },
    {
      name: 'Coinbase Wallet',
      icon: '💙',
      logo: 'https://wallet.coinbase.com/favicon.ico',
      isCoinbase: true, // Special flag for Coinbase styling
    },
    {
      name: 'MetaMask',
      icon: '🦊',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    },
    {
      name: 'Binance',
      icon: '💰',
      logo: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
    },
    {
      name: 'Trust Wallet',
      icon: '🛡️',
      logo: 'https://trustwallet.com/assets/images/media/assets/TWT.png',
    },
  ]

  const handleEmailSuccess = () => {
    onClose()
    // Reload to update auth state
    window.location.reload()
  }

  if (showEmailForm) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl glow-text">
              {t('auth.joinAnySwap', 'Join AnySwap')}
            </DialogTitle>
          </DialogHeader>
          <EmailAuthForm
            initialEmail=""
            onBack={() => setShowEmailForm(false)}
            onSuccess={handleEmailSuccess}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl glow-text">
            {t('auth.joinAnySwap', 'Join AnySwap')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email Registration Section */}
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder={t('auth.emailPlaceholder', 'Enter your email')}
                className="pl-9"
                required
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const emailInput = e.currentTarget as HTMLInputElement
                    const email = emailInput.value?.trim() || ''
                    
                    // Validate email format before proceeding
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    if (email && emailRegex.test(email)) {
                      sessionStorage.setItem('registrationEmail', email)
                      setShowEmailForm(true)
                    }
                  }
                }}
              />
            </div>
            <Button
              onClick={() => {
                const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement
                const email = emailInput?.value?.trim() || ''
                
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (!email || !emailRegex.test(email)) {
                  return // Don't proceed if email is invalid
                }
                
                setShowEmailForm(true)
                // Store email to pass to EmailAuthForm
                if (email) {
                  sessionStorage.setItem('registrationEmail', email)
                }
              }}
              className="w-full glow-border"
              variant="outline"
            >
              <Mail className="mr-2 h-4 w-4" />
              {t('auth.registerLoginWithEmail', 'Register/Login with Email')}
            </Button>
          </div>

          {/* OR Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {t('auth.or', 'OR')}
              </span>
            </div>
          </div>

          {/* Wallet Options - First Row */}
          <div className="grid grid-cols-3 gap-3">
            {walletOptions.slice(0, 3).map((wallet) => (
              <button
                key={wallet.name}
                onClick={openConnectModal}
                className="flex flex-col items-center justify-center p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-all group glow-border"
              >
                <div className={`w-12 h-12 mb-2 flex items-center justify-center rounded-full overflow-hidden ${
                  (wallet as any).isCoinbase 
                    ? 'bg-[#0052FF]' 
                    : 'bg-card'
                }`}>
                  {wallet.logo ? (
                    <img
                      src={wallet.logo}
                      alt={wallet.name}
                      className={`w-full h-full object-cover ${
                        (wallet as any).isCoinbase 
                          ? 'p-2.5' 
                          : 'p-2'
                      }`}
                      style={(wallet as any).isCoinbase ? { filter: 'brightness(0) invert(1)' } : {}}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement
                        target.style.display = 'none'
                        const fallback = document.createElement('span')
                        fallback.textContent = wallet.icon
                        fallback.className = 'text-2xl'
                        target.parentElement?.appendChild(fallback)
                      }}
                    />
                  ) : (
                    <span className="text-2xl">{wallet.icon}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground text-center">
                  {wallet.name}
                </span>
              </button>
            ))}
          </div>

          {/* Wallet Options - Second Row */}
          <div className="grid grid-cols-3 gap-3">
            {walletOptions.slice(3, 6).map((wallet) => (
              <button
                key={wallet.name}
                onClick={openConnectModal}
                className="flex flex-col items-center justify-center p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-all group glow-border"
              >
                <div className="w-12 h-12 mb-2 flex items-center justify-center rounded-full bg-card overflow-hidden">
                  {wallet.logo ? (
                    <img
                      src={wallet.logo}
                      alt={wallet.name}
                      className="w-full h-full object-cover p-2"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement
                        target.style.display = 'none'
                        const fallback = document.createElement('span')
                        fallback.textContent = wallet.icon
                        fallback.className = 'text-2xl'
                        target.parentElement?.appendChild(fallback)
                      }}
                    />
                  ) : (
                    <span className="text-2xl">{wallet.icon}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground text-center">
                  {wallet.name}
                </span>
              </button>
            ))}
          </div>

          {/* Connect Wallet Button */}
          <Button
            onClick={openConnectModal}
            className="w-full glow-border"
            size="lg"
          >
            <Wallet className="mr-2 h-5 w-5" />
            {t('auth.connectWallet', 'Connect Wallet')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          {/* Disclaimer */}
          <p className="text-xs text-center text-muted-foreground">
            {t('auth.disclaimer', 'Your funds remain in your wallet. We never have access to your private keys.')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AuthModal
