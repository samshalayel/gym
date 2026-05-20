import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'
import { changePassword } from '../api/auth'
import { useToast } from '../context/ToastContext'
import {
  LayoutDashboardIcon,
  UsersIcon,
  FileTextIcon,
  TagsIcon,
  TagIcon,
  DumbbellIcon,
  UserCogIcon,
  ClipboardListIcon,
  WalletCardsIcon,
  TrendingUpIcon,
  LogOutIcon,
  KeyRoundIcon,
  XIcon,
} from 'lucide-react'

const navItems = [
  { path: '/', key: 'dashboard', icon: LayoutDashboardIcon },
  { path: '/members', key: 'members', icon: UsersIcon },
  { path: '/plans', key: 'plans', icon: FileTextIcon },
  { path: '/subscriptions', key: 'subscriptions', icon: TagsIcon },
  { path: '/offers', key: 'offers', icon: TagIcon },
  { path: '/equipment', key: 'equipment', icon: DumbbellIcon },
  { path: '/staff', key: 'staff', icon: UserCogIcon },
  { path: '/attendance-report', key: 'attendanceReport', icon: ClipboardListIcon },
  { path: '/revenue', key: 'revenue', icon: TrendingUpIcon },
  { path: '/expenses', key: 'expenses', icon: WalletCardsIcon },
]

export default function MainLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { t, locale, setLocale } = useI18n()
  const { toast } = useToast()
  const isRtl = locale === 'ar'

  const [showChangePwd, setShowChangePwd] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })
  const [pwdLoading, setPwdLoading] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const handleChangePwd = async (e) => {
    e.preventDefault()
    if (pwdForm.next !== pwdForm.confirm) {
      toast(isRtl ? 'كلمة المرور الجديدة غير متطابقة' : 'Passwords do not match', 'error')
      return
    }
    setPwdLoading(true)
    try {
      await changePassword(pwdForm.current, pwdForm.next)
      toast(isRtl ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully', 'success')
      setShowChangePwd(false)
      setPwdForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      const msg = err.response?.data?.detail
      toast(
        msg === 'Current password is incorrect'
          ? (isRtl ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect')
          : (isRtl ? 'تعذر تغيير كلمة المرور' : 'Could not change password'),
        'error'
      )
    } finally {
      setPwdLoading(false)
    }
  }

  const current = navItems.find(n => n.path === location.pathname)

  return (
    <div style={{ ...styles.container, direction: isRtl ? 'rtl' : 'ltr' }}>
      <aside style={styles.sidebar}>
        <div style={styles.neonBar} />

        <div style={styles.sidebarInner}>
          <div style={styles.logoSection}>
            <div style={styles.logoIconBox}>
              <span style={styles.logoIcon}>💪</span>
            </div>
            <span style={styles.logoText}>SILVER<span style={{ color: '#00f5d4' }}>GYM</span></span>
          </div>

          <nav style={styles.nav}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    ...styles.navItem,
                    color: isActive ? '#00f5d4' : '#b7b7c6',
                    background: isActive ? 'rgba(0,245,212,0.10)' : 'transparent',
                  }}
                >
                  <item.icon size={20} strokeWidth={isActive ? 2 : 1.7} />
                  <span style={{ fontWeight: isActive ? 750 : 550 }}>{t(`nav.${item.key}`)}</span>
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
            <button onClick={() => setShowChangePwd(true)} style={styles.keyBtn} title={isRtl ? 'تغيير كلمة المرور' : 'Change Password'}>
              <KeyRoundIcon size={15} strokeWidth={1.5} />
            </button>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              <LogOutIcon size={15} strokeWidth={1.5} />
            </button>
          </div>

          {/* ── Change Password Modal ── */}
          {showChangePwd && (
            <div style={styles.overlay}>
              <div style={styles.modal}>
                <div style={styles.modalHead}>
                  <span style={styles.modalTitle}>{isRtl ? 'تغيير كلمة المرور' : 'Change Password'}</span>
                  <button style={styles.closeBtn} onClick={() => { setShowChangePwd(false); setPwdForm({ current: '', next: '', confirm: '' }) }}>
                    <XIcon size={16} />
                  </button>
                </div>
                <form onSubmit={handleChangePwd} style={styles.modalForm}>
                  <label style={styles.modalLabel}>{isRtl ? 'كلمة المرور الحالية' : 'Current Password'}</label>
                  <input type="password" style={styles.modalInput} value={pwdForm.current} onChange={e => setPwdForm({ ...pwdForm, current: e.target.value })} required />
                  <label style={styles.modalLabel}>{isRtl ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                  <input type="password" style={styles.modalInput} value={pwdForm.next} onChange={e => setPwdForm({ ...pwdForm, next: e.target.value })} required minLength={6} />
                  <label style={styles.modalLabel}>{isRtl ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                  <input type="password" style={styles.modalInput} value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} required />
                  <button type="submit" style={styles.modalBtn} disabled={pwdLoading}>
                    {pwdLoading ? '...' : (isRtl ? 'حفظ' : 'Save')}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </aside>

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
  container: { display: 'flex', height: '100vh', background: '#08080e' },
  sidebar: { position: 'relative', width: 244, flexShrink: 0, background: 'rgba(10,10,18,0.98)', borderInlineEnd: '1px solid rgba(255,255,255,0.05)' },
  neonBar: {
    height: 2,
    background: 'linear-gradient(90deg, transparent 0%, #00f5d4 20%, #ffd60a 50%, #00f5d4 80%, transparent 100%)',
    opacity: 0.7,
  },
  sidebarInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: '22px 14px',
    height: '100%',
    boxSizing: 'border-box',
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
    flexDirection: 'column',
    gap: 6,
    flex: 1,
    overflowY: 'auto',
    width: '100%',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: 15,
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    position: 'relative',
  },
  actions: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginTop: 'auto' },
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
  keyBtn: {
    border: '1px solid rgba(255,214,10,0.15)',
    borderRadius: 6, padding: '6px 10px', cursor: 'pointer',
    background: 'rgba(255,214,10,0.05)', color: '#ffd60a',
    display: 'flex', alignItems: 'center',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  modal: {
    background: '#0e0e18', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 24, width: 340, display: 'grid', gap: 0,
  },
  modalHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { color: '#e8e8f0', fontWeight: 700, fontSize: 16 },
  closeBtn: {
    background: 'transparent', border: 'none', color: '#6b6b80', cursor: 'pointer',
    display: 'flex', alignItems: 'center',
  },
  modalForm: { display: 'grid', gap: 10 },
  modalLabel: { fontSize: 12, color: '#6b6b80', fontWeight: 600, marginBottom: -4 },
  modalInput: {
    padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
    fontSize: 14, color: '#e8e8f0', outline: 'none',
  },
  modalBtn: {
    marginTop: 6, padding: '11px 0', background: '#00f5d4', color: '#08080e',
    border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
  },
  main: { flex: 1, overflow: 'auto', minWidth: 0 },
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
