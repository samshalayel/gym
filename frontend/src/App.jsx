import React from 'react'
import { I18nProvider } from './context/I18nContext'
import { ToastProvider } from './context/ToastContext'
import AppRouter from './routes/AppRouter'

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </I18nProvider>
  )
}
