import React, { createContext, useContext, useEffect, useState } from 'react'
import ar from '../translations/ar'
import en from '../translations/en'

const translations = { ar, en }
const I18nContext = createContext()

export function I18nProvider({ children }) {
  const saved = localStorage.getItem('locale')
  const [locale, setLocale] = useState(saved || 'ar')

  useEffect(() => {
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
  }, [locale])

  const changeLocale = (l) => {
    setLocale(l)
    localStorage.setItem('locale', l)
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = l
  }

  const t = (key, fallback) => {
    const keys = key.split('.')
    let val = translations[locale]
    for (const k of keys) {
      val = val?.[k]
    }
    return val || fallback || key
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale: changeLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
