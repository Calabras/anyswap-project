'use client'

import Link from 'next/link'
import { Frown } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="mb-4 text-9xl font-bold text-yellow-500 drop-shadow-lg">404</h1>
        <h2 className="mb-4 text-3xl font-semibold text-foreground">Page Not Found</h2>
        <p className="mb-8 text-lg text-muted-foreground">
          The page you are looking for does not exist.
        </p>
        <Link href="/">
          <button className="glow-border bg-gradient-to-r from-yellow-500 to-amber-400 px-6 py-3 text-lg font-semibold text-black transition-all hover:from-yellow-400 hover:to-amber-300">
            Go Home
          </button>
        </Link>
      </div>
    </div>
  )
}
