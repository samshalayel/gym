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
import { getAttendanceDailySummary, getAttendanceReport, getMemberAttendanceReport } from '../api/attendance'
import { useI18n } from '../context/I18nContext'
import { exportToExcel } from '../utils/exportExcel'

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
  const [daily, setDaily]         = useState(null)
  const [dailyDate, setDailyDate] = useState(today())
  const [loading, setLoading]     = useState(false)
  const [showMissing, setShowMissing] = useState(false)
  const [popup, setPopup]         = useState(null) // 'attended' | 'absent' | null

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

  useEffect(() => {
    getAttendanceDailySummary({ attendance_date: dailyDate }).then((res) => setDaily(res.data))
  }, [dailyDate])

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    members: acc.members + 1,
    sessions: acc.sessions + (row.sessions_count || 0),
    hours: acc.hours + (row.total_hours || 0),
  }), { members: 0, sessions: 0, hours: 0 }), [rows])

  const handleExport = () => {
    if (!rows.length) return
    const data = rows.map((r) => ({
      member_name: r.member_name,
      member_phone: r.member_phone || '',
      sessions_count: r.sessions_count || 0,
      remaining: r.subscription?.session_count ? `${r.subscription.remaining_sessions} / ${r.subscription.session_count}` : (locale === 'ar' ? 'مفتوح' : 'Open'),
      plan_name: r.subscription?.plan_name || '',
      end_date: r.subscription?.end_date || '',
      status: r.member_status,
    }))
    exportToExcel({
      data,
      headers: ['member_name', 'member_phone', 'sessions_count', 'remaining', 'plan_name', 'end_date', 'status'],
      labels: locale === 'ar'
        ? ['الاسم', 'الهاتف', 'عدد الجلسات', 'المتبقي', 'الباقة', 'تاريخ الانتهاء', 'الحالة']
        : ['Name', 'Phone', 'Sessions', 'Remaining', 'Plan', 'End Date', 'Status'],
      filename: locale === 'ar' ? `تقرير_الحضور_${startDate || ''}` : `attendance_report_${startDate || ''}`,
      sheet: locale === 'ar' ? 'الحضور' : 'Attendance',
    })
  }

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

  // Calculate all expected training days within subscription period
  const buildSessionTimeline = (subscription, attendanceItems) => {
    if (!subscription?.start_date) return []
    const dayMap = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 }
    const trainingDays = subscription.training_days || 'all'
    // When 'all', exclude Friday (5) as the gym is closed on Fridays
    const allowedDays = trainingDays === 'all'
      ? [0, 1, 2, 3, 4, 6]  // sun=0, mon=1, tue=2, wed=3, thu=4, sat=6 (no fri=5)
      : trainingDays.split(',').map(d => dayMap[d.trim()]).filter(d => d !== undefined)
    const attendedDates = new Set(attendanceItems.map(a => a.checked_in_at?.slice(0, 10)))
    const start = new Date(subscription.start_date)
    const todayDate = new Date()
    const endRaw = new Date(subscription.end_date)
    const end = endRaw < todayDate ? endRaw : todayDate
    const timeline = []
    const cur = new Date(start)
    while (cur <= end) {
      const dayOfWeek = cur.getDay()
      if (!allowedDays || allowedDays.includes(dayOfWeek)) {
        const dateStr = cur.toISOString().slice(0, 10)
        timeline.push({ date: dateStr, attended: attendedDates.has(dateStr) })
      }
      cur.setDate(cur.getDate() + 1)
    }
    return timeline.reverse() // newest first
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
          <div style={s.stat}><Clock3Icon size={19} /><span>{t('attendanceReport.hours')}</span><strong>{totals.sessions}</strong></div>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
        <div style={{ ...s.searchBox, flex: 1 }}>
          <SearchIcon size={18} color="#6f7082" />
          <input style={s.searchInput} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('attendanceReport.search')} />
          {search && <button style={s.iconBtn} onClick={() => setSearch('')}><XIcon size={15} /></button>}
        </div>
        <button
          style={{ padding: '0 18px', background: 'rgba(29,111,66,0.9)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}
          onClick={handleExport}
        >
          ⬇ {locale === 'ar' ? 'تصدير Excel' : 'Export Excel'}
        </button>
      </div>

      {daily && (
        <section style={s.dailyBox}>
          <div style={s.dailyDate}>
            <span>{locale === 'ar' ? 'تاريخ التقرير' : 'Report date'}</span>
            <input style={s.dateInput} type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
          </div>
          <div style={s.dailyStat}><span>{t('attendanceReport.dailyExpected')}</span><b>{daily.expected_count}</b></div>
          <div style={s.dailyStat}><span>{t('attendanceReport.attendedToday')}</span><b>{daily.attended_count}</b></div>
          <div style={s.dailyStat}><span>{t('attendanceReport.missingToday')}</span><b>{daily.missing_count}</b></div>
          <div style={s.dailyNamesGrid}>
            {/* ── Attended ── */}
            <button style={s.dailyCountBtn('#00f593')} onClick={() => setPopup('attended')}>
              <span style={s.dailyCountNum('#00f593')}>{daily.items.filter((i) => i.attended).length}</span>
              <span style={s.dailyCountLabel}>{locale === 'ar' ? 'حضروا' : 'Attended'}</span>
              <span style={{ color: '#6f7082', fontSize: 11 }}>↗</span>
            </button>
            {/* ── Absent ── */}
            <button style={s.dailyCountBtn('#ff3355')} onClick={() => setPopup('absent')}>
              <span style={s.dailyCountNum('#ff3355')}>{daily.items.filter((i) => !i.attended).length}</span>
              <span style={s.dailyCountLabel}>{locale === 'ar' ? 'لم يحضروا' : 'Missing'}</span>
              <span style={{ color: '#6f7082', fontSize: 11 }}>↗</span>
            </button>
          </div>
        </section>
      )}

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
              <div style={s.metric}><span>{t('attendanceReport.totalHours')}</span><b>{row.sessions_count}</b></div>
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
                <div style={s.hoursBadge}>{detail.sessions_count} {t('attendanceReport.hoursShort')}</div>
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
                {(() => {
                  const timeline = buildSessionTimeline(detail.subscription, detail.items)
                  const attendedMap = {}
                  detail.items.forEach(a => { attendedMap[a.checked_in_at?.slice(0, 10)] = a })
                  if (timeline.length === 0) {
                    return detail.items.length === 0
                      ? <p style={s.muted}>{t('attendanceReport.noVisits')}</p>
                      : detail.items.map((item) => (
                        <div key={item.id} style={{ ...s.visit, borderColor: 'rgba(0,245,147,0.25)' }}>
                          <div>
                            <span style={{ color: '#00f593', fontSize: 11, fontWeight: 700 }}>✅ {locale === 'ar' ? 'حضر' : 'Attended'}</span>
                            <strong style={{ display: 'block', color: '#e8e8f0' }}>{formatDateTime(item.checked_in_at)}</strong>
                            {item.note && <p style={s.note}>{item.note}</p>}
                          </div>
                          <span style={{ color: '#00f593', fontWeight: 700 }}>+1</span>
                        </div>
                      ))
                  }
                  return timeline.map((entry) => {
                    const rec = attendedMap[entry.date]
                    return (
                      <div key={entry.date} style={{ ...s.visit, borderColor: entry.attended ? 'rgba(0,245,147,0.2)' : 'rgba(255,51,85,0.2)', background: entry.attended ? 'rgba(0,245,147,0.04)' : 'rgba(255,51,85,0.04)' }}>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: entry.attended ? '#00f593' : '#ff3355' }}>
                            {entry.attended ? '✅' : '❌'} {entry.attended ? (locale === 'ar' ? 'حضر' : 'Attended') : (locale === 'ar' ? 'لم يحضر' : 'Absent')}
                          </span>
                          <strong style={{ display: 'block', color: '#e8e8f0', fontSize: 13 }}>{entry.date}</strong>
                          {rec?.note && <p style={s.note}>{rec.note}</p>}
                        </div>
                        <span style={{ fontWeight: 700, color: entry.attended ? '#00f593' : '#ff6680', fontSize: 13 }}>{entry.attended ? '+1' : '—'}</span>
                      </div>
                    )
                  })
                })()}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ── Daily popup ── */}
      {popup && daily && (
        <div style={s.popupOverlay} onClick={() => setPopup(null)}>
          <div style={s.popupBox} onClick={(e) => e.stopPropagation()}>
            <div style={s.popupHead}>
              <div>
                <h2 style={s.popupTitle}>
                  {popup === 'attended'
                    ? (locale === 'ar' ? '✅ الحضور' : '✅ Attended')
                    : (locale === 'ar' ? '❌ الغياب' : '❌ Absent')}
                </h2>
                <p style={s.popupSub}>{dailyDate}</p>
              </div>
              <button style={s.popupClose} onClick={() => setPopup(null)}><XIcon size={16} /></button>
            </div>

            {popup === 'attended' ? (
              /* ── Attended list ── */
              <div style={s.popupList}>
                {daily.items.filter((i) => i.attended).length === 0
                  ? <p style={s.popupEmpty}>{locale === 'ar' ? 'لا يوجد حضور' : 'No attendance'}</p>
                  : daily.items.filter((i) => i.attended).map((item) => (
                    <div key={item.member_id} style={s.popupRow}>
                      <div style={s.popupAvatar}>{item.member_name?.[0]?.toUpperCase()}</div>
                      <div style={s.popupInfo}>
                        <strong style={{ color: '#e8e8f0' }}>{item.member_name}</strong>
                        <small style={{ color: '#777789' }}>{item.member_phone}</small>
                      </div>
                      <div style={s.popupSessionBadge(item.remaining_sessions)}>
                        <span style={{ fontSize: 10, color: '#777789' }}>
                          {locale === 'ar' ? 'متبقي' : 'Remaining'}
                        </span>
                        <b style={{ fontSize: 15 }}>
                          {item.remaining_sessions === null
                            ? (locale === 'ar' ? '∞' : '∞')
                            : item.remaining_sessions}
                        </b>
                        <span style={{ fontSize: 10, color: '#777789' }}>
                          {locale === 'ar' ? 'جلسة' : 'session'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              /* ── Absent list ── */
              <div style={s.popupList}>
                {daily.items.filter((i) => !i.attended).length === 0
                  ? <p style={s.popupEmpty}>{locale === 'ar' ? 'لا يوجد غياب' : 'No absences'}</p>
                  : daily.items.filter((i) => !i.attended).map((item) => (
                    <div key={item.member_id} style={s.popupRow}>
                      <div style={{ ...s.popupAvatar, background: 'rgba(255,51,85,0.12)', color: '#ff6680' }}>
                        {item.member_name?.[0]?.toUpperCase()}
                      </div>
                      <div style={s.popupInfo}>
                        <strong style={{ color: '#e8e8f0' }}>{item.member_name}</strong>
                        <small style={{ color: '#777789' }}>{item.member_phone}</small>
                      </div>
                      <div style={s.popupAbsentBadge}>
                        <span style={{ fontSize: 10, color: '#777789' }}>
                          {locale === 'ar' ? 'أيام غياب' : 'Absent days'}
                        </span>
                        <b style={{ fontSize: 15, color: '#ff6680' }}>{item.absent_days ?? 0}</b>
                        <span style={{ fontSize: 10, color: '#777789' }}>
                          {locale === 'ar' ? 'يوم' : 'day'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
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
  dailyBox: { display: 'grid', gridTemplateColumns: '180px repeat(3, minmax(120px, 160px)) 1fr', gap: 10, alignItems: 'start', padding: 14, borderRadius: 8, background: 'rgba(0,245,212,0.07)', border: '1px solid rgba(0,245,212,0.14)' },
  dailyDate: { display: 'grid', gap: 5, color: '#858596', fontSize: 12 },
  dailyStat: { display: 'grid', gap: 4, color: '#858596' },
  dailyNamesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  dailyCountBtn: (color) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
    background: `${color}12`, border: `1px solid ${color}30`,
    transition: 'background 0.2s',
  }),
  dailyCountNum: (color) => ({ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }),
  dailyCountLabel: { fontSize: 13, color: '#d8d8e4', fontWeight: 700 },

  // Daily popup
  popupOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: 20 },
  popupBox: { width: '100%', maxWidth: 500, maxHeight: '80vh', display: 'grid', gridTemplateRows: 'auto 1fr', borderRadius: 12, background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.10)', overflow: 'hidden' },
  popupHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  popupTitle: { margin: 0, color: '#fff', fontSize: 18, fontWeight: 700 },
  popupSub: { margin: '4px 0 0', color: '#6f7082', fontSize: 12 },
  popupClose: { width: 30, height: 30, border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: '#a9a9b7', display: 'grid', placeItems: 'center' },
  popupList: { overflowY: 'auto', padding: '10px 14px', display: 'grid', gap: 8 },
  popupEmpty: { margin: 0, color: '#777789', textAlign: 'center', padding: 30 },
  popupRow: { display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 10, alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' },
  popupAvatar: { width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'rgba(0,245,147,0.12)', color: '#00f593', fontWeight: 900, fontSize: 14 },
  popupInfo: { display: 'grid', gap: 2, minWidth: 0 },
  popupSessionBadge: (remaining) => ({
    display: 'grid', gap: 1, alignItems: 'center', textAlign: 'center',
    padding: '6px 10px', borderRadius: 8, minWidth: 64,
    background: remaining === 0 ? 'rgba(255,51,85,0.12)' : remaining === null ? 'rgba(0,245,147,0.10)' : remaining <= 3 ? 'rgba(255,165,0,0.12)' : 'rgba(0,245,147,0.10)',
    color: remaining === 0 ? '#ff3355' : remaining !== null && remaining <= 3 ? '#ffa500' : '#00f593',
  }),
  popupAbsentBadge: { display: 'grid', gap: 1, alignItems: 'center', textAlign: 'center', padding: '6px 10px', borderRadius: 8, minWidth: 64, background: 'rgba(255,51,85,0.10)' },
  mutedChip: { padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#777789', fontSize: 12 },
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
