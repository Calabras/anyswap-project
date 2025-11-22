// app/deposit/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CreditCard, DollarSign } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ToastProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

type PaymentMethod = 'cryptomus' | 'card' | 'test'

export default function DepositPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const { showToast } = useToast()
  
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cryptomus')
  const [amount, setAmount] = useState<string>('')
  const [commission, setCommission] = useState<number>(3) // 3% комиссия
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const calculateTotal = () => {
    const numAmount = parseFloat(amount) || 0
    const commissionAmount = (numAmount * commission) / 100
    return numAmount + commissionAmount
  }

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showToast(t('deposit.error', 'Enter a valid amount'), 'error')
      return
    }

    setIsProcessing(true)

    try {
      // Redirect to cryptomus.com for payment
      if (selectedMethod === 'cryptomus') {
        // TODO: Integrate with Cryptomus API
        // For now, redirect to cryptomus.com
        window.open('https://cryptomus.com', '_blank')
        
        // Simulate successful deposit after redirect
        // In production, this would be handled by webhook from Cryptomus
        setTimeout(() => {
          showToast(t('deposit.success', 'Deposit of {{amount}}$ successful', { amount }), 'success')
          router.push('/dashboard')
        }, 2000)
      } else if (selectedMethod === 'card') {
        // TODO: Integrate with Vanilapay API
        // For now, simulate payment
        await new Promise((resolve) => setTimeout(resolve, 2000))
        showToast(t('deposit.success', 'Deposit of {{amount}}$ successful', { amount }), 'success')
        router.push('/dashboard')
      } else if (selectedMethod === 'test') {
        // Test payment - instantly add balance
        try {
          const token = localStorage.getItem('authToken')
          if (!token) {
            showToast(t('deposit.depositError', 'Error depositing balance'), 'error')
            return
          }

          const response = await fetch('/api/deposit/test', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount: parseFloat(amount) }),
          })

          if (response.ok) {
            const data = await response.json()
              showToast(t('deposit.success', 'Deposit of {{amount}}$ successful', { amount }), 'success')
              // Update user balance in store if needed
              router.push('/dashboard')
          } else {
            const errorData = await response.json()
            showToast(errorData.message || t('deposit.depositError', 'Error depositing balance'), 'error')
          }
        } catch (error) {
          console.error('Deposit error:', error)
          showToast(t('deposit.depositError', 'Error depositing balance'), 'error')
        }
      }
    } catch (error) {
      console.error('Deposit error:', error)
      showToast(t('deposit.depositError', 'Error depositing balance'), 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('deposit.back', 'Back')}</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2 glow-text">
            {t('deposit.title', 'Deposit Balance')}
          </h1>
          <p className="text-muted-foreground">
            {t('deposit.subtitle', 'Choose payment method and enter deposit amount')}
          </p>
        </div>

        {/* Payment Methods */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('deposit.paymentMethod', 'Payment Method')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Cryptomus */}
              <button
                onClick={() => setSelectedMethod('cryptomus')}
                className={`p-4 rounded-lg border-2 transition-all glow-border ${
                  selectedMethod === 'cryptomus'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <span className="font-medium text-sm">Cryptomus</span>
                  <span className="text-xs text-muted-foreground">
                    {t('deposit.cryptocurrencies', 'Cryptocurrencies')}
                  </span>
                </div>
              </button>

              {/* Bank Cards */}
              <button
                onClick={() => setSelectedMethod('card')}
                className={`p-4 rounded-lg border-2 transition-all glow-border ${
                  selectedMethod === 'card'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <span className="font-medium text-sm">
                    {t('deposit.bankCards', 'Bank Cards')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t('deposit.russia', 'Russia')}
                  </span>
                </div>
              </button>

              {/* Test Payment */}
              <button
                onClick={() => setSelectedMethod('test')}
                className={`p-4 rounded-lg border-2 transition-all glow-border ${
                  selectedMethod === 'test'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-400" />
                  </div>
                  <span className="font-medium text-sm">
                    {t('deposit.test', 'Test')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t('deposit.free', 'Free')}
                  </span>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Amount Input */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('deposit.amount', 'Deposit Amount')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('deposit.amountLabel', 'Amount (USD)')}
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="text-lg pr-16"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">
                  USD
                </span>
              </div>
            </div>

            {/* Commission Info */}
            {amount && parseFloat(amount) > 0 && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2 glow-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('deposit.commission', 'Commission:')}
                  </span>
                  <span className="font-medium text-foreground">{commission}%</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span className="text-foreground">
                    {t('deposit.totalToPay', 'Total amount to pay:')}
                  </span>
                  <span className="text-primary glow-text">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={handleDeposit}
          disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
          className="w-full glow-border"
          size="lg"
        >
          {isProcessing ? t('deposit.processing', 'Processing...') : t('deposit.pay', 'Pay')}
        </Button>
      </div>
    </div>
  )
}

