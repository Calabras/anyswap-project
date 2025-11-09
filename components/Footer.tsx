// components/Footer.tsx
'use client'

import React from 'react'
import { MessageCircle, Twitter, MessageSquare, Youtube, Instagram } from 'lucide-react'
import Link from 'next/link'

const Footer: React.FC = () => {
  const socialLinks = [
    { name: 'Telegram', icon: MessageCircle, url: '#' },
    { name: 'Twitter', icon: Twitter, url: '#' },
    { name: 'Discord', icon: MessageSquare, url: '#' },
    { name: 'YouTube', icon: Youtube, url: '#' },
    { name: 'Instagram', icon: Instagram, url: '#' },
  ]

  return (
    <footer className="border-t border-border mt-16 bg-card/30">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left - Copyright */}
          <div className="text-center md:text-left">
            <div className="text-lg font-bold text-primary glow-text mb-1">AnySwap</div>
            <div className="text-sm text-muted-foreground">
              © 2025 All Rights Reserved
            </div>
          </div>

          {/* Right - Social Links */}
          <div className="flex items-center gap-6">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <social.icon className="h-5 w-5" />
                <span className="text-sm font-medium hidden md:inline">{social.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

