import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard } from '../api/dashboard'
import { createAttendance, getAttendanceDailySummary } from '../api/attendance'
import api from '../api/axios'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { UsersIcon, TagsIcon, UserCheckIcon } from 'lucide-react'
import { formatCurrency } from '../utils/currency'
import { genderLabel } from '../utils/displayLabels'

const cardConfig = [
  { key: 'total_members', label: 'dashboard.newMembers', icon: '👥', accent: '#00f5d4' },
  { key: 'active_subscriptions', label: 'dashboard.activeSubs', icon: '✅', accent: '#00f593' },
  { key: 'expired_subscriptions', label: 'dashboard.expiredSubs', icon: '❌', accent: '#ff3355' },
  { key: 'unpaid_subscriptions', label: 'dashboard.unpaidSubs', icon: '⏳', accent: '#ffd60a' },
  { key: 'monthly_revenue', label: 'dashboard.periodRevenue', icon: '💰', accent: '#a277ff' },
  { key: 'monthly_expenses', label: 'dashboard.periodExpenses', icon: '₪', accent: '#ff8c42', adminOnly: true },
  { key: 'equipment_needing_maintenance', label: 'dashboard.equipMaint', icon: '🔧', accent: '#ff8c42' },
]

const todayValue = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const todayDayKey = () => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [showAttendance, setShowAttendance] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showBirthdays, setShowBirthdays] = useState(false)
  const [showDebtors, setShowDebtors] = useState(false)
  const [trendPeriod, setTrendPeriod] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd]     = useState('')
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [todayAttendanceSearch, setTodayAttendanceSearch] = useState('')
  const [attendanceSaving, setAttendanceSaving] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const navigate = useNavigate()
  const role = localStorage.getItem('role') || 'admin'

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await api.post('/sync/push')
      const m = res.data?.vps?.members
      toast(locale === 'ar'
        ? `تمت المزامنة ✓ — ${m} عضو على السيرفر (${res.data.uploaded_kb} ك.ب)`
        : `Synced ✓ — ${m} members on server (${res.data.uploaded_kb} KB)`, 'success')
    } catch (e) {
      const detail = e.response?.data?.detail || (locale === 'ar' ? 'تحقق من الإنترنت' : 'Check internet')
      toast((locale === 'ar' ? 'فشلت المزامنة: ' : 'Sync failed: ') + detail, 'error')
    } finally {
      setSyncing(false)
    }
  }
  const visibleCards = cardConfig.filter((card) => !card.adminOnly || role === 'admin')

  useEffect(() => {
    if (trendPeriod === 'custom' && (!customStart || !customEnd)) return
    setData(null)
    const params = { trend_period: trendPeriod }
    if (trendPeriod === 'custom') {
      params.start_date = customStart
      params.end_date   = customEnd
    }
    getDashboard(params).then((res) => setData(res.data))
  }, [trendPeriod, customStart, customEnd])

  const openTodayAttendance = async () => {
    const res = await getAttendanceDailySummary({ attendance_date: todayValue() })
    setTodayAttendance(res.data)
    setTodayAttendanceSearch('')
  }

  const registerFromDashboard = async (member) => {
    setAttendanceSaving(member.member_id)
    try {
      await createAttendance({ member_id: member.member_id, attendance_date: todayValue(), note: 'Dashboard quick check-in' })
      toast(t('attendance.saved'), 'success')
      await openTodayAttendance()
      const refreshed = await getDashboard({ trend_period: trendPeriod })
      setData(refreshed.data)
    } catch (error) {
      if (error.response?.status === 409) toast(t('attendance.alreadyToday'), 'info')
      else toast(error.response?.data?.detail || t('attendance.saveError'), 'error')
    } finally {
      setAttendanceSaving(null)
    }
  }

  if (!data) return (
    <div style={s.loading}>
      <div style={s.spinner} />
      <span style={{ color: '#5a5a6a', fontSize: 14 }}>{t('common.loading')}</span>
    </div>
  )

  const formatValue = (key, val) => {
    if (key === 'monthly_revenue' || key === 'monthly_expenses') return formatCurrency(val)
    return val
  }

  const maxGrowth = Math.max(...(data.member_growth || []).map((item) => item.total), 1)
  const trendItems = data.member_trend?.items || []
  const maxTrend = Math.max(...trendItems.map((item) => item.total), 1)
  const trendTotal = trendItems.reduce((sum, item) => sum + item.total, 0)
  const maxWeekly = Math.max(...(data.weekly_expected || []).map((item) => item.total), 1)
  const genderTotalRaw = (data.gender_chart || []).reduce((sum, item) => sum + item.total, 0)
  const genderTotal = genderTotalRaw || 1
  const maleCount = (data.gender_chart || []).find((item) => item.gender === 'male')?.total || 0
  const femaleCount = (data.gender_chart || []).find((item) => item.gender === 'female')?.total || 0
  const malePct = Math.round((maleCount / genderTotal) * 100)
  const femalePct = Math.round((femaleCount / genderTotal) * 100)
  const dayLabel = (day) => ({
    mon: locale === 'ar' ? 'الاثنين' : 'Mon',
    tue: locale === 'ar' ? 'الثلاثاء' : 'Tue',
    wed: locale === 'ar' ? 'الأربعاء' : 'Wed',
    thu: locale === 'ar' ? 'الخميس' : 'Thu',
    fri: locale === 'ar' ? 'الجمعة' : 'Fri',
    sat: locale === 'ar' ? 'السبت' : 'Sat',
    sun: locale === 'ar' ? 'الأحد' : 'Sun',
  }[day] || day)
  const filteredTodayAttendance = (todayAttendance?.items || []).filter((member) => {
    const q = todayAttendanceSearch.trim().toLowerCase()
    if (!q) return true
    return [member.member_name, member.member_phone].filter(Boolean).join(' ').toLowerCase().includes(q)
  })

  const alertCount = (data.birthdays?.length > 0 ? 1 : 0) + (data.overpayments?.total > 0 ? 1 : 0) + (data.debtors?.total > 0 ? 1 : 0)

  return (
    <div style={s.page}>
      <div style={s.actions}>
        <button style={s.actionBtn('#00f5d4')} onClick={() => navigate('/members?action=new')}><UsersIcon size={18} />{t('dashboard.quickMember')}</button>
        <button style={s.actionBtn('#ffd60a')} onClick={() => navigate('/subscriptions?action=new')}><TagsIcon size={18} />{t('dashboard.quickSubscription')}</button>
        <button style={s.actionBtn('#00f593')} onClick={() => setShowAttendance(true)}><UserCheckIcon size={18} />{t('dashboard.quickAttendance')}</button>
        {role === 'admin' && (
          <button
            style={{ ...s.actionBtn('#a277ff'), opacity: syncing ? 0.6 : 1, cursor: syncing ? 'wait' : 'pointer' }}
            onClick={handleSync}
            disabled={syncing}
            title={locale === 'ar' ? 'رفع البيانات إلى سيرفر الإنترنت' : 'Upload data to the online server'}
          >
            {syncing ? '⏳' : '☁️'} {syncing ? (locale === 'ar' ? 'جارٍ المزامنة...' : 'Syncing...') : (locale === 'ar' ? 'مزامنة السيرفر' : 'Sync server')}
          </button>
        )}
        <div style={s.periodPicker}>
          {[
            ['today', t('dashboard.todayPeriod')],
            ['month', t('dashboard.currentMonth')],
            ['30d', t('dashboard.last30Days')],
            ['year', t('dashboard.thisYear')],
            ['all', t('dashboard.allTime')],
            ['custom', locale === 'ar' ? 'تاريخ محدد' : 'Custom'],
          ].map(([key, label]) => (
            <button key={key} style={{ ...s.periodBtn, ...(trendPeriod === key ? s.periodActive : {}) }} onClick={() => setTrendPeriod(key)}>
              {label}
            </button>
          ))}
          {trendPeriod === 'custom' && (
            <div style={s.customDateRow}>
              <input
                style={s.customDateInput}
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span style={{ color: '#6b6b80', fontSize: 12 }}>←</span>
              <input
                style={s.customDateInput}
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          )}
        </div>
        {alertCount > 0 && (
          <button style={s.bellBtn} onClick={() => setShowNotifications((v) => !v)}>
            🔔
            <span style={s.bellBadge}>{alertCount}</span>
          </button>
        )}
      </div>

      {showNotifications && alertCount > 0 && (
        <div style={s.notifPanel}>
          <div style={s.notifHead}>
            <strong style={{ color: '#fff', fontSize: 14 }}>{locale === 'ar' ? 'التنبيهات' : 'Notifications'}</strong>
            <button style={s.dismissBtn} onClick={() => setShowNotifications(false)}>✕</button>
          </div>

          {data.birthdays?.length > 0 && (
            <div style={s.notifSection('#ffd60a')}>
              <div style={s.notifSectionHead}>
                <span>🎂 {t('dashboard.birthdays')} ({data.birthdays.length})</span>
                <button style={s.notifToggle} onClick={() => setShowBirthdays((v) => !v)}>{showBirthdays ? '▲' : '▼'}</button>
              </div>
              {showBirthdays && data.birthdays.map((b) => (
                <div key={b.member_id} style={s.notifItem}>
                  <span>{b.name}</span>
                  <span style={{ opacity: 0.7, fontSize: 12 }}>{b.days_remaining === 0 ? (locale === 'ar' ? 'اليوم 🎉' : 'Today 🎉') : `${b.days_remaining} ${t('dashboard.days')}`}</span>
                </div>
              ))}
            </div>
          )}

          {data.debtors?.total > 0 && (
            <div style={s.notifSection('#ffb347')}>
              <div style={s.notifSectionHead}>
                <span>💸 {locale === 'ar' ? `مبالغ متأخرة (${data.debtors.total})` : `Outstanding (${data.debtors.total})`}</span>
                <button style={s.notifToggle} onClick={() => setShowDebtors((v) => !v)}>{showDebtors ? '▲' : '▼'}</button>
              </div>
              <div style={{ color: '#ffb347', fontWeight: 700, fontSize: 12, padding: '2px 0 4px' }}>
                {locale === 'ar' ? `الإجمالي: ${formatCurrency(data.debtors.amount)}` : `Total: ${formatCurrency(data.debtors.amount)}`}
              </div>
              {showDebtors && data.debtors.items.map((d) => (
                <div key={d.member_id} style={s.notifItem}>
                  <span>{d.name}</span>
                  <span style={{ color: '#ffb347', fontWeight: 800 }}>{formatCurrency(d.remaining)}</span>
                </div>
              ))}
            </div>
          )}

          {data.overpayments?.total > 0 && (
            <div style={s.notifSection('#ff6680')}>
              <div style={s.notifSectionHead}>
                <span>⚠️ {locale === 'ar' ? 'دفع زائد' : 'Overpaid'} ({data.overpayments.total})</span>
                <button style={s.notifToggle} onClick={() => navigate('/revenue')}>→</button>
              </div>
              <div style={{ color: '#ff6680', fontSize: 12 }}>{formatCurrency(data.overpayments.amount)}</div>
            </div>
          )}
        </div>
      )}

      <div style={s.grid}>
        {visibleCards.map((card, i) => (
          <div key={card.key} style={{ ...s.card, animationDelay: `${i * 0.08}s` }}>
            <div style={{ ...s.cardGlow, background: `radial-gradient(circle, ${card.accent}15 0%, transparent 70%)` }} />
            <div style={s.cardTop}>
              <span style={s.cardIcon}>{card.icon}</span>
              <span style={s.cardLabel}>{t(card.label)}</span>
            </div>
            <div style={{ ...s.cardValue, color: card.accent }}>
              {formatValue(card.key, data[card.key])}
            </div>
            <div style={{ ...s.cardBar, background: card.accent, boxShadow: `0 0 12px ${card.accent}40` }} />
          </div>
        ))}
      </div>

      <section style={s.weekSection}>
        <h2 style={s.chartTitle}>{t('dashboard.weeklyExpected')}</h2>
        <div style={s.weekGrid}>
          {(data.weekly_expected || []).map((item) => {
            const isToday = item.day === todayDayKey()
            return (
            <button
              key={item.day}
              style={{ ...s.weekItem, ...(isToday ? s.weekToday : {}), cursor: isToday ? 'pointer' : 'default', opacity: isToday ? 1 : 0.78 }}
              onClick={isToday ? openTodayAttendance : undefined}
              disabled={!isToday}
              title={isToday ? (locale === 'ar' ? 'اضغط لعرض حضور اليوم' : 'Click to open today attendance') : ''}
            >
              <span>{dayLabel(item.day)}</span>
              <div style={s.barTrack}><div style={{ ...s.barFill('#ffd60a'), width: `${Math.max(4, (item.total / maxWeekly) * 100)}%` }} /></div>
              <b>{item.total}</b>
            </button>
            )
          })}
        </div>
      </section>

      <div style={s.analyticsLayout}>
        <section style={s.trendCard}>
          <div style={s.chartHead}>
            <h2 style={s.chartTitle}>{t('dashboard.subscriberTrend')}</h2>
            <span style={s.trendTotal}>{trendTotal}</span>
          </div>
          <div style={s.trendBars}>
            {trendItems.map((item, idx) => (
              <div key={`${item.label}-${idx}`} style={s.trendItem}>
                <div style={{ ...s.trendBar, height: `${Math.max(6, (item.total / maxTrend) * 150)}px` }} title={`${item.label}: ${item.total}`} />
                <span>
                  {data.member_trend?.granularity === 'hour'
                    ? item.label.slice(0, 2)
                    : data.member_trend?.granularity === 'day'
                      ? item.label.slice(8)
                      : item.label.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <aside style={s.rightNodes}>
          <section style={s.chartCard}>
            <h2 style={s.chartTitle}>{t('dashboard.genderChart')}</h2>
            <div style={s.pieWrap}>
              <div style={{ ...s.pie, background: genderTotalRaw > 0 ? `conic-gradient(#00f5d4 0 ${malePct}%, #ffd60a ${malePct}% 100%)` : 'rgba(255,255,255,0.08)' }}>
                <span>{genderTotalRaw}</span>
              </div>
              <div style={s.pieLegend}>
                <div><i style={{ ...s.legendDot, background: '#00f5d4' }} />{genderLabel('male', locale)} <b>{maleCount}</b></div>
                <div><i style={{ ...s.legendDot, background: '#ffd60a' }} />{genderLabel('female', locale)} <b>{femaleCount}</b></div>
              </div>
            </div>
          </section>

          <section style={s.chartCard}>
            <h2 style={s.chartTitle}>{t('dashboard.genderChart')}</h2>
            <div style={s.genderRows}>
              {(data.gender_chart || []).map((item) => {
                const pct = Math.round((item.total / genderTotal) * 100)
                return (
                  <div key={item.gender} style={s.genderRow}>
                    <span>{genderLabel(item.gender, locale)}</span>
                    <div style={s.barTrack}><div style={{ ...s.barFill(item.gender === 'female' ? '#ffd60a' : '#00f5d4'), width: `${pct}%` }} /></div>
                    <b>{item.total}</b>
                  </div>
                )
              })}
            </div>
          </section>
        </aside>
      </div>

      <div style={s.chartGrid}>
        <section style={s.chartCard}>
          <h2 style={s.chartTitle}>{t('dashboard.growthChart')}</h2>
          <div style={s.miniBars}>
            {(data.member_growth || []).map((item) => (
              <div key={item.month} style={s.monthBar}>
                <div style={{ ...s.verticalBar, height: `${Math.max(8, (item.total / maxGrowth) * 120)}px` }} />
                <strong>{item.total}</strong>
                <span>{item.month.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      {todayAttendance && (
        <div style={s.modalOverlay} onClick={() => setTodayAttendance(null)}>
          <div style={s.attendanceModal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHead}>
              <h2>{locale === 'ar' ? 'حضور اليوم' : 'Today attendance'} - {todayAttendance.date}</h2>
              <button style={s.closeBtn} onClick={() => setTodayAttendance(null)}>x</button>
            </div>
            <div style={s.todayStats}>
              <div><span>{locale === 'ar' ? 'المتوقع' : 'Expected'}</span><b>{todayAttendance.expected_count}</b></div>
              <div><span>{locale === 'ar' ? 'حضر' : 'Attended'}</span><b>{todayAttendance.attended_count}</b></div>
              <div><span>{locale === 'ar' ? 'لم يحضر' : 'Missing'}</span><b>{todayAttendance.missing_count}</b></div>
            </div>
            <div style={s.todaySearchWrap}>
              <input
                style={s.todaySearchInput}
                value={todayAttendanceSearch}
                onChange={(e) => setTodayAttendanceSearch(e.target.value)}
                placeholder={locale === 'ar' ? 'ابحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
              />
              {todayAttendanceSearch && <button style={s.clearTodaySearch} onClick={() => setTodayAttendanceSearch('')}>x</button>}
            </div>
            <div style={s.todayList}>
              {filteredTodayAttendance.map((member) => (
                <div key={member.member_id} style={s.todayRow}>
                  <div>
                    <strong>{member.member_name}</strong>
                    <span>{member.member_phone}</span>
                  </div>
                  {member.attended ? (
                    <span style={s.attendedPill}>{locale === 'ar' ? 'مسجل' : 'Checked in'}</span>
                  ) : (
                    <button style={s.checkBtn} disabled={attendanceSaving === member.member_id} onClick={() => registerFromDashboard(member)}>
                      {attendanceSaving === member.member_id ? '...' : t('attendance.checkIn')}
                    </button>
                  )}
                </div>
              ))}
              {filteredTodayAttendance.length === 0 && (
                <div style={s.emptyToday}>{todayAttendanceSearch ? (locale === 'ar' ? 'لا توجد نتائج' : 'No results') : (locale === 'ar' ? 'لا يوجد مشتركين متوقعين اليوم' : 'No expected members today')}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAttendance && (
        <div style={s.modalOverlay} onClick={() => setShowAttendance(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHead}>
              <h2>{t('attendance.title')}</h2>
              <button style={s.closeBtn} onClick={() => setShowAttendance(false)}>x</button>
            </div>
            <iframe title="attendance" src="/attendance?embed=1" style={s.frame} />
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { display: 'grid', gap: 18 },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  actionBtn: (color) => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px',
    border: `1px solid ${color}55`, borderRadius: 8, background: `${color}18`,
    color, fontWeight: 800, cursor: 'pointer',
  }),
  bellBtn: { position: 'relative', padding: '10px 14px', border: '1px solid rgba(255,214,10,0.30)', borderRadius: 8, background: 'rgba(255,214,10,0.10)', color: '#ffd60a', cursor: 'pointer', fontSize: 18, lineHeight: 1 },
  bellBadge: { position: 'absolute', top: 4, insetInlineEnd: 4, minWidth: 16, height: 16, borderRadius: 99, background: '#ff3355', color: '#fff', fontSize: 10, fontWeight: 900, display: 'grid', placeItems: 'center' },
  notifPanel: { position: 'fixed', top: 72, insetInlineEnd: 16, width: 300, maxHeight: 'calc(100vh - 90px)', overflowY: 'auto', borderRadius: 12, background: '#0f0f1c', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 500, padding: 14, display: 'grid', gap: 12 },
  notifHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' },
  notifSection: (color) => ({ padding: 10, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}30`, display: 'grid', gap: 6 }),
  notifSectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', fontWeight: 700, fontSize: 13 },
  notifToggle: { border: 0, background: 'rgba(255,255,255,0.08)', color: '#aaa', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 },
  notifItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#d8d8e4', fontSize: 13 },
  dismissBtn: { width: 26, height: 26, border: 0, borderRadius: 6, background: 'rgba(255,255,255,0.08)', color: '#aaa', cursor: 'pointer', fontWeight: 900, fontSize: 13, lineHeight: 1, flexShrink: 0 },
  periodPicker: { marginInlineStart: 'auto', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: 4, borderRadius: 8, background: 'rgba(14,14,24,0.72)', border: '1px solid rgba(255,255,255,0.06)' },
  periodBtn: { padding: '8px 12px', border: 0, borderRadius: 6, background: 'transparent', color: '#8a8a9a', cursor: 'pointer', fontWeight: 800, fontSize: 12 },
  periodActive: { background: 'rgba(0,245,212,0.16)', color: '#00f5d4' },
  customDateRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 6, background: 'rgba(0,245,212,0.06)', border: '1px solid rgba(0,245,212,0.15)' },
  customDateInput: { padding: '5px 8px', background: 'rgba(14,14,24,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 12, color: '#e8e8f0', outline: 'none', width: 130 },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 80,
    gap: 16,
  },
  spinner: {
    width: 28,
    height: 28,
    border: '2px solid rgba(255,255,255,0.04)',
    borderTopColor: '#00f5d4',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
  },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: 24 },
  modal: { width: 'min(1120px, 96vw)', height: 'min(780px, 92vh)', borderRadius: 10, background: '#08080e', border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden', display: 'grid', gridTemplateRows: '56px 1fr' },
  modalHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#fff' },
  closeBtn: { width: 32, height: 32, border: 0, borderRadius: 6, background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer' },
  frame: { border: 0, width: '100%', height: '100%', background: '#08080e' },
  card: {
    position: 'relative',
    borderRadius: 14,
    padding: '24px 24px 20px',
    overflow: 'hidden',
    background: 'rgba(14, 14, 24, 0.7)',
    border: '1px solid rgba(255,255,255,0.04)',
    animation: 'fadeUp 0.5s ease both',
    transition: 'transform 0.25s, border-color 0.25s',
  },
  cardGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, position: 'relative' },
  cardIcon: { fontSize: 24 },
  cardLabel: { fontSize: 12, color: '#6b6b80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' },
  cardValue: { fontSize: 34, fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: '1px', lineHeight: 1, position: 'relative' },
  cardBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.6,
  },
  chartGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 },
  weekSection: { padding: 14, borderRadius: 10, background: 'rgba(14,14,24,0.72)', border: '1px solid rgba(255,255,255,0.06)' },
  analyticsLayout: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'stretch' },
  rightNodes: { display: 'grid', gap: 16 },
  trendCard: { minHeight: 260, padding: 18, borderRadius: 10, background: 'rgba(14,14,24,0.72)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' },
  chartHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  trendTotal: { color: '#00f5d4', fontSize: 28, fontWeight: 900 },
  trendBars: { height: 190, display: 'flex', alignItems: 'end', gap: 4, overflowX: 'auto', paddingBottom: 4 },
  trendItem: { minWidth: 22, display: 'grid', justifyItems: 'center', gap: 6, color: '#777789', fontSize: 10 },
  trendBar: { width: 14, borderRadius: '6px 6px 2px 2px', background: 'linear-gradient(180deg, #00f5d4, #00aaff)', boxShadow: '0 0 12px rgba(0,245,212,0.20)' },
  chartCard: { padding: 18, borderRadius: 10, background: 'rgba(14,14,24,0.72)', border: '1px solid rgba(255,255,255,0.06)' },
  chartTitle: { margin: '0 0 14px', color: '#fff', fontSize: 16 },
  genderRows: { display: 'grid', gap: 12 },
  genderRow: { display: 'grid', gridTemplateColumns: '84px 1fr 36px', alignItems: 'center', gap: 10, color: '#d8d8e4' },
  pieWrap: { display: 'grid', gridTemplateColumns: '116px 1fr', alignItems: 'center', gap: 14 },
  pie: { width: 116, height: 116, borderRadius: '50%', display: 'grid', placeItems: 'center', boxShadow: '0 0 22px rgba(0,245,212,0.14)' },
  pieLegend: { display: 'grid', gap: 10, color: '#d8d8e4', fontSize: 13 },
  legendDot: { display: 'inline-block', width: 10, height: 10, borderRadius: 99, marginInlineEnd: 8 },
  barTrack: { height: 9, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: (color) => ({ height: '100%', borderRadius: 99, background: color, boxShadow: `0 0 12px ${color}55` }),
  miniBars: { minHeight: 160, display: 'flex', alignItems: 'end', justifyContent: 'space-around', gap: 10 },
  monthBar: { display: 'grid', justifyItems: 'center', gap: 6, color: '#858596', fontSize: 12 },
  verticalBar: { width: 28, borderRadius: '7px 7px 2px 2px', background: 'linear-gradient(180deg, #00f5d4, #a277ff)' },
  weekGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 10 },
  weekItem: { minHeight: 76, display: 'grid', gap: 6, color: '#d8d8e4', padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'start' },
  weekToday: { background: 'rgba(0,245,212,0.12)', borderColor: 'rgba(0,245,212,0.38)', boxShadow: '0 0 0 1px rgba(0,245,212,0.10)' },
  attendanceModal: { width: 'min(720px, 94vw)', maxHeight: '88vh', overflow: 'auto', borderRadius: 10, background: '#08080e', border: '1px solid rgba(255,255,255,0.10)', display: 'grid', gridTemplateRows: '56px auto auto 1fr' },
  todayStats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' },
  todaySearchWrap: { display: 'grid', gridTemplateColumns: '1fr 32px', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  todaySearchInput: { minHeight: 38, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)', color: '#fff', outline: 0 },
  clearTodaySearch: { border: 0, borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: '#d8d8e4', cursor: 'pointer' },
  todayList: { display: 'grid', gap: 8, padding: 16 },
  todayRow: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: '#d8d8e4' },
  attendedPill: { padding: '7px 12px', borderRadius: 999, background: 'rgba(0,245,147,0.14)', color: '#00f593', fontSize: 12, fontWeight: 800 },
  checkBtn: { padding: '9px 14px', border: 0, borderRadius: 8, background: '#00f5d4', color: '#07100f', fontWeight: 900, cursor: 'pointer' },
  emptyToday: { padding: 24, textAlign: 'center', color: '#858596', border: '1px dashed rgba(255,255,255,0.10)', borderRadius: 8 },
}
