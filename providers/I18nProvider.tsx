// providers/I18nProvider.tsx
'use client'

import React, { useEffect } from 'react'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslations from '@/lib/i18n/locales/en.json'
import ruTranslations from '@/lib/i18n/locales/ru.json'
import cnTranslations from '@/lib/i18n/locales/cn.json'

// Initialize i18n if not already initialized
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
                  resources: {
                    en: {
                      translation: enTranslations,
                    },
                    ru: {
                      translation: ruTranslations,
                    },
                    cn: {
                      translation: cnTranslations,
                    },
                  },
      lng: typeof window !== 'undefined' ? localStorage.getItem('i18nextLng') || 'en' : 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    })
}

interface I18nProviderProps {
  children: React.ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    // Save language preference to localStorage
    const handleLanguageChange = (lng: string) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('i18nextLng', lng)
      }
    }

    i18n.on('languageChanged', handleLanguageChange)

    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [])

  return <>{children}</>
}

