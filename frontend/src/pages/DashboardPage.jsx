import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard } from '../api/dashboard'
import { useI18n } from '../context/I18nContext'
import { UsersIcon, TagsIcon, UserCheckIcon } from 'lucide-react'
import { formatCurrency } from '../utils/currency'

const cardConfig = [
  { key: 'total_members', label: 'dashboard.totalMembers', icon: '👥', accent: '#00f5d4' },
  { key: 'active_subscriptions', label: 'dashboard.activeSubs', icon: '✅', accent: '#00f593' },
  { key: 'expired_subscriptions', label: 'dashboard.expiredSubs', icon: '❌', accent: '#ff3355' },
  { key: 'unpaid_subscriptions', label: 'dashboard.unpaidSubs', icon: '⏳', accent: '#ffd60a' },
  { key: 'total_revenue', label: 'dashboard.totalRevenue', icon: '💰', accent: '#a277ff' },
  { key: 'equipment_needing_maintenance', label: 'dashboard.equipMaint', icon: '🔧', accent: '#ff8c42' },
]

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [showAttendance, setShowAttendance] = useState(false)
  const { t, locale } = useI18n()
  const navigate = useNavigate()

  useEffect(() => {
    getDashboard().then((res) => setData(res.data))
  }, [])

  if (!data) return (
    <div style={s.loading}>
      <div style={s.spinner} />
      <span style={{ color: '#5a5a6a', fontSize: 14 }}>{t('common.loading')}</span>
    </div>
  )

  const formatValue = (key, val) => {
    if (key === 'total_revenue') return formatCurrency(val)
    return val
  }

  return (
    <div style={s.page}>
      <div style={s.actions}>
        <button style={s.actionBtn('#00f5d4')} onClick={() => navigate('/members?action=new')}><UsersIcon size={18} />{t('dashboard.quickMember')}</button>
        <button style={s.actionBtn('#ffd60a')} onClick={() => navigate('/subscriptions?action=new')}><TagsIcon size={18} />{t('dashboard.quickSubscription')}</button>
        <button style={s.actionBtn('#00f593')} onClick={() => setShowAttendance(true)}><UserCheckIcon size={18} />{t('dashboard.quickAttendance')}</button>
      </div>

      {data.birthdays?.length > 0 && (
        <div style={s.alerts}>
          <strong>{t('dashboard.birthdays')}</strong>
          {data.birthdays.map((b) => (
            <span key={b.member_id} style={s.alertItem}>{b.name} - {b.days_remaining === 0 ? t('dashboard.today') : `${b.days_remaining} ${t('dashboard.days')}`}</span>
          ))}
        </div>
      )}

      <div style={s.grid}>
        {cardConfig.map((card, i) => (
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
  alerts: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: 14, borderRadius: 8, background: 'rgba(255,214,10,0.10)', border: '1px solid rgba(255,214,10,0.20)', color: '#ffd60a' },
  alertItem: { padding: '6px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.22)', color: '#fff', fontSize: 13 },
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
}
