import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BadgeCheckIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ClockIcon,
  ListChecksIcon,
  SearchIcon,
  UserCheckIcon,
  XIcon,
} from 'lucide-react'
import { createAttendance, getAttendance, getEligibleAttendanceMembers } from '../api/attendance'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'

const PAGE_SIZE = 12

const todayValue = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export default function AttendancePage() {
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const isRtl = locale === 'ar'
  const [members, setMembers] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [recordSearch, setRecordSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [durationHours, setDurationHours] = useState('1')
  const [note, setNote] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(todayValue())
  const [totalCount, setTotalCount] = useState(0)

  const loadMembers = useCallback(async () => {
    const res = await getEligibleAttendanceMembers({ search: search || undefined })
    setMembers(res.data.items || [])
  }, [search])

  const loadAttendance = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAttendance({
        skip: 0,
        limit: PAGE_SIZE,
        search: recordSearch || undefined,
        attendance_date: attendanceDate || undefined,
      })
      setAttendance(res.data.items || [])
      setTotalCount(res.data.total_count || 0)
    } finally {
      setLoading(false)
    }
  }, [recordSearch, attendanceDate])

  useEffect(() => { loadMembers() }, [loadMembers])
  useEffect(() => { loadAttendance() }, [loadAttendance])

  const selectedMember = useMemo(
    () => members.find((member) => String(member.id) === String(selectedId)),
    [members, selectedId],
  )

  const activeTodayIds = useMemo(
    () => new Set(attendance.map((item) => item.member_id)),
    [attendance],
  )

  const nowLabel = useMemo(() => new Date().toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }), [locale])

  const handleCheckIn = async (memberId = selectedId) => {
    if (!memberId) {
      toast(t('attendance.chooseMember'), 'info')
      return
    }
    setSaving(true)
    try {
      await createAttendance({ member_id: Number(memberId), duration_hours: Number(durationHours || 1), note: note || null })
      toast(t('attendance.saved'), 'success')
      setSelectedId('')
      setDurationHours('1')
      setNote('')
      await loadAttendance()
      await loadMembers()
    } catch (error) {
      if (error.response?.status === 409) toast(t('attendance.alreadyToday'), 'info')
      else if (error.response?.status === 402) toast(t('attendance.notPaid'), 'error')
      else if (error.response?.status === 403) toast(t('attendance.noActiveSubscription'), 'error')
      else toast(error.response?.data?.detail || t('attendance.saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const formatDateTime = (value) => {
    const date = new Date(value)
    return {
      date: date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    }
  }

  return (
    <div style={s.page}>
      <section style={s.hero}>
        <div>
          <div style={s.kicker}><UserCheckIcon size={16} />{t('attendance.kicker')}</div>
          <h1 style={s.title}>{t('attendance.title')}</h1>
          <p style={s.subtitle}>{t('attendance.subtitle')}</p>
        </div>
        <div style={s.clockPanel}>
          <ClockIcon size={20} />
          <span style={s.clockTime}>{nowLabel}</span>
          <span style={s.clockText}>{t('attendance.systemTime')}</span>
        </div>
      </section>

      <section style={s.workArea}>
        <div style={s.checkInPanel}>
          <div style={s.panelHead}>
            <div>
              <h2 style={s.panelTitle}>{t('attendance.quickCheckIn')}</h2>
              <p style={s.panelHint}>{t('attendance.searchHint')}</p>
            </div>
            <BadgeCheckIcon size={24} color="#00f5d4" />
          </div>

          <div style={s.searchBox}>
            <SearchIcon size={18} color="#5a5a6a" />
            <input
              style={s.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('attendance.searchMember')}
            />
            {search && (
              <button style={s.iconBtn} onClick={() => setSearch('')} aria-label={t('common.cancel')}>
                <XIcon size={15} />
              </button>
            )}
          </div>

          <div style={s.memberList}>
            {members.slice(0, 8).map((member) => {
              const checked = activeTodayIds.has(member.id)
              const selected = String(selectedId) === String(member.id)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedId(member.id)}
                  onDoubleClick={() => !checked && !saving && handleCheckIn(member.id)}
                  style={{
                    ...s.memberRow,
                    ...(selected ? s.memberRowSelected : {}),
                    ...(checked ? s.memberRowChecked : {}),
                  }}
                  title={checked ? t('attendance.checked') : t('attendance.doubleClickHint')}
                >
                  <span style={s.avatar}>{member.name?.slice(0, 1)?.toUpperCase() || '?'}</span>
                  <span style={s.memberInfo}>
                    <strong style={s.memberName}>{member.name}</strong>
                    <small style={s.memberPhone}>{member.phone}</small>
                  </span>
                  <span style={checked ? s.checkedPill : s.statusPill}>{checked ? t('attendance.checked') : t(`members.status${member.status?.charAt(0).toUpperCase()}${member.status?.slice(1)}`)}</span>
                </button>
              )
            })}
          </div>

          <div style={s.selectedBar}>
            <div>
              <span style={s.selectedLabel}>{t('attendance.selectedMember')}</span>
              <strong style={s.selectedName}>{selectedMember?.name || t('attendance.noneSelected')}</strong>
            </div>
            <input
              style={s.noteInput}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('attendance.notePlaceholder')}
            />
            <input
              style={s.durationInput}
              type="number"
              min="0.25"
              step="0.25"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              title={t('attendance.durationHours')}
            />
            <button style={s.checkButton} onClick={() => handleCheckIn()} disabled={saving || !selectedId}>
              <CheckCircle2Icon size={18} />
              {saving ? t('common.loading') : t('attendance.checkIn')}
            </button>
          </div>
        </div>

        <div style={s.statsPanel}>
          <div style={s.stat}>
            <ListChecksIcon size={20} />
            <span>{t('attendance.todayTotal')}</span>
            <strong>{totalCount}</strong>
          </div>
          <div style={s.stat}>
            <CalendarDaysIcon size={20} />
            <span>{t('attendance.selectedDate')}</span>
            <input
              style={s.dateInput}
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section style={s.records}>
        <div style={s.recordsHead}>
          <h2 style={s.panelTitle}>{t('attendance.records')}</h2>
          <div style={s.recordSearch}>
            <SearchIcon size={16} color="#5a5a6a" />
            <input
              style={s.recordInput}
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
              placeholder={t('attendance.searchRecords')}
            />
          </div>
        </div>

        {loading ? (
          <div style={s.empty}>{t('common.loading')}</div>
        ) : attendance.length === 0 ? (
          <div style={s.empty}>{t('attendance.empty')}</div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>{t('attendance.member')}</th>
                  <th style={s.th}>{t('attendance.phone')}</th>
                  <th style={s.th}>{t('attendance.date')}</th>
                  <th style={s.th}>{t('attendance.time')}</th>
                  <th style={s.th}>{t('attendance.durationHours')}</th>
                  <th style={s.th}>{t('common.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((item) => {
                  const stamp = formatDateTime(item.checked_in_at)
                  return (
                    <tr key={item.id}>
                      <td style={s.td}>{item.member_name}</td>
                      <td style={s.td}>{item.member_phone}</td>
                      <td style={s.td}>{stamp.date}</td>
                      <td style={{ ...s.td, color: '#00f5d4', fontWeight: 700 }}>{stamp.time}</td>
                      <td style={s.td}>{Number(item.duration_hours || 1).toFixed(1)}</td>
                      <td style={s.td}>{item.note || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

const s = {
  page: { display: 'grid', gap: 18 },
  hero: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: 18,
    padding: 24, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
    background: 'linear-gradient(135deg, rgba(0,245,212,0.10), rgba(255,214,10,0.05) 45%, rgba(20,20,35,0.78))',
  },
  kicker: { display: 'flex', alignItems: 'center', gap: 8, color: '#00f5d4', fontSize: 12, fontWeight: 700, marginBottom: 10 },
  title: { margin: 0, color: '#f4f4fb', fontSize: 30, fontFamily: 'var(--font-heading)', fontWeight: 400, letterSpacing: 1 },
  subtitle: { margin: '10px 0 0', color: '#8b8b9b', fontSize: 14, maxWidth: 620, lineHeight: 1.7 },
  clockPanel: {
    minWidth: 180, borderRadius: 8, background: 'rgba(8,8,14,0.72)', border: '1px solid rgba(0,245,212,0.16)',
    display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 6, color: '#00f5d4',
  },
  clockTime: { fontSize: 28, color: '#fff', fontWeight: 800, letterSpacing: 0 },
  clockText: { fontSize: 12, color: '#6f7082' },
  workArea: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 18 },
  checkInPanel: { padding: 18, borderRadius: 8, background: 'rgba(20,20,35,0.74)', border: '1px solid rgba(255,255,255,0.06)' },
  panelHead: { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 16 },
  panelTitle: { margin: 0, color: '#f4f4fb', fontSize: 18, fontWeight: 750 },
  panelHint: { margin: '6px 0 0', color: '#6f7082', fontSize: 13 },
  searchBox: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', minHeight: 46, borderRadius: 8, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)' },
  searchInput: { flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 0, color: '#fff', fontSize: 14 },
  iconBtn: { width: 28, height: 28, border: 0, borderRadius: 6, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#a9a9b7', display: 'grid', placeItems: 'center' },
  memberList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginTop: 14 },
  memberRow: { minHeight: 68, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'start', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,14,0.45)', color: '#fff', cursor: 'pointer' },
  memberRowSelected: { borderColor: 'rgba(0,245,212,0.55)', boxShadow: '0 0 0 1px rgba(0,245,212,0.18)' },
  memberRowChecked: { opacity: 0.68, cursor: 'default' },
  avatar: { width: 36, height: 36, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(0,245,212,0.12)', color: '#00f5d4', fontWeight: 800, flexShrink: 0 },
  memberInfo: { display: 'grid', gap: 4, minWidth: 0, flex: 1 },
  memberName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 },
  memberPhone: { color: '#747485', fontSize: 12 },
  statusPill: { padding: '5px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.055)', color: '#9a9aac', fontSize: 11, whiteSpace: 'nowrap' },
  checkedPill: { padding: '5px 9px', borderRadius: 6, background: 'rgba(0,245,147,0.12)', color: '#00f593', fontSize: 11, whiteSpace: 'nowrap' },
  selectedBar: { marginTop: 16, display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr) 90px auto', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, background: 'rgba(0,245,212,0.06)', border: '1px solid rgba(0,245,212,0.12)' },
  selectedLabel: { display: 'block', color: '#6f7082', fontSize: 11, marginBottom: 4 },
  selectedName: { color: '#fff', fontSize: 14 },
  noteInput: { minHeight: 42, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,8,14,0.45)', color: '#fff', outline: 0 },
  durationInput: { minHeight: 42, padding: '0 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,8,14,0.45)', color: '#fff', outline: 0 },
  checkButton: { minHeight: 42, padding: '0 18px', border: 0, borderRadius: 8, background: 'linear-gradient(135deg, #00f5d4, #ffd60a)', color: '#08080e', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, cursor: 'pointer' },
  statsPanel: { display: 'grid', gap: 12 },
  stat: { minHeight: 122, display: 'grid', alignContent: 'center', gap: 8, padding: 18, borderRadius: 8, background: 'rgba(20,20,35,0.74)', border: '1px solid rgba(255,255,255,0.06)', color: '#8b8b9b' },
  dateInput: { height: 38, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,8,14,0.55)', color: '#fff', padding: '0 10px', colorScheme: 'dark' },
  records: { padding: 18, borderRadius: 8, background: 'rgba(20,20,35,0.74)', border: '1px solid rgba(255,255,255,0.06)' },
  recordsHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 },
  recordSearch: { width: 280, display: 'flex', alignItems: 'center', gap: 8, minHeight: 38, borderRadius: 8, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)', padding: '0 10px' },
  recordInput: { flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 0, color: '#fff' },
  tableWrap: { overflow: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.055)' },
  table: { width: '100%', borderCollapse: 'collapse', color: '#d8d8e4', fontSize: 13 },
  th: { padding: '13px 14px', textAlign: 'start', color: '#767687', background: 'rgba(255,255,255,0.035)', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  td: { padding: '13px 14px', borderBottom: '1px solid rgba(255,255,255,0.045)' },
  empty: { display: 'grid', placeItems: 'center', minHeight: 120, color: '#767687', border: '1px dashed rgba(255,255,255,0.10)', borderRadius: 8 },
}
