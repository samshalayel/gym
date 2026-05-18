import React from 'react'
import { useI18n } from '../context/I18nContext'

export default function AuthLayout({ children }) {
  const { t, locale, setLocale } = useI18n()
  const isRtl = locale === 'ar'

  return (
    <div style={{ ...styles.container, direction: isRtl ? 'rtl' : 'ltr' }}>
      <div style={styles.gridBg} />
      <div style={styles.accentLine} />
      <button onClick={() => setLocale(isRtl ? 'en' : 'ar')} style={styles.langToggle}>
        {isRtl ? 'EN' : 'AR'}
      </button>
      <div style={styles.card}>
        <div style={styles.cardGlow} />
        <div style={styles.logo}>
          <span style={styles.logoIcon}>💪</span>
        </div>
        <h1 style={styles.title}>{t('app.title')}</h1>
        <p style={styles.subtitle}>{t('auth.welcome')}</p>
        {children}
        <div style={styles.footer}>
          <span style={styles.footerLine} />
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#08080e',
    position: 'relative',
    overflow: 'hidden',
  },
  gridBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: `
      linear-gradient(rgba(0, 245, 212, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 245, 212, 0.03) 1px, transparent 1px)
    `,
    backgroundSize: '60px 60px',
  },
  accentLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    background: 'linear-gradient(90deg, transparent, #00f5d4, #ffd60a, transparent)',
  },
  langToggle: {
    position: 'absolute',
    top: 24,
    right: 24,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '8px 18px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    color: '#6b6b80',
    letterSpacing: '1px',
    zIndex: 10,
    transition: 'all 0.2s',
  },
  card: {
    position: 'relative',
    background: 'rgba(14, 14, 24, 0.9)',
    backdropFilter: 'blur(40px)',
    borderRadius: 20,
    padding: '52px 44px',
    width: 420,
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
    zIndex: 1,
    animation: 'fadeUp 0.6s ease',
  },
  cardGlow: {
    position: 'absolute',
    top: -80,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 200,
    height: 200,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,245,212,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  logo: {
    textAlign: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 56,
    display: 'inline-block',
    filter: 'drop-shadow(0 0 20px rgba(0,245,212,0.3))',
  },
  title: {
    fontFamily: "var(--font-heading)",
    textAlign: 'center',
    fontSize: 36,
    fontWeight: 400,
    color: '#fff',
    marginBottom: 4,
    letterSpacing: '2px',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b6b80',
    marginBottom: 36,
  },
  footer: {
    marginTop: 32,
    textAlign: 'center',
  },
  footerLine: {
    display: 'inline-block',
    width: 40,
    height: 1,
    background: 'rgba(255,255,255,0.1)',
  },
}
