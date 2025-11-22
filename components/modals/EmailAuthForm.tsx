// components/modals/EmailAuthForm.tsx
'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface EmailAuthFormProps {
  initialEmail?: string
  onBack: () => void
  onSuccess: () => void
}

type AuthStep = 'email' | 'verification' | 'password' | 'nickname' | 'complete'

const EmailAuthForm: React.FC<EmailAuthFormProps> = ({ initialEmail = '', onBack, onSuccess }) => {
  const { t } = useTranslation()
  const [step, setStep] = useState<AuthStep>(() => {
    // If email is provided, skip email step and go directly to verification
    const storedEmail = typeof window !== 'undefined' ? sessionStorage.getItem('registrationEmail') : null
    return (initialEmail || storedEmail) ? 'verification' : 'email'
  })
  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedEmail = sessionStorage.getItem('registrationEmail')
      return initialEmail || storedEmail || ''
    }
    return initialEmail || ''
  })
  const [verificationCode, setVerificationCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-send verification code when component mounts with email (only once)
  const [hasAutoSent, setHasAutoSent] = React.useState(false)
  const lastSendAtRef = React.useRef<number>(0)
  const sendingRef = React.useRef<boolean>(false)
  React.useEffect(() => {
    if (email && step === 'verification' && !hasAutoSent) {
      setHasAutoSent(true)
      handleEmailSubmit(undefined, 'auto')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [isLogin, setIsLogin] = useState(false)

  const handleEmailSubmit = async (e?: React.FormEvent, mode: 'auto' | 'manual' = 'manual') => {
    if (e) e.preventDefault()
    // Prevent duplicate immediate sends (debounce)
    const now = Date.now()
    if (sendingRef.current || (now - lastSendAtRef.current) < 2000) {
      return
    }
    // If we already auto-sent when entering verification step, don't auto-send again
    if (mode === 'auto' && hasAutoSent) {
      return
    }
    if (!email) {
      setError('Email is required')
      return
    }
    
    sendingRef.current = true
    lastSendAtRef.current = now
    setLoading(true)
    setError('')

    try {
      // Unified flow: always use register endpoint which handles both new and existing users
      // It will send code regardless of whether user exists or not
      const registerResponse = await fetch('/api/auth/register/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (registerResponse.ok) {
        // Code sent successfully - check if user exists to determine flow
        // We'll check this after verification
        setStep('verification')
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('registrationEmail', email)
        }
      } else {
        const data = await registerResponse.json()
        // If rate limit error, show it
        if (registerResponse.status === 429) {
          setError(data.message || 'Too many attempts. Please try again later.')
        } else {
          setError(data.message || 'Failed to send verification code')
        }
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
      sendingRef.current = false
    }
  }

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // First check if user exists and is verified to determine the right endpoint
      const userCheckResponse = await fetch('/api/auth/check-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      let isVerified = false
      if (userCheckResponse.ok) {
        const userData = await userCheckResponse.json()
        isVerified = userData.emailVerified || false
      }

      // If user is verified, use login endpoint
      if (isVerified) {
        const loginVerifyResponse = await fetch('/api/auth/login/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: verificationCode })
        })

        if (loginVerifyResponse.ok) {
          // User exists and is verified - login flow
          const data = await loginVerifyResponse.json()
          localStorage.setItem('authToken', data.token)
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('registrationEmail')
          }
          
          // Update auth store
          const { useAuthStore } = await import('@/store/authStore')
          useAuthStore.getState().login(data.user, data.token)
          
          setIsLogin(true)
          setStep('complete')
          setTimeout(() => {
            onSuccess()
            // Redirect to admin panel if admin, otherwise dashboard
            if (data.user.isAdmin) {
              window.location.href = '/admin'
            } else {
              window.location.href = '/dashboard'
            }
          }, 2000)
          return
        } else {
          const errorData = await loginVerifyResponse.json()
          setError(errorData.message || 'Invalid verification code')
          return
        }
      }

      // If user is not verified, use registration endpoint
      const registerVerifyResponse = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode })
      })

      if (registerVerifyResponse.ok) {
        // New user or unverified user - registration flow
        const data = await registerVerifyResponse.json()
        // Check if user already has password (from previous incomplete registration)
        const userCheck = await fetch('/api/auth/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })
        
        if (userCheck.ok) {
          const userData = await userCheck.json()
          if (userData.hasPassword) {
            // User has password, skip password step
            setStep('nickname')
          } else {
            // Store token temporarily and continue to password
            localStorage.setItem('tempToken', data.token)
            setStep('password')
          }
        } else {
          // Store token temporarily and continue to password
          localStorage.setItem('tempToken', data.token)
          setStep('password')
        }
      } else {
        const data = await registerVerifyResponse.json()
        setError(data.message || 'Invalid verification code')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Set password for user
      const response = await fetch('/api/auth/register/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
        setStep('nickname')
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to set password')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nickname || nickname.length < 3) {
      setError('Nickname must be at least 3 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Set nickname and complete registration
      const response = await fetch('/api/auth/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nickname })
      })

      if (response.ok) {
        const data = await response.json()
        // Store token and user info
        localStorage.setItem('authToken', data.token)
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('registrationEmail')
        }
        
        // Update auth store
        const { useAuthStore } = await import('@/store/authStore')
        useAuthStore.getState().login(data.user, data.token)
        
        setStep('complete')
        setTimeout(() => {
          onSuccess()
          window.location.href = '/dashboard'
        }, 2000)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to complete registration')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Back Button */}
      {step !== 'complete' && (
        <Button
          onClick={onBack}
          variant="ghost"
          className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{t('auth.back', 'Back')}</span>
        </Button>
      )}

      {/* Email Step */}
      {step === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <h3 className="text-lg font-semibold mb-4 text-foreground">{t('auth.enterYourEmail', 'Enter Your Email')}</h3>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder', 'you@example.com')}
            required
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full glow-border"
            size="lg"
          >
            {loading ? t('auth.sending', 'Sending...') : t('auth.sendCode', 'Send Verification Code')}
          </Button>
        </form>
      )}

      {/* Verification Step */}
      {step === 'verification' && (
        <form onSubmit={handleVerificationSubmit} className="space-y-4">
          <h3 className="text-lg font-semibold mb-2 text-foreground">{t('auth.verifyEmail', 'Verify Your Email')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('auth.verificationCodeSent', 'We sent a 6-digit code to {{email}}', { email })}
          </p>
          
          <div className="flex justify-center space-x-2 mb-4">
            {[...Array(6)].map((_, i) => (
              <Input
                key={i}
                type="text"
                maxLength={1}
                value={verificationCode[i] || ''}
                onChange={(e) => {
                  const newCode = verificationCode.split('')
                  newCode[i] = e.target.value
                  setVerificationCode(newCode.join(''))
                  
                  // Auto-focus next input
                  if (e.target.value && i < 5) {
                    const nextInput = e.target.nextElementSibling as HTMLInputElement
                    if (nextInput) nextInput.focus()
                  }
                }}
                className="w-12 h-12 text-center text-lg font-bold"
              />
            ))}
          </div>
          
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <Button
            type="submit"
            disabled={loading || verificationCode.length !== 6}
            className="w-full glow-border"
            size="lg"
          >
            {loading ? t('auth.verifying', 'Verifying...') : t('auth.continue', 'Continue')}
          </Button>
        </form>
      )}

      {/* Password Step */}
      {step === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <h3 className="text-lg font-semibold mb-4 text-foreground">{t('auth.createPassword', 'Create Your Password')}</h3>
          
          <div className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder', 'Enter password (min 8 characters)')}
                className="pl-10"
                required
                minLength={8}
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirmPasswordPlaceholder', 'Confirm password')}
                className="pl-10"
                required
                minLength={8}
              />
            </div>
          </div>
          
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          
          <div className="mt-2 space-y-1">
            <p className={`text-xs ${password.length >= 8 ? 'text-green-400' : 'text-muted-foreground'}`}>
              ✓ {t('auth.passwordMinLength', 'At least 8 characters')}
            </p>
            <p className={`text-xs ${password && password === confirmPassword ? 'text-green-400' : 'text-muted-foreground'}`}>
              ✓ {t('auth.passwordsMatch', 'Passwords match')}
            </p>
          </div>
          
          <Button
            type="submit"
            disabled={loading || password.length < 8 || password !== confirmPassword}
            className="w-full glow-border"
            size="lg"
          >
            {loading ? t('auth.completing', 'Completing...') : t('auth.continue', 'Continue')}
          </Button>
        </form>
      )}

      {/* Nickname Step */}
      {step === 'nickname' && (
        <form onSubmit={handleNicknameSubmit} className="space-y-4">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            {t('auth.nickname', 'Choose Your Nickname')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('auth.nicknameDescription', 'Your nickname will be used to identify you. It cannot be changed later.')}
          </p>
          
          <Input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t('auth.nicknamePlaceholder', 'Enter your nickname (min 3 characters)')}
            required
            minLength={3}
            maxLength={20}
            autoFocus
          />
          
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          
          <Button
            type="submit"
            disabled={loading || nickname.length < 3}
            className="w-full glow-border"
            size="lg"
          >
            {loading ? t('auth.completing', 'Completing...') : t('auth.completeRegistration', 'Complete Registration')}
          </Button>
        </form>
      )}

      {/* Success Step */}
      {step === 'complete' && (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 glow-border">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-foreground">
            {isLogin ? t('auth.loginSuccess', 'Login successful!') : t('auth.registrationComplete', 'Registration Complete!')}
          </h3>
          <p className="text-muted-foreground">{t('auth.redirecting', 'Redirecting...')}</p>
        </div>
      )}
    </div>
  )
}

export default EmailAuthForm
