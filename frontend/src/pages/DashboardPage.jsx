import React, { useState, useEffect } from 'react'
import { getDashboard } from '../api/dashboard'
import { useI18n } from '../context/I18nContext'

const cardConfig = [
  { key: 'total_members', label: 'dashboard.totalMembers', icon: '👥', accent: '#00f5d4' },
  { key: 'active_subscriptions', label: 'dashboard.activeSubs', icon: '✅', accent: '#00f593' },
  { key: 'expired_subscriptions', label: 'dashboard.expiredSubs', icon: '❌', accent: '#ff3355' },
  { key: 'today_appointments', label: 'dashboard.todayAppts', icon: '📅', accent: '#ffd60a' },
  { key: 'total_revenue', label: 'dashboard.totalRevenue', icon: '💰', accent: '#a277ff' },
  { key: 'equipment_needing_maintenance', label: 'dashboard.equipMaint', icon: '🔧', accent: '#ff8c42' },
]

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const { t, locale } = useI18n()

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
    if (key === 'total_revenue') return `$${val?.toFixed(2)}`
    return val
  }

  return (
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
  )
}

const s = {
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
