import React, { useEffect, useMemo, useState } from 'react'
import {
  CalendarCheckIcon,
  ChevronRightIcon,
  Clock3Icon,
  DumbbellIcon,
  SearchIcon,
  UserRoundIcon,
  XIcon,
} from 'lucide-react'
import { getAttendanceReport, getMemberAttendanceReport } from '../api/attendance'
import { useI18n } from '../context/I18nContext'

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export default function AttendanceReportPage() {
  const { t, locale } = useI18n()
  const [search, setSearch]       = useState('')
  const [activeOnly, setActiveOnly] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [rows, setRows]           = useState([])
  const [selected, setSelected]   = useState(null)
  const [detail, setDetail]       = useState(null)
  const [loading, setLoading]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getAttendanceReport({
        search:      search || undefined,
        active_only: activeOnly,
        start_date:  startDate || undefined,
        end_date:    endDate   || undefined,
      })
      setRows(res.data.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [search, activeOnly, startDate, endDate])

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    members: acc.members + 1,
    sessions: acc.sessions + (row.sessions_count || 0),
    hours: acc.hours + (row.total_hours || 0),
  }), { members: 0, sessions: 0, hours: 0 }), [rows])

  const openDetail = async (row) => {
    setSelected(row)
    setDetail(null)
    const res = await getMemberAttendanceReport(row.member_id)
    setDetail(res.data)
  }

  const formatDateTime = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const sessionsText = (subscription) => {
    if (!subscription?.session_count) return t('attendanceReport.openSessions')
    return `${subscription.remaining_sessions} / ${subscription.session_count}`
  }

  return (
    <div style={s.page}>
      <section style={s.hero}>
        <div>
          <div style={s.kicker}><CalendarCheckIcon size={16} />{t('attendanceReport.kicker')}</div>
          <h1 style={s.title}>{t('attendanceReport.title')}</h1>
          <p style={s.subtitle}>{t('attendanceReport.subtitle')}</p>
        </div>
        <div style={s.stats}>
          <div style={s.stat}><UserRoundIcon size={19} /><span>{t('attendanceReport.members')}</span><strong>{totals.members}</strong></div>
          <div style={s.stat}><DumbbellIcon size={19} /><span>{t('attendanceReport.sessions')}</span><strong>{totals.sessions}</strong></div>
          <div style={s.stat}><Clock3Icon size={19} /><span>{t('attendanceReport.hours')}</span><strong>{totals.hours.toFixed(1)}</strong></div>
        </div>
      </section>

      <div style={s.searchBox}>
        <SearchIcon size={18} color="#6f7082" />
        <input style={s.searchInput} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('attendanceReport.search')} />
        {search && <button style={s.iconBtn} onClick={() => setSearch('')}><XIcon size={15} /></button>}
      </div>

      {/* ── Filter bar ── */}
      <div style={s.filterBar}>
        {/* Active / Archive toggle */}
        <div style={s.toggleGroup}>
          <button
            style={{ ...s.toggleBtn, ...(activeOnly ? s.toggleActive : {}) }}
            onClick={() => setActiveOnly(true)}
          >
            ✅ {locale === 'ar' ? 'النشطون فقط' : 'Active Only'}
          </button>
          <button
            style={{ ...s.toggleBtn, ...(!activeOnly ? s.toggleArchive : {}) }}
            onClick={() => setActiveOnly(false)}
          >
            🗂 {locale === 'ar' ? 'الأرشيف (الكل)' : 'Archive (All)'}
          </button>
        </div>

        {/* Date range */}
        <div style={s.dateRange}>
          <span style={s.dateLabel}>{locale === 'ar' ? 'من' : 'From'}</span>
          <input style={s.dateInput} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={s.dateLabel}>{locale === 'ar' ? 'إلى' : 'To'}</span>
          <input style={s.dateInput} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          {(startDate || endDate) && (
            <button style={s.clearDates} onClick={() => { setStartDate(''); setEndDate('') }}>
              <XIcon size={13} />
            </button>
          )}
        </div>
      </div>

      <div style={s.layout}>
        <section style={s.list}>
          {loading ? (
            <div style={s.empty}>{t('common.loading')}</div>
          ) : rows.length === 0 ? (
            <div style={s.empty}>{t('attendanceReport.empty')}</div>
          ) : rows.map((row) => (
            <button key={row.member_id} style={{ ...s.row, ...(selected?.member_id === row.member_id ? s.rowActive : {}) }} onClick={() => openDetail(row)}>
              <div style={{ ...s.avatar, ...(row.member_status !== 'active' ? s.avatarMuted : {}) }}>
                {row.member_name?.slice(0, 1)?.toUpperCase()}
              </div>
              <div style={s.info}>
                <strong>{row.member_name}</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <small style={{ color: '#6f7082' }}>{row.member_phone}</small>
                  {row.member_status !== 'active' && (
                    <span style={s.statusBadge(row.member_status)}>
                      {row.member_status === 'expired'  ? (locale === 'ar' ? 'منتهي'  : 'Expired')  :
                       row.member_status === 'frozen'   ? (locale === 'ar' ? 'مجمّد'  : 'Frozen')   :
                       row.member_status === 'canceled' ? (locale === 'ar' ? 'ملغي'   : 'Canceled') : row.member_status}
                    </span>
                  )}
                </span>
              </div>
              <div style={s.metric}><span>{t('attendanceReport.totalHours')}</span><b>{row.total_hours.toFixed(1)}</b></div>
              <div style={s.metric}><span>{t('attendanceReport.remaining')}</span><b>{sessionsText(row.subscription)}</b></div>
              <ChevronRightIcon size={18} color="#6f7082" />
            </button>
          ))}
        </section>

        <aside style={s.detail}>
          {!selected ? (
            <div style={s.empty}>{t('attendanceReport.selectMember')}</div>
          ) : !detail ? (
            <div style={s.empty}>{t('common.loading')}</div>
          ) : (
            <>
              <div style={s.detailHead}>
                <div>
                  <h2 style={s.panelTitle}>{detail.member.name}</h2>
                  <p style={s.muted}>{detail.member.phone}</p>
                </div>
                <div style={s.hoursBadge}>{detail.total_hours.toFixed(1)} {t('attendanceReport.hoursShort')}</div>
              </div>

              <div style={s.subscriptionBox}>
                <span>{t('attendanceReport.subscription')}</span>
                <strong>{detail.subscription?.plan_name || '-'}</strong>
                <div style={s.sessionGrid}>
                  <div><small>{t('attendanceReport.used')}</small><b>{detail.subscription?.used_sessions ?? detail.sessions_count}</b></div>
                  <div><small>{t('attendanceReport.remaining')}</small><b>{sessionsText(detail.subscription)}</b></div>
                </div>
              </div>

              <div style={s.records}>
                <h3 style={s.recordsTitle}>{t('attendanceReport.details')}</h3>
                {detail.items.length === 0 ? <p style={s.muted}>{t('attendanceReport.noVisits')}</p> : detail.items.map((item) => (
                  <div key={item.id} style={s.visit}>
                    <div>
                      <strong>{formatDateTime(item.checked_in_at)}</strong>
                      {item.note && <p style={s.note}>{item.note}</p>}
                    </div>
                    <span>{Number(item.duration_hours || 1).toFixed(1)} {t('attendanceReport.hoursShort')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

const s = {
  page: { display: 'grid', gap: 18 },
  hero: { display: 'flex', justifyContent: 'space-between', gap: 18, padding: 22, borderRadius: 8, background: 'linear-gradient(135deg, rgba(0,245,212,0.10), rgba(255,214,10,0.05), rgba(20,20,35,0.78))', border: '1px solid rgba(255,255,255,0.06)' },
  kicker: { display: 'flex', alignItems: 'center', gap: 8, color: '#00f5d4', fontSize: 12, fontWeight: 800, marginBottom: 10 },
  title: { margin: 0, color: '#fff', fontSize: 30, fontFamily: 'var(--font-heading)', fontWeight: 400 },
  subtitle: { margin: '8px 0 0', color: '#858596', fontSize: 14 },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(3, 120px)', gap: 10 },
  stat: { display: 'grid', gap: 6, alignContent: 'center', padding: 14, borderRadius: 8, background: 'rgba(8,8,14,0.55)', color: '#858596' },
  searchBox: { minHeight: 48, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', borderRadius: 8, background: 'rgba(20,20,35,0.72)', border: '1px solid rgba(255,255,255,0.06)' },
  searchInput: { flex: 1, background: 'transparent', border: 0, outline: 0, color: '#fff', fontSize: 14 },
  iconBtn: { width: 28, height: 28, border: 0, borderRadius: 6, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#a9a9b7', display: 'grid', placeItems: 'center' },
  layout: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 390px', gap: 18, alignItems: 'start' },
  list: { display: 'grid', gap: 10 },
  row: { width: '100%', minHeight: 78, display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr) 110px 130px 22px', gap: 12, alignItems: 'center', padding: 14, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(20,20,35,0.72)', color: '#fff', cursor: 'pointer', textAlign: 'start' },
  rowActive: { borderColor: 'rgba(0,245,212,0.55)', boxShadow: '0 0 0 1px rgba(0,245,212,0.12)' },
  avatar: { width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'rgba(0,245,212,0.12)', color: '#00f5d4', fontWeight: 900 },
  info: { display: 'grid', gap: 4, minWidth: 0 },
  metric: { display: 'grid', gap: 4, color: '#7b7b8e' },
  detail: { position: 'sticky', top: 12, display: 'grid', gap: 14, padding: 16, borderRadius: 8, background: 'rgba(20,20,35,0.72)', border: '1px solid rgba(255,255,255,0.06)' },
  detailHead: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  panelTitle: { margin: 0, color: '#fff', fontSize: 20 },
  muted: { margin: 0, color: '#777789', fontSize: 13 },
  hoursBadge: { height: 38, display: 'grid', placeItems: 'center', padding: '0 12px', borderRadius: 8, background: 'rgba(0,245,212,0.12)', color: '#00f5d4', fontWeight: 900 },
  subscriptionBox: { display: 'grid', gap: 8, padding: 13, borderRadius: 8, background: 'rgba(8,8,14,0.45)', border: '1px solid rgba(255,255,255,0.055)', color: '#858596' },
  sessionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  records: { display: 'grid', gap: 10 },
  recordsTitle: { margin: 0, color: '#fff', fontSize: 15 },
  visit: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: 12, borderRadius: 8, background: 'rgba(8,8,14,0.42)', border: '1px solid rgba(255,255,255,0.05)', color: '#e8e8f0' },
  note: { margin: '6px 0 0', color: '#858596', fontSize: 12 },
  empty: { minHeight: 140, display: 'grid', placeItems: 'center', color: '#777789', border: '1px dashed rgba(255,255,255,0.10)', borderRadius: 8 },

  // Filter bar
  filterBar: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  toggleGroup: { display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' },
  toggleBtn: {
    padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
    background: 'rgba(20,20,35,0.72)', color: '#6f7082', transition: 'all 0.2s',
  },
  toggleActive:  { background: 'rgba(0,245,212,0.15)', color: '#00f5d4' },
  toggleArchive: { background: 'rgba(162,119,255,0.15)', color: '#a277ff' },

  dateRange: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  dateLabel: { fontSize: 12, color: '#6f7082', fontWeight: 600 },
  dateInput: {
    padding: '7px 11px', background: 'rgba(20,20,35,0.72)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
    fontSize: 13, color: '#e8e8f0', outline: 'none',
  },
  clearDates: {
    width: 26, height: 26, border: '1px solid rgba(255,51,85,0.25)',
    borderRadius: 6, cursor: 'pointer', background: 'rgba(255,51,85,0.08)',
    color: '#ff3355', display: 'grid', placeItems: 'center',
  },

  // Status badge for archive view
  statusBadge: (status) => ({
    padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
    background: status === 'expired'  ? 'rgba(255,51,85,0.12)'   :
                status === 'frozen'   ? 'rgba(0,170,255,0.12)'   :
                status === 'canceled' ? 'rgba(107,107,128,0.12)' : 'rgba(255,255,255,0.06)',
    color:      status === 'expired'  ? '#ff3355' :
                status === 'frozen'   ? '#00aaff' :
                status === 'canceled' ? '#6b6b80' : '#8a8a9a',
  }),
  avatarMuted: { background: 'rgba(107,107,128,0.15)', color: '#6b6b80' },
}
