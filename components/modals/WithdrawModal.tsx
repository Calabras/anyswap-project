// components/modals/WithdrawModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUp } from 'lucide-react'
import { useToast } from '@/components/ToastProvider'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
}

type Currency = 'USDT_BEP20' | 'USDT_ERC20' | 'USDT_TRC20' | 'TRX' | 'LTC' | 'ETH' | 'BTC'

const currencies: { value: Currency; label: string; network: string }[] = [
  { value: 'USDT_BEP20', label: 'USDT', network: 'BEP-20' },
  { value: 'USDT_ERC20', label: 'USDT', network: 'ERC-20' },
  { value: 'USDT_TRC20', label: 'USDT', network: 'TRC-20' },
  { value: 'TRX', label: 'TRX', network: 'TRON' },
  { value: 'LTC', label: 'LTC', network: 'Litecoin' },
  { value: 'ETH', label: 'ETH', network: 'Ethereum' },
  { value: 'BTC', label: 'BTC', network: 'Bitcoin' },
]

export default function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USDT_ERC20')
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [commission, setCommission] = useState<number>(3) // 3% комиссия
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const handleOpenModal = () => {
      // Модальное окно открывается через событие
    }

    window.addEventListener('openWithdrawModal', handleOpenModal)
    return () => window.removeEventListener('openWithdrawModal', handleOpenModal)
  }, [])

  const calculateTotal = () => {
    const numAmount = parseFloat(amount) || 0
    const commissionAmount = (numAmount * commission) / 100
    return numAmount - commissionAmount
  }

  const handleWithdraw = async () => {
    if (!walletAddress || !walletAddress.trim()) {
      showToast(t('withdraw.error', 'Enter wallet address'), 'error')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      showToast(t('withdraw.amountError', 'Enter a valid amount'), 'error')
      return
    }

    setIsProcessing(true)

    try {
      // Здесь будет создание заявки на вывод
      // Пока симулируем создание заявки
      await new Promise((resolve) => setTimeout(resolve, 1500))

      showToast(t('withdraw.success', 'Withdrawal request created'), 'success')
      onClose()
      
      // Сброс формы
      setWalletAddress('')
      setAmount('')
    } catch (error) {
      showToast(t('withdraw.withdrawError', 'Error creating withdrawal request'), 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const selectedCurrencyInfo = currencies.find((c) => c.value === selectedCurrency)

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl glow-text">
            {t('withdraw.title', 'Withdraw Funds')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Currency Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              {t('withdraw.currency', 'Currency to withdraw')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {currencies.map((currency) => (
                <button
                  key={currency.value}
                  onClick={() => setSelectedCurrency(currency.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-left glow-border ${
                    selectedCurrency === currency.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <div className="font-medium text-sm text-foreground">{currency.label}</div>
                  <div className="text-xs text-muted-foreground">{currency.network}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Wallet Address */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('withdraw.walletAddress', 'Wallet Address')}
            </label>
            <Input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={t('withdraw.walletAddressPlaceholder', 'Enter {{network}} wallet address', { 
                network: selectedCurrencyInfo?.network 
              })}
              className="font-mono text-sm"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('withdraw.amount', 'Withdrawal Amount (USD)')}
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {/* Commission Info */}
          {amount && parseFloat(amount) > 0 && (
            <Card className="bg-primary/10 border-primary/20 glow-border">
                      <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                {t('withdraw.commission', 'Commission:')}
                              </span>
                              <span className="font-medium text-foreground">{commission}%</span>
                            </div>
                            <div className="flex justify-between text-lg font-semibold">
                              <span className="text-foreground">
                                {t('withdraw.totalToWithdraw', 'Total amount to withdraw:')}
                              </span>
                              <span className="text-primary glow-text">${calculateTotal().toFixed(2)}</span>
                            </div>
                          </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleWithdraw}
            disabled={!walletAddress || !amount || parseFloat(amount) <= 0 || isProcessing}
            className="w-full glow-border"
            size="lg"
                      >
                        <ArrowUp className="w-5 h-5 mr-2" />
                        {isProcessing ? t('withdraw.processing', 'Processing...') : t('withdraw.button', 'Withdraw')}
                      </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

