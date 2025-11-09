// components/modals/WalletConnectSection.tsx
'use client'

import React from 'react'
import { useTranslation } from 'react-i18next'
import { FiArrowRight } from 'react-icons/fi'
import Image from 'next/image'

interface WalletConnectSectionProps {
  onConnect?: () => void
}

const WalletConnectSection: React.FC<WalletConnectSectionProps> = ({ onConnect }) => {
  const { t } = useTranslation()

  const walletProviders = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      bgColor: 'bg-orange-100',
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '💙',
      bgColor: 'bg-blue-100',
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      bgColor: 'bg-blue-100',
    },
    {
      id: 'binance',
      name: 'Binance Wallet',
      icon: '🟡',
      bgColor: 'bg-yellow-100',
    },
    {
      id: 'uniswap',
      name: 'Uniswap Wallet',
      icon: '🦄',
      bgColor: 'bg-pink-100',
    },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {walletProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={onConnect}
            className="flex items-center justify-center space-x-2 p-3 rounded-lg border border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all group"
          >
            <div className={`w-8 h-8 ${provider.bgColor} rounded-full flex items-center justify-center`}>
              <span className="text-lg">{provider.icon}</span>
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-amber-600">
              {provider.name}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={onConnect}
        className="w-full py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-all flex items-center justify-center space-x-2"
      >
        <span>💼</span>
        <span>{t('auth.connectWallet')}</span>
        <FiArrowRight className="w-4 h-4" />
      </button>

      <p className="text-xs text-gray-500 text-center mt-4">
        {t('auth.walletSecurityNote')}
      </p>
    </div>
  )
}

export default WalletConnectSection
