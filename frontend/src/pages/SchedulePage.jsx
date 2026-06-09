import React, { useState, useEffect, useMemo } from 'react'
import { querySchedule } from '../api/schedule'
import { useI18n } from '../context/I18nContext'

const FEMALE_SLOTS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00']
const MALE_SLOTS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']
const slotLabel = (slot) => { if (!slot) return ''; const h = parseInt(slot); const e = (h + 1) % 24; const f = (x) => `${String(x).padStart(2, '0')}:00`; return `${f(h)} - ${f(e)}` }

const WEEKDAYS = [
  { key: 'sat', ar: 'السبت', en: 'Sat' },
  { key: 'sun', ar: 'الأحد', en: 'Sun' },
  { key: 'mon', ar: 'الإثنين', en: 'Mon' },
  { key: 'tue', ar: 'الثلاثاء', en: 'Tue' },
  { key: 'wed', ar: 'الأربعاء', en: 'Wed' },
  { key: 'thu', ar: 'الخميس', en: 'Thu' },
]

const todayKey = () => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]

export default function SchedulePage() {
  const { locale } = useI18n()
  const ar = locale === 'ar'
  const [weekday, setWeekday] = useState(() => { const t = todayKey(); return t === 'fri' ? 'sat' : t })
  const [section, setSection] = useState('female')   // female | male
  const [slot, setSlot] = useState('')
  const [type, setType] = useState('')               // '' | weights | fitness
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const slots = section === 'female' ? FEMALE_SLOTS : MALE_SLOTS

  const load = async () => {
    setLoading(true)
    try {
      const res = await querySchedule({
        weekday,
        slot: slot || undefined,
        training_type: type || undefined,
      })
      // Keep only the chosen section's gender
      const wanted = section === 'female' ? 'female' : 'male'
      setRows((res.data.items || []).filter((r) => r.gender === wanted))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [weekday, section, slot, type])

  // Group by slot for a clean overview ("unset" = members with no slot yet)
  const grouped = useMemo(() => {
    const map = {}
    for (const r of rows) {
      const k = r.time_slot || 'unset'
      if (!map[k]) map[k] = []
      map[k].push(r)
    }
    return Object.entries(map).sort((a, b) => {
      if (a[0] === 'unset') return 1   // members without a slot go last
      if (b[0] === 'unset') return -1
      return a[0].localeCompare(b[0])
    })
  }, [rows])

  return (
    <div style={s.page}>
      <section style={s.hero}>
        <div>
          <div style={s.kicker}>⏰ {ar ? 'جدول السلوتات' : 'Time Slots'}</div>
          <h1 style={s.title}>{ar ? 'استعلام الحضور المتوقع' : 'Expected Attendance'}</h1>
          <p style={s.sub}>{ar ? 'اختر اليوم والفترة والنوع لمعرفة من المفترض حضوره' : 'Pick day, slot and type to see who is expected'}</p>
        </div>
        <div style={s.bigCount}>{rows.length}</div>
      </section>

      {/* Weekday */}
      <div style={s.row}>
        {WEEKDAYS.map((d) => (
          <button key={d.key} onClick={() => setWeekday(d.key)}
            style={{ ...s.chip, ...(weekday === d.key ? s.chipActive : {}) }}>
            {ar ? d.ar : d.en}
          </button>
        ))}
      </div>

      {/* Section (gender) */}
      <div style={s.row}>
        <button onClick={() => { setSection('female'); setSlot('') }} style={{ ...s.segBtn, ...(section === 'female' ? s.segFemale : {}) }}>
          👩 {ar ? 'إناث (6ص - 12ظ)' : 'Female (6AM-12PM)'}
        </button>
        <button onClick={() => { setSection('male'); setSlot('') }} style={{ ...s.segBtn, ...(section === 'male' ? s.segMale : {}) }}>
          👨 {ar ? 'ذكور (12ظ - 12ل)' : 'Male (12PM-12AM)'}
        </button>
      </div>

      {/* Type */}
      <div style={s.row}>
        {[['', ar ? 'الكل' : 'All'], ['weights', ar ? '🏋️ حديد' : '🏋️ Weights'], ['fitness', ar ? '🤸 لياقة' : '🤸 Fitness']].map(([k, lbl]) => (
          <button key={k} onClick={() => setType(k)} style={{ ...s.chip, ...(type === k ? s.chipActive : {}) }}>{lbl}</button>
        ))}
      </div>

      {/* Slot filter */}
      <div style={s.slotRow}>
        <button onClick={() => setSlot('')} style={{ ...s.slotChip, ...(slot === '' ? s.slotActive : {}) }}>{ar ? 'كل الساعات' : 'All hours'}</button>
        {slots.map((sl) => (
          <button key={sl} onClick={() => setSlot(sl)} style={{ ...s.slotChip, ...(slot === sl ? s.slotActive : {}) }}>{slotLabel(sl)}</button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div style={s.empty}>{ar ? 'جارٍ التحميل...' : 'Loading...'}</div>
      ) : rows.length === 0 ? (
        <div style={s.empty}>{ar ? 'لا يوجد أعضاء بهذه المعايير' : 'No members match'}</div>
      ) : (
        <div style={s.results}>
          {grouped.map(([sl, members]) => (
            <div key={sl} style={s.slotGroup}>
              <div style={{ ...s.slotHead, ...(sl === 'unset' ? s.slotHeadUnset : {}) }}>
                <span>{sl === 'unset' ? `⚠️ ${ar ? 'بدون سلوت محدد' : 'No slot set'}` : `⏰ ${slotLabel(sl)}`}</span>
                <span style={s.slotCount}>{members.length}</span>
              </div>
              <div style={s.memberGrid}>
                {members.map((m) => (
                  <div key={m.member_id} style={s.memberCard}>
                    <div style={s.avatar(m.gender)}>{m.name?.[0]?.toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.mName}>{m.name}</div>
                      <div style={s.mMeta}>
                        {m.member_code && <span style={s.code}>#{m.member_code}</span>}
                        <span>{m.phone}</span>
                      </div>
                    </div>
                    {m.training_type && (
                      <span style={s.typeBadge(m.training_type)}>
                        {m.training_type === 'weights' ? (ar ? 'حديد' : 'Wt') : (ar ? 'لياقة' : 'Ft')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  page: { display: 'grid', gap: 14 },
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: 22, borderRadius: 14, background: '#050509', border: '1px solid rgba(255,255,255,0.08)' },
  kicker: { color: '#00f5d4', fontSize: 12, fontWeight: 700 },
  title: { margin: '6px 0 4px', color: '#fff', fontSize: 24 },
  sub: { color: '#8b8b9b', margin: 0, fontSize: 13 },
  bigCount: { fontSize: 44, fontWeight: 900, color: '#00f5d4' },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: { padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#aaa', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  chipActive: { background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: '1px solid transparent' },
  segBtn: { flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#aaa', cursor: 'pointer', fontSize: 14, fontWeight: 700 },
  segFemale: { background: 'rgba(255,105,180,0.14)', color: '#ff69b4', border: '1px solid rgba(255,105,180,0.35)' },
  segMale: { background: 'rgba(0,170,255,0.14)', color: '#00aaff', border: '1px solid rgba(0,170,255,0.35)' },
  slotRow: { display: 'flex', gap: 6, flexWrap: 'wrap', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' },
  slotChip: { padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#9b9bb0', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  slotActive: { background: 'rgba(0,245,212,0.12)', color: '#00f5d4', border: '1px solid rgba(0,245,212,0.3)' },
  empty: { textAlign: 'center', padding: 50, color: '#6b6b80', fontSize: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 12 },
  results: { display: 'grid', gap: 14 },
  slotGroup: { background: '#050509', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' },
  slotHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'rgba(0,245,212,0.06)', color: '#e8e8f0', fontWeight: 700, fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  slotHeadUnset: { background: 'rgba(255,140,66,0.08)', color: '#ff8c42' },
  slotCount: { background: 'rgba(0,245,212,0.15)', color: '#00f5d4', borderRadius: 20, padding: '2px 12px', fontSize: 13 },
  memberGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, padding: 16 },
  memberCard: { display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' },
  avatar: (g) => ({ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#08080e', flexShrink: 0, background: g === 'female' ? '#ff69b4' : '#00aaff' }),
  mName: { color: '#fff', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  mMeta: { display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, fontSize: 11, color: '#888' },
  code: { background: 'rgba(162,119,255,0.15)', color: '#a277ff', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 700 },
  typeBadge: (t) => ({ padding: '3px 9px', borderRadius: 8, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', background: t === 'weights' ? 'rgba(255,140,66,0.15)' : 'rgba(46,204,113,0.15)', color: t === 'weights' ? '#ff8c42' : '#2ecc71' }),
}
