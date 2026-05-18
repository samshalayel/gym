import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'
import {
  LayoutDashboardIcon,
  UsersIcon,
  FileTextIcon,
  TagsIcon,
  TagIcon,
  DumbbellIcon,
  UserCogIcon,
  CalendarDaysIcon,
  UserCheckIcon,
  HeartPulseIcon,
  AppleIcon,
  LogOutIcon,
} from 'lucide-react'

const navItems = [
  { path: '/', key: 'dashboard', icon: LayoutDashboardIcon },
  { path: '/members', key: 'members', icon: UsersIcon },
  { path: '/plans', key: 'plans', icon: FileTextIcon },
  { path: '/subscriptions', key: 'subscriptions', icon: TagsIcon },
  { path: '/offers', key: 'offers', icon: TagIcon },
  { path: '/equipment', key: 'equipment', icon: DumbbellIcon },
  { path: '/staff', key: 'staff', icon: UserCogIcon },
  { path: '/appointments', key: 'appointments', icon: CalendarDaysIcon },
  { path: '/attendance', key: 'attendance', icon: UserCheckIcon },
  { path: '/workouts', key: 'workouts', icon: HeartPulseIcon },
  { path: '/nutrition', key: 'nutrition', icon: AppleIcon },
]

export default function MainLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t, locale, setLocale } = useI18n()
  const isRtl = locale === 'ar'

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const current = navItems.find(n => n.path === location.pathname)

  return (
    <div style={{ ...styles.container, direction: isRtl ? 'rtl' : 'ltr' }}>
      <div style={styles.header}>
        <div style={styles.neonBar} />

        <div style={styles.headerInner}>
          <div style={styles.logoSection}>
            <div style={styles.logoIconBox}>
              <span style={styles.logoIcon}>💪</span>
            </div>
            <span style={styles.logoText}>IRON<span style={{ color: '#00f5d4' }}>GYM</span></span>
          </div>

          <nav style={styles.nav}>
            {navItems.map((item, i) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    ...styles.navItem,
                    color: isActive ? '#00f5d4' : '#5a5a6a',
                  }}
                >
                  <item.icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                  <span style={{ fontWeight: isActive ? 600 : 400 }}>{t(`nav.${item.key}`)}</span>
                  {isActive && <div style={styles.activeDot} />}
                </Link>
              )
            })}
          </nav>

          <div style={styles.actions}>
            <span style={styles.dateText}>
              {new Date().toLocaleDateString(isRtl ? 'ar' : 'en', {
                month: 'short', day: 'numeric'
              })}
            </span>
            <button onClick={() => setLocale(isRtl ? 'en' : 'ar')} style={styles.langBtn}>
              {isRtl ? 'EN' : 'AR'}
            </button>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              <LogOutIcon size={15} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <div style={styles.main}>
        <div style={styles.topArea}>
          <h1 style={styles.pageTitle}>
            {t(`nav.${current?.key || 'dashboard'}`)}
          </h1>
          <span style={styles.breadcrumb}>{t('app.title')} / {t(`nav.${current?.key || 'dashboard'}`)}</span>
        </div>
        <div style={styles.content}>{children}</div>
      </div>
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#08080e' },
  header: { position: 'relative', flexShrink: 0 },
  neonBar: {
    height: 2,
    background: 'linear-gradient(90deg, transparent 0%, #00f5d4 20%, #ffd60a 50%, #00f5d4 80%, transparent 100%)',
    opacity: 0.7,
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    padding: '0 32px',
    height: 64,
    background: 'rgba(10, 10, 18, 0.98)',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  logoSection: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  logoIconBox: {
    width: 32, height: 32, borderRadius: 8,
    background: 'linear-gradient(135deg, rgba(0,245,212,0.15), rgba(255,214,10,0.1))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 16px rgba(0,245,212,0.08)',
  },
  logoIcon: { fontSize: 16 },
  logoText: {
    fontFamily: 'var(--font-heading)',
    fontSize: 18, fontWeight: 400, color: '#e8e8f0',
    letterSpacing: '2.5px', whiteSpace: 'nowrap',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flex: 1,
    overflowX: 'auto',
    justifyContent: 'center',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: 13,
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: -1,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 16, height: 2,
    borderRadius: 1,
    background: '#00f5d4',
    boxShadow: '0 0 8px rgba(0,245,212,0.5)',
  },
  actions: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  dateText: { fontSize: 12, color: '#3a3a4a', fontWeight: 500 },
  langBtn: {
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: 6, padding: '6px 12px', cursor: 'pointer',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
    background: 'rgba(255,255,255,0.02)', color: '#5a5a6a',
  },
  logoutBtn: {
    border: '1px solid rgba(255,51,85,0.12)',
    borderRadius: 6, padding: '6px 10px', cursor: 'pointer',
    background: 'rgba(255,51,85,0.05)', color: '#ff3355',
    display: 'flex', alignItems: 'center',
  },
  main: { flex: 1, overflow: 'auto' },
  topArea: {
    padding: '28px 32px 0',
  },
  pageTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 32, fontWeight: 400, color: '#e8e8f0',
    letterSpacing: '1.5px', margin: 0, lineHeight: 1,
  },
  breadcrumb: { fontSize: 11, color: '#3a3a4a', marginTop: 8, display: 'block' },
  content: { padding: '20px 32px 32px', maxWidth: 1400, margin: '0 auto', width: '100%' },
}
