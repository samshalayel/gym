import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'
import { formatCurrency } from '../utils/currency'
import { useToast } from '../context/ToastContext'
import api from '../api/axios'

export default function MemberPortalPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('home')
  const navigate = useNavigate()
  const { locale } = useI18n()
  const { toast } = useToast()
  const ar = locale === 'ar'

  useEffect(() => {
    const role = localStorage.getItem('role') || 'admin'
    if (role !== 'member') { navigate('/'); return }
    load()
  }, [])

  const load = async () => {
    try {
      const res = await api.get('/member-portal/me')
      setData(res.data)
    } catch {
      toast(ar ? 'تعذر تحميل البيانات' : 'Error loading data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => { localStorage.clear(); navigate('/login') }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
  const fmtDateTime = (d) => d ? new Date(d).toLocaleString(ar ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'

  if (loading) {
    return <div style={s.phone}><div style={s.loadingWrap}><div style={s.spinner} /><div style={{ color: '#6b6b80', marginTop: 16, fontSize: 14 }}>{ar ? 'جارٍ التحميل...' : 'Loading...'}</div></div></div>
  }
  if (!data) {
    return <div style={s.phone}><div style={s.loadingWrap}><div style={{ color: '#ff3355', fontSize: 16 }}>{ar ? 'حدث خطأ' : 'Error'}</div></div></div>
  }

  const { member, summary, alerts, subscriptions, attendance } = data
  const active = summary.active_subscription
  const sessionPct = active?.session_count ? Math.round((active.used_sessions / active.session_count) * 100) : 0
  const statusColor = member.status === 'active' ? '#00f593' : member.status === 'debtor' ? '#ffd60a' : '#ff3355'
  const statusText = member.status === 'active' ? (ar ? 'نشط' : 'Active') : member.status === 'debtor' ? (ar ? 'مدين' : 'Debtor') : (ar ? 'منتهي' : 'Expired')

  const navItems = [
    { key: 'home', icon: '🏠', label: ar ? 'الرئيسية' : 'Home' },
    { key: 'subscriptions', icon: '🔖', label: ar ? 'اشتراكاتي' : 'Subs' },
    { key: 'attendance', icon: '✅', label: ar ? 'حضوري' : 'Visits' },
    { key: 'profile', icon: '👤', label: ar ? 'حسابي' : 'Profile' },
  ]

  return (
    <div style={{ ...s.phone, direction: ar ? 'rtl' : 'ltr' }}>
      <div style={s.neon} />

      {/* Sticky header */}
      <header style={s.header}>
        <div style={s.brand}>
          <span style={s.logoBox}>💪</span>
          <span style={s.brandText}>SILVER<span style={{ color: '#00f5d4' }}>GYM</span></span>
        </div>
        <span style={{ ...s.hStatus, background: `${statusColor}1a`, color: statusColor }}>● {statusText}</span>
      </header>

      {/* Scrollable body */}
      <main style={s.body}>
        {/* ── HOME ── */}
        {tab === 'home' && (
          <div style={s.stack}>
            {/* Member card */}
            <section style={s.hero}>
              <div style={s.heroGlow} />
              <div style={s.heroInner}>
                <div style={s.avatar}>{member.name?.charAt(0)?.toUpperCase() || '?'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={s.name}>{member.name}</h1>
                  <div style={s.metaRow}>
                    {member.member_code && <span style={s.codeBadge}>#{member.member_code}</span>}
                    <span style={s.metaText}>📱 {member.phone}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Alerts */}
            {alerts.map((a, i) => (
              <div key={i} style={{ ...s.alert, ...(a.level === 'danger' ? s.alertDanger : s.alertWarn) }}>
                <span style={{ fontSize: 16 }}>{a.level === 'danger' ? '⚠️' : '🔔'}</span>
                <span>{ar ? a.ar : a.en}</span>
              </div>
            ))}

            {/* Active subscription */}
            {active ? (
              <section style={s.card}>
                <div style={s.subTop}>
                  <div>
                    <div style={s.subPlanName}>{active.plan_name}</div>
                    <div style={s.subPeriod}>{fmtDate(active.start_date)} → {fmtDate(active.end_date)}</div>
                  </div>
                  <span style={s.activeBadge}>● {ar ? 'نشط' : 'Active'}</span>
                </div>

                <div style={s.metricsRow}>
                  <div style={s.metric}>
                    <span style={{ ...s.metricNum, color: active.days_remaining <= 7 ? '#ffd60a' : '#00f593' }}>{active.days_remaining}</span>
                    <span style={s.metricLabel}>{ar ? 'يوم متبقي' : 'days left'}</span>
                  </div>
                  <div style={s.metric}>
                    <span style={{ ...s.metricNum, color: '#00f5d4' }}>{active.session_count ? active.remaining_sessions : '∞'}</span>
                    <span style={s.metricLabel}>{ar ? 'جلسة متبقية' : 'sessions'}</span>
                  </div>
                  <div style={s.metric}>
                    <span style={{ ...s.metricNum, color: '#a277ff' }}>{summary.total_attendance}</span>
                    <span style={s.metricLabel}>{ar ? 'الحضور' : 'visits'}</span>
                  </div>
                </div>

                {active.session_count ? (
                  <div style={s.progWrap}>
                    <div style={s.progHead}>
                      <span>{ar ? 'الجلسات المستخدمة' : 'Sessions used'}</span>
                      <span>{active.used_sessions} / {active.session_count}</span>
                    </div>
                    <div style={s.progBar}><div style={{ ...s.progFill, width: `${sessionPct}%` }} /></div>
                  </div>
                ) : null}

                <div style={s.payBox}>
                  <div style={s.payRow}><span style={s.payLabel}>{ar ? 'المدفوع' : 'Paid'}</span><b style={{ color: '#00f593' }}>{formatCurrency(active.amount_paid)}</b></div>
                  <div style={s.payRow}><span style={s.payLabel}>{ar ? 'المطلوب' : 'Required'}</span><b style={{ color: '#e8e8f0' }}>{formatCurrency(active.expected)}</b></div>
                  <div style={s.payRow}><span style={s.payLabel}>{ar ? 'المتبقي' : 'Remaining'}</span><b style={{ color: active.remaining_money > 0 ? '#ff3355' : '#00f593' }}>{formatCurrency(active.remaining_money)}</b></div>
                </div>
              </section>
            ) : (
              <section style={s.emptyState}>
                <div style={{ fontSize: 44 }}>🔖</div>
                <div style={{ color: '#e8e8f0', fontWeight: 700, marginTop: 8 }}>{ar ? 'لا يوجد اشتراك نشط' : 'No active subscription'}</div>
                <div style={{ color: '#6b6b80', fontSize: 13, marginTop: 4 }}>{ar ? 'يرجى مراجعة الاستقبال للتجديد' : 'Visit reception to renew'}</div>
              </section>
            )}

            {/* Recent visits preview */}
            {attendance.length > 0 && (
              <section style={s.card}>
                <div style={s.previewHead}>
                  <h3 style={s.previewTitle}>✅ {ar ? 'آخر الزيارات' : 'Recent visits'}</h3>
                  <button style={s.linkBtn} onClick={() => setTab('attendance')}>{ar ? 'عرض الكل' : 'All'} →</button>
                </div>
                {attendance.slice(0, 3).map(a => (
                  <div key={a.id} style={s.visitRow}>
                    <span style={s.visitDot} />
                    <span style={{ color: '#e8e8f0', fontSize: 13, flex: 1 }}>{fmtDateTime(a.checked_in_at)}</span>
                    <span style={s.visitCheck}>✓</span>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        {/* ── SUBSCRIPTIONS ── */}
        {tab === 'subscriptions' && (
          <div style={s.stack}>
            <h2 style={s.pageTitle}>🔖 {ar ? 'اشتراكاتي' : 'My Subscriptions'}</h2>
            {subscriptions.length === 0 ? (
              <section style={s.emptyState}><div style={{ fontSize: 40 }}>🔖</div><div style={{ color: '#6b6b80', marginTop: 8 }}>{ar ? 'لا يوجد اشتراكات' : 'No subscriptions'}</div></section>
            ) : subscriptions.map(sub => (
              <section key={sub.id} style={s.card}>
                <div style={s.subTop}>
                  <div>
                    <div style={s.subPlanName}>{sub.plan_name}</div>
                    <div style={s.subPeriod}>{fmtDate(sub.start_date)} → {fmtDate(sub.end_date)}</div>
                  </div>
                  <span style={{ ...s.activeBadge, ...(sub.is_active ? {} : s.inactiveBadge) }}>
                    {sub.is_active ? `● ${ar ? 'نشط' : 'Active'}` : `○ ${ar ? 'منتهي' : 'Ended'}`}
                  </span>
                </div>
                <div style={s.subDetailGrid}>
                  <div><span style={s.dLabel}>{ar ? 'مدفوع' : 'Paid'}</span><b style={{ color: '#00f593' }}>{formatCurrency(sub.amount_paid)}</b></div>
                  <div><span style={s.dLabel}>{ar ? 'المطلوب' : 'Required'}</span><b style={{ color: '#e8e8f0' }}>{formatCurrency(sub.expected)}</b></div>
                  <div><span style={s.dLabel}>{ar ? 'المتبقي' : 'Remaining'}</span><b style={{ color: sub.remaining_money > 0 ? '#ff3355' : '#00f593' }}>{formatCurrency(sub.remaining_money)}</b></div>
                  <div><span style={s.dLabel}>{ar ? 'الجلسات' : 'Sessions'}</span><b style={{ color: '#00f5d4' }}>{sub.session_count ? `${sub.remaining_sessions}/${sub.session_count}` : '∞'}</b></div>
                </div>
              </section>
            ))}
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {tab === 'attendance' && (
          <div style={s.stack}>
            <h2 style={s.pageTitle}>✅ {ar ? 'سجل حضوري' : 'My Attendance'}</h2>
            {attendance.length === 0 ? (
              <section style={s.emptyState}><div style={{ fontSize: 40 }}>✅</div><div style={{ color: '#6b6b80', marginTop: 8 }}>{ar ? 'لا يوجد سجل حضور' : 'No attendance yet'}</div></section>
            ) : (
              <section style={s.card}>
                <div style={s.attendHead}>
                  <span>{ar ? 'إجمالي الزيارات' : 'Total visits'}</span>
                  <b style={{ color: '#00f593', fontSize: 22 }}>{summary.total_attendance}</b>
                </div>
                {attendance.map(a => (
                  <div key={a.id} style={s.visitRow}>
                    <span style={s.visitDot} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#e8e8f0', fontSize: 13, fontWeight: 600 }}>{fmtDateTime(a.checked_in_at)}</div>
                      {a.note && <div style={{ color: '#6b6b80', fontSize: 11 }}>{a.note}</div>}
                    </div>
                    <span style={s.visitCheck}>✓</span>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        {/* ── PROFILE ── */}
        {tab === 'profile' && (
          <div style={s.stack}>
            <h2 style={s.pageTitle}>👤 {ar ? 'حسابي' : 'My Profile'}</h2>
            <section style={s.hero}>
              <div style={s.heroGlow} />
              <div style={s.heroInner}>
                <div style={s.avatar}>{member.name?.charAt(0)?.toUpperCase() || '?'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={s.name}>{member.name}</h1>
                  <div style={s.metaRow}>
                    {member.member_code && <span style={s.codeBadge}>#{member.member_code}</span>}
                    <span style={{ ...s.hStatus, background: `${statusColor}1a`, color: statusColor }}>● {statusText}</span>
                  </div>
                </div>
              </div>
            </section>

            <section style={s.card}>
              {[
                ['📱', ar ? 'الهاتف' : 'Phone', member.phone],
                ['✉️', ar ? 'البريد' : 'Email', member.email || '-'],
                ['⚧', ar ? 'الجنس' : 'Gender', member.gender === 'male' ? (ar ? 'ذكر' : 'Male') : member.gender === 'female' ? (ar ? 'أنثى' : 'Female') : '-'],
                ['🎂', ar ? 'العمر' : 'Age', member.age || '-'],
                ['📍', ar ? 'العنوان' : 'Address', member.address || '-'],
                ['🆘', ar ? 'طوارئ' : 'Emergency', member.emergency_phone || '-'],
              ].map(([icon, label, val], i) => (
                <div key={i} style={s.infoRow}>
                  <span style={s.infoIcon}>{icon}</span>
                  <span style={s.infoLabel}>{label}</span>
                  <span style={s.infoVal}>{val}</span>
                </div>
              ))}
            </section>

            <button onClick={handleLogout} style={s.logoutFull}>🚪 {ar ? 'تسجيل الخروج' : 'Logout'}</button>
          </div>
        )}
      </main>

      {/* Bottom navigation */}
      <nav style={s.bottomNav}>
        {navItems.map(item => {
          const activeTab = tab === item.key
          return (
            <button key={item.key} onClick={() => setTab(item.key)} style={s.navBtn}>
              <span style={{ ...s.navIcon, ...(activeTab ? s.navIconActive : {}) }}>{item.icon}</span>
              <span style={{ ...s.navLabel, color: activeTab ? '#00f5d4' : '#6b6b80' }}>{item.label}</span>
              {activeTab && <span style={s.navDot} />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

const card = { background: 'rgba(20,20,35,0.7)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18 }

const s = {
  // Phone frame — centered mobile width on desktop, full on mobile
  phone: { maxWidth: 460, margin: '0 auto', minHeight: '100vh', background: '#08080e', color: '#fff', position: 'relative', boxShadow: '0 0 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' },
  neon: { height: 3, background: 'linear-gradient(90deg, transparent, #00f5d4 30%, #a277ff 50%, #00f5d4 70%, transparent)', flexShrink: 0 },

  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '80vh' },
  spinner: { width: 42, height: 42, border: '3px solid rgba(255,255,255,0.06)', borderTop: '3px solid #00f5d4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

  header: { position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'rgba(8,8,14,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 },
  brand: { display: 'flex', alignItems: 'center', gap: 9 },
  logoBox: { width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, rgba(0,245,212,0.15), rgba(162,119,255,0.12))', display: 'grid', placeItems: 'center', fontSize: 16 },
  brandText: { fontSize: 16, fontWeight: 800, letterSpacing: '1.2px', color: '#e8e8f0' },
  hStatus: { padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700 },

  body: { flex: 1, overflowY: 'auto', padding: '16px 16px 90px' },
  stack: { display: 'grid', gap: 13 },
  pageTitle: { fontSize: 18, fontWeight: 800, color: '#fff', margin: '4px 2px 2px' },

  hero: { ...card, position: 'relative', overflow: 'hidden', padding: 18 },
  heroGlow: { position: 'absolute', top: -40, insetInlineEnd: -40, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,245,212,0.18), transparent 70%)' },
  heroInner: { display: 'flex', alignItems: 'center', gap: 14, position: 'relative' },
  avatar: { width: 58, height: 58, borderRadius: 16, background: 'linear-gradient(135deg, #00f5d4, #a277ff)', display: 'grid', placeItems: 'center', fontSize: 25, fontWeight: 800, color: '#08080e', flexShrink: 0 },
  name: { fontSize: 20, fontWeight: 800, margin: 0, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  metaRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' },
  codeBadge: { background: 'rgba(162,119,255,0.15)', color: '#a277ff', padding: '3px 9px', borderRadius: 6, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' },
  metaText: { color: '#9b9bb0', fontSize: 12 },

  alert: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 15px', borderRadius: 13, fontSize: 12.5, fontWeight: 600 },
  alertWarn: { background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.22)', color: '#ffd60a' },
  alertDanger: { background: 'rgba(255,51,85,0.08)', border: '1px solid rgba(255,51,85,0.22)', color: '#ff6680' },

  card: { ...card, padding: 18 },
  subTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
  subPlanName: { fontSize: 16, fontWeight: 700, color: '#fff' },
  subPeriod: { fontSize: 11.5, color: '#9b9bb0', marginTop: 4 },
  activeBadge: { padding: '4px 11px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: 'rgba(0,245,147,0.15)', color: '#00f593', whiteSpace: 'nowrap' },
  inactiveBadge: { background: 'rgba(255,51,85,0.12)', color: '#ff6680' },

  metricsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9, marginBottom: 15 },
  metric: { background: 'rgba(255,255,255,0.03)', borderRadius: 13, padding: '13px 6px', textAlign: 'center' },
  metricNum: { display: 'block', fontSize: 24, fontWeight: 800, lineHeight: 1 },
  metricLabel: { fontSize: 10.5, color: '#9b9bb0', marginTop: 5, display: 'block' },

  progWrap: { marginBottom: 15 },
  progHead: { display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#9b9bb0', marginBottom: 6 },
  progBar: { height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 20, overflow: 'hidden' },
  progFill: { height: '100%', background: 'linear-gradient(90deg, #00f5d4, #a277ff)', borderRadius: 20 },

  payBox: { background: 'rgba(255,255,255,0.03)', borderRadius: 13, padding: 14, display: 'grid', gap: 10 },
  payRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 },
  payLabel: { color: '#9b9bb0' },

  subDetailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 },
  dLabel: { display: 'block', fontSize: 11, color: '#9b9bb0', marginBottom: 3 },

  emptyState: { ...card, padding: 36, textAlign: 'center' },

  previewHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  previewTitle: { fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 },
  linkBtn: { background: 'none', border: 'none', color: '#00f5d4', cursor: 'pointer', fontSize: 12, fontWeight: 600 },

  attendHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 13, marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#9b9bb0', fontSize: 13 },
  visitRow: { display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  visitDot: { width: 8, height: 8, borderRadius: '50%', background: '#00f593', flexShrink: 0, boxShadow: '0 0 8px rgba(0,245,147,0.5)' },
  visitCheck: { color: '#00f593', fontWeight: 800, fontSize: 14 },

  infoRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  infoIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  infoLabel: { color: '#9b9bb0', fontSize: 13, flex: 1 },
  infoVal: { color: '#e8e8f0', fontSize: 13, fontWeight: 600, textAlign: 'end', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  logoutFull: { width: '100%', padding: '14px', background: 'rgba(255,51,85,0.1)', border: '1px solid rgba(255,51,85,0.22)', borderRadius: 13, color: '#ff3355', cursor: 'pointer', fontSize: 14, fontWeight: 700, marginTop: 4 },

  // Bottom navigation bar
  bottomNav: { position: 'sticky', bottom: 0, zIndex: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: 'rgba(10,10,18,0.96)', backdropFilter: 'blur(14px)', borderTop: '1px solid rgba(255,255,255,0.07)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', flexShrink: 0 },
  navBtn: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 0 12px', background: 'none', border: 'none', cursor: 'pointer' },
  navIcon: { fontSize: 20, opacity: 0.5, transition: 'all 0.2s' },
  navIconActive: { opacity: 1, transform: 'scale(1.12)', filter: 'drop-shadow(0 0 6px rgba(0,245,212,0.4))' },
  navLabel: { fontSize: 10, fontWeight: 700 },
  navDot: { position: 'absolute', top: 3, width: 4, height: 4, borderRadius: '50%', background: '#00f5d4', boxShadow: '0 0 6px #00f5d4' },
}
