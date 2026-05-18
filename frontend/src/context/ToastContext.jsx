import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

let toastId = 0

const iconMap = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
}

const colorMap = {
  success: '#00f593',
  error: '#ff3355',
  info: '#00aaff',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div style={styles.container}>
        {toasts.map((t) => (
          <div key={t.id} style={{ ...styles.toast, borderLeft: `3px solid ${colorMap[t.type]}` }}>
            <span style={styles.icon}>{iconMap[t.type]}</span>
            <span style={styles.msg}>{t.message}</span>
            <div style={{ ...styles.progress, background: colorMap[t.type] }} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

const styles = {
  container: {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 20px 14px 16px',
    borderRadius: 10,
    fontSize: 14,
    background: 'rgba(14, 14, 24, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    animation: 'slideIn 0.35s ease',
    minWidth: 280,
    position: 'relative',
    overflow: 'hidden',
    color: '#e8e8f0',
  },
  icon: { fontSize: 16, flexShrink: 0 },
  msg: { flex: 1 },
  progress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    width: '100%',
    animation: 'shimmer 3.5s linear forwards',
    opacity: 0.4,
  },
}
