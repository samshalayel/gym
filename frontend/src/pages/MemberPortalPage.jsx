import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../context/I18nContext'
import { formatCurrency } from '../utils/currency'
import { memberStatusLabel, paymentStatusLabel } from '../utils/displayLabels'
import { useToast } from '../context/ToastContext'
import api from '../api/axios'

const TAB = 'tab'

export default function MemberPortalPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const isRtl = locale === 'ar'

  useEffect(() => {
    const role = localStorage.getItem('role') || 'admin'
    if (role !== 'member') {
      navigate('/')
      return
    }
    load()
  }, [])

  const load = async () => {
    try {
      const res = await api.get('/member-portal/me')
      setData(res.data)
    } catch {
      toast(isRtl ? 'تعذر تحميل بيانات العضو' : 'Error loading portal data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('member_id')
    navigate('/login')
  }

  const daysRemaining = (end) => Math.ceil((new Date(end) - new Date()) / (1000 * 60 * 60 * 24))
  const isActive = (end) => daysRemaining(end) > 0

  const tabs = [
    { key: 'overview', label: isRtl ? 'نظرة عامة' : 'Overview', icon: '📊' },
    { key: 'subscriptions', label: t('subscriptions.title'), icon: '🔖' },
    { key: 'appointments', label: t('appointments.title'), icon: '📅' },
    { key: 'workouts', label: t('workouts.title'), icon: '💪' },
    { key: 'nutrition', label: t('nutrition.title'), icon: '🥗' },
  ]

  if (loading) {
    return (
      <div style={s.loadingWrap}>
        <div style={s.spinner}></div>
        <div style={{ color: '#666', marginTop: 16 }}>{t('common.loading')}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={s.loadingWrap}>
        <div style={{ color: '#e74c3c', fontSize: 18 }}>{isRtl ? 'حدث خطأ في تحميل البيانات' : 'Error loading data'}</div>
      </div>
    )
  }

  const { member, subscriptions, appointments, workout_plans, nutrition_plans } = data

  const activeSubs = subscriptions.filter(s => isActive(s.end_date))

  const upcomingAppts = appointments.filter(a => a.status === 'scheduled').slice(0, 3)
  const pastAppts = appointments.filter(a => a.status !== 'scheduled').slice(0, 3)

  return (
    <div style={s.container}>
      <div style={s.topbar}>
        <div style={s.topbarLeft}>
          <span style={s.logo}>💪</span>
          <span style={s.appTitle}>{t('app.title')}</span>
        </div>
        <div style={s.topbarRight}>
          <span style={s.memberName}>{member.name}</span>
          <button onClick={handleLogout} style={s.logoutBtn}>🚪 {t('nav.logout')}</button>
        </div>
      </div>

      <div style={s.header}>
        <div style={s.avatarWrap}>
          <div style={s.avatar}>{member.name?.charAt(0) || '?'}</div>
          <div>
            <h1 style={s.greeting}>{isRtl ? `مرحباً، ${member.name}` : `Welcome, ${member.name}`}</h1>
            <div style={s.statusRow}>
              <span style={{ ...s.statusDot, background: member.status === 'active' ? '#2ecc71' : '#e74c3c' }} />
              <span style={s.statusText}>{memberStatusLabel(member.status, locale)}</span>
              <span style={s.separator}>|</span>
              <span style={{ color: '#888', fontSize: 13 }}>{member.email}</span>
              <span style={s.separator}>|</span>
              <span style={{ color: '#888', fontSize: 13 }}>{member.phone}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={s.statsRow}>
        <div style={{ ...s.statCard, borderLeft: '4px solid #667eea' }}>
          <span style={s.statNum}>{subscriptions.length}</span>
          <span style={s.statLabel}>{t('subscriptions.title')}</span>
        </div>
        <div style={{ ...s.statCard, borderLeft: '4px solid #2ecc71' }}>
          <span style={s.statNum}>{activeSubs.length}</span>
          <span style={s.statLabel}>{isRtl ? 'اشتراكات نشطة' : 'Active subscriptions'}</span>
        </div>
        <div style={{ ...s.statCard, borderLeft: '4px solid #f39c12' }}>
          <span style={s.statNum}>{appointments.length}</span>
          <span style={s.statLabel}>{t('appointments.title')}</span>
        </div>
        <div style={{ ...s.statCard, borderLeft: '4px solid #e74c3c' }}>
          <span style={s.statNum}>{workout_plans.length}</span>
          <span style={s.statLabel}>{t('workouts.plans')}</span>
        </div>
        <div style={{ ...s.statCard, borderLeft: '4px solid #9b59b6' }}>
          <span style={s.statNum}>{nutrition_plans.length}</span>
          <span style={s.statLabel}>{t('nutrition.title')}</span>
        </div>
      </div>

      <div style={s.tabsWrap}>
        {tabs.map(tb => (
          <button
            key={tb.key}
            style={{
              ...s.tab,
              background: tab === tb.key ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(255,255,255,0.05)',
              color: tab === tb.key ? '#fff' : '#aaa',
            }}
            onClick={() => setTab(tb.key)}
          >
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {tab === 'overview' && (
          <div>
            {activeSubs.length > 0 && (
              <div style={s.section}>
                <h3 style={s.sectionTitle}>{isRtl ? 'الاشتراك الحالي' : 'Current Subscription'}</h3>
                <div style={s.subCard}>
                  <div style={s.subHeader}>
                    <span style={s.subPlan}>#{activeSubs[0].plan_id} Plan</span>
                    <span style={{ ...s.badge, background: 'rgba(46,204,113,0.15)', color: '#2ecc71' }}>● {t('common.active')}</span>
                  </div>
                  <div style={s.subDates}>
                    <span>{activeSubs[0].start_date} → {activeSubs[0].end_date}</span>
                    <span style={{ color: daysRemaining(activeSubs[0].end_date) <= 7 ? '#e74c3c' : '#2ecc71', fontWeight: 600 }}>
                      {isRtl ? `${daysRemaining(activeSubs[0].end_date)} يوم متبقي` : `${daysRemaining(activeSubs[0].end_date)}d remaining`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {upcomingAppts.length > 0 && (
              <div style={s.section}>
                <h3 style={s.sectionTitle}>{isRtl ? 'المواعيد القادمة' : 'Upcoming Appointments'}</h3>
                <div style={s.grid2}>
                  {upcomingAppts.map(a => (
                    <div key={a.id} style={s.apptCard}>
                      <div style={s.apptDate}>{a.date}</div>
                      <div style={s.apptTime}>{a.time} • {a.duration} {t('appointments.min')}</div>
                      <span style={{ ...s.badge, background: 'rgba(102,126,234,0.15)', color: '#667eea' }}>{t(`appointments.${a.type}`, a.type)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {workout_plans.length > 0 && (
              <div style={s.section}>
                <h3 style={s.sectionTitle}>{t('workouts.plans')}</h3>
                <div style={s.grid2}>
                  {workout_plans.map(w => (
                    <div key={w.id} style={s.card}>
                      <div style={s.cardTitle}>{w.name}</div>
                      <div style={s.cardMeta}>{w.days_per_week} {isRtl ? 'أيام/أسبوع' : 'days/week'}</div>
                      {w.exercises && <div style={s.cardDesc}>🏋️ {w.exercises}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nutrition_plans.length > 0 && (
              <div style={s.section}>
                <h3 style={s.sectionTitle}>{t('nutrition.title')}</h3>
                <div style={s.grid2}>
                  {nutrition_plans.map(n => (
                    <div key={n.id} style={s.card}>
                      <div style={s.cardTitle}>{t(`nutrition.${n.goal}`, n.goal)}</div>
                      <div style={s.macroRow}>
                        <span style={s.macro}>{n.calories} <span style={{ color: '#666' }}>cal</span></span>
                        <span style={s.macro}>{n.protein_g}g <span style={{ color: '#666' }}>protein</span></span>
                        <span style={s.macro}>{n.carbs_g}g <span style={{ color: '#666' }}>carbs</span></span>
                        <span style={s.macro}>{n.fats_g}g <span style={{ color: '#666' }}>fats</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'subscriptions' && (
          <div>
            {subscriptions.length === 0 ? (
              <div style={s.empty}>{isRtl ? 'لا يوجد اشتراكات' : 'No subscriptions'}</div>
            ) : subscriptions.map(s => (
              <div key={s.id} style={s.subCard}>
                <div style={s.subHeader}>
                  <span style={s.subPlan}>#{s.plan_id}</span>
                  <span style={{ ...s.badge, background: isActive(s.end_date) ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.15)', color: isActive(s.end_date) ? '#2ecc71' : '#e74c3c' }}>
                    {isActive(s.end_date) ? `● ${t('common.active')}` : `○ ${t('members.statusExpired')}`}
                  </span>
                </div>
                <div style={s.subDates}>{s.start_date} → {s.end_date}</div>
                <div style={s.subMeta}>
                  <span>{formatCurrency(s.amount_paid)}</span>
                  <span style={{ color: s.payment_status === 'paid' ? '#2ecc71' : '#e74c3c' }}>{paymentStatusLabel(s.payment_status, locale)}</span>
                </div>
                {s.notes && <div style={s.cardDesc}>📝 {s.notes}</div>}
              </div>
            ))}
          </div>
        )}

        {tab === 'appointments' && (
          <div>
            {appointments.length === 0 ? (
              <div style={s.empty}>{isRtl ? 'لا يوجد مواعيد' : 'No appointments'}</div>
            ) : (
              <div style={s.grid2}>
                {appointments.map(a => (
                  <div key={a.id} style={s.apptCard}>
                    <div style={s.apptDate}>{a.date}</div>
                    <div style={s.apptTime}>{a.time} • {a.duration} {t('appointments.min')}</div>
                    <div style={s.apptMeta}>
                      <span style={{ ...s.badge, background: 'rgba(102,126,234,0.15)', color: '#667eea' }}>{t(`appointments.${a.type}`, a.type)}</span>
                      <span style={{ ...s.badge,
                        background: a.status === 'scheduled' ? 'rgba(46,204,113,0.15)' : a.status === 'completed' ? 'rgba(52,152,219,0.15)' : 'rgba(231,76,60,0.15)',
                        color: a.status === 'scheduled' ? '#2ecc71' : a.status === 'completed' ? '#3498db' : '#e74c3c',
                      }}>
                        {t(`appointments.${a.status}`, a.status)}
                      </span>
                    </div>
                    {a.notes && <div style={s.cardDesc}>📝 {a.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'workouts' && (
          <div>
            {workout_plans.length === 0 ? (
              <div style={s.empty}>{isRtl ? 'لا يوجد خطط تدريب' : 'No workout plans'}</div>
            ) : (
              <div style={s.grid2}>
                {workout_plans.map(w => (
                  <div key={w.id} style={s.card}>
                    <div style={s.cardIcon}>💪</div>
                    <div style={s.cardTitle}>{w.name}</div>
                    <div style={s.cardMeta}>{w.days_per_week} {isRtl ? 'أيام/أسبوع' : 'days/week'}</div>
                    {w.exercises && <div style={s.cardDesc}>🏋️ {w.exercises}</div>}
                    {w.notes && <div style={{ ...s.cardDesc, color: '#888' }}>📝 {w.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'nutrition' && (
          <div>
            {nutrition_plans.length === 0 ? (
              <div style={s.empty}>{isRtl ? 'لا يوجد خطط تغذية' : 'No nutrition plans'}</div>
            ) : (
              <div style={s.grid2}>
                {nutrition_plans.map(n => (
                  <div key={n.id} style={s.card}>
                    <div style={s.cardIcon}>🥗</div>
                    <div style={s.cardTitle}>{t(`nutrition.${n.goal}`, n.goal)}</div>
                    <div style={s.macroRow}>
                      <span style={s.macro}>{n.calories} <span style={{ color: '#666' }}>cal</span></span>
                      <span style={s.macro}>{n.protein_g}g <span style={{ color: '#666' }}>P</span></span>
                      <span style={s.macro}>{n.carbs_g}g <span style={{ color: '#666' }}>C</span></span>
                      <span style={s.macro}>{n.fats_g}g <span style={{ color: '#666' }}>F</span></span>
                    </div>
                    <div style={s.mealsInfo}>{n.meals_per_day} {isRtl ? 'وجبات/يوم' : 'meals/day'}</div>
                    {n.meal_plan && <div style={s.cardDesc}>📋 {n.meal_plan}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  container: { minHeight: '100vh', background: '#0f0f1a', color: '#fff' },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f1a' },
  spinner: { width: 40, height: 40, border: '3px solid rgba(255,255,255,0.05)', borderTop: '3px solid #667eea', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', background: 'rgba(20,20,35,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  topbarLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  logo: { fontSize: 24 },
  appTitle: { fontSize: 16, fontWeight: 700, color: '#fff' },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 16 },
  memberName: { fontSize: 14, color: '#aaa' },
  logoutBtn: { padding: '8px 16px', background: 'rgba(231,76,60,0.1)', border: 'none', borderRadius: 8, color: '#e74c3c', cursor: 'pointer', fontSize: 13, fontWeight: 500 },

  header: { padding: '32px 32px 0' },
  avatarWrap: { display: 'flex', alignItems: 'center', gap: 20 },
  avatar: { width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff' },
  greeting: { fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 },
  statusRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 },
  statusDot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  statusText: { fontSize: 13, color: '#aaa' },
  separator: { color: '#333', fontSize: 12 },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, padding: '24px 32px 0' },
  statCard: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 },
  statNum: { fontSize: 28, fontWeight: 800, color: '#fff' },
  statLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' },

  tabsWrap: { display: 'flex', gap: 8, padding: '24px 32px 0', flexWrap: 'wrap' },
  tab: { padding: '10px 20px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 12 },

  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },

  subCard: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, marginBottom: 12 },
  subHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subPlan: { fontSize: 16, fontWeight: 600, color: '#fff' },
  subDates: { fontSize: 13, color: '#888', display: 'flex', justifyContent: 'space-between', marginBottom: 8 },
  subMeta: { display: 'flex', gap: 16, fontSize: 14, color: '#ccc' },

  apptCard: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 },
  apptDate: { fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4 },
  apptTime: { fontSize: 13, color: '#888', marginBottom: 8 },
  apptMeta: { display: 'flex', gap: 6 },

  card: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#888', marginBottom: 8 },
  cardDesc: { fontSize: 12, color: '#aaa', lineHeight: 1.5, marginTop: 4 },

  macroRow: { display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' },
  macro: { fontSize: 14, fontWeight: 600, color: '#ccc' },
  mealsInfo: { fontSize: 12, color: '#888', marginBottom: 8 },

  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'inline-block' },
  empty: { textAlign: 'center', padding: 60, color: '#666', fontSize: 14 },

  content: { padding: '0 32px 32px' },
}
