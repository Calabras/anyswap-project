// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { I18nProvider } from '@/providers/I18nProvider'
import { ToastProvider } from '@/components/ToastProvider'

export const metadata: Metadata = {
  title: 'AnySwap - Liquidity Management Platform',
  description: 'Advanced liquidity pool management for Uniswap V3',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <I18nProvider>
          <Providers>
            <ToastProvider>
            <div className="min-h-screen bg-background flex flex-col">
              <Header />
              <main className="container mx-auto px-4 py-8 flex-1">
                {children}
              </main>
              <Footer />
            </div>
            </ToastProvider>
          </Providers>
        </I18nProvider>
      </body>
    </html>
  )
}
