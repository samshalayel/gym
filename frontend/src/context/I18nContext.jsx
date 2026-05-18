import React, { createContext, useContext, useState } from 'react'
import ar from '../translations/ar'
import en from '../translations/en'

const translations = { ar, en }
const I18nContext = createContext()

export function I18nProvider({ children }) {
  const saved = localStorage.getItem('locale')
  const [locale, setLocale] = useState(saved || 'en')

  const changeLocale = (l) => {
    setLocale(l)
    localStorage.setItem('locale', l)
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = l
  }

  const t = (key) => {
    const keys = key.split('.')
    let val = translations[locale]
    for (const k of keys) {
      val = val?.[k]
    }
    return val || key
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale: changeLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
