import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ActivityIcon,
  DumbbellIcon,
  FileTextIcon,
  LineChartIcon,
  ScaleIcon,
  Trash2Icon,
} from 'lucide-react'
import { createMemberProgress, deleteMemberProgress, getMemberProgress } from '../api/memberProgress'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { showConfirm } from '../components/SweetAlert'

const initialForm = { weight_kg: '', muscle_size_cm: '', notes: '' }

function TrendChart({ entries, metric, color, locale, emptyLabel }) {
  const points = entries
    .map((entry, index) => ({ index, value: Number(entry[metric]), date: entry.recorded_at }))
    .filter((point) => Number.isFinite(point.value))

  if (points.length < 2) {
    return <div style={s.chartEmpty}>{emptyLabel}</div>
  }

  const width = 720
  const height = 240
  const pad = 34
  const min = Math.min(...points.map((point) => point.value))
  const max = Math.max(...points.map((point) => point.value))
  const range = max - min || 1
  const stepX = (width - pad * 2) / Math.max(1, points.length - 1)
  const mapped = points.map((point, i) => ({
    ...point,
    x: pad + i * stepX,
    y: height - pad - ((point.value - min) / range) * (height - pad * 2),
  }))
  const path = mapped.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const fillPath = `${path} L ${mapped[mapped.length - 1].x} ${height - pad} L ${mapped[0].x} ${height - pad} Z`

  return (
    <div style={s.chartWrap}>
      <svg viewBox={`0 0 ${width} ${height}`} style={s.chart} role="img">
        <defs>
          <linearGradient id={`fill-${metric}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((tick) => {
          const y = pad + tick * ((height - pad * 2) / 3)
          return <line key={tick} x1={pad} x2={width - pad} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" />
        })}
        <path d={fillPath} fill={`url(#fill-${metric})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {mapped.map((point) => (
          <g key={`${point.date}-${point.value}`}>
            <circle cx={point.x} cy={point.y} r="5" fill="#08080e" stroke={color} strokeWidth="3" />
            <text x={point.x} y={point.y - 12} textAnchor="middle" fill="#dedeeb" fontSize="12" fontWeight="700">{point.value}</text>
          </g>
        ))}
        <text x={pad} y={height - 8} fill="#6f7082" fontSize="11">
          {new Date(mapped[0].date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
        </text>
        <text x={width - pad} y={height - 8} textAnchor="end" fill="#6f7082" fontSize="11">
          {new Date(mapped[mapped.length - 1].date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
        </text>
      </svg>
    </div>
  )
}

export default function MemberProgressPage() {
  const { memberId } = useParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const [member, setMember] = useState(null)
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getMemberProgress(memberId)
      setMember(res.data.member)
      setEntries(res.data.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [memberId])

  const latest = entries[entries.length - 1]
  const first = entries[0]
  const weightChange = useMemo(() => {
    if (!first?.weight_kg || !latest?.weight_kg || first.id === latest.id) return null
    return Number(latest.weight_kg - first.weight_kg).toFixed(1)
  }, [first, latest])
  const muscleChange = useMemo(() => {
    if (!first?.muscle_size_cm || !latest?.muscle_size_cm || first.id === latest.id) return null
    return Number(latest.muscle_size_cm - first.muscle_size_cm).toFixed(1)
  }, [first, latest])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.weight_kg && !form.muscle_size_cm && !form.notes.trim()) {
      toast(t('progress.addOneValue'), 'info')
      return
    }
    setSaving(true)
    try {
      await createMemberProgress({
        member_id: Number(memberId),
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        muscle_size_cm: form.muscle_size_cm ? Number(form.muscle_size_cm) : null,
        notes: form.notes || null,
      })
      toast(t('progress.saved'), 'success')
      setForm(initialForm)
      await load()
    } catch {
      toast(t('progress.saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entryId) => {
    if (!(await showConfirm(t('progress.deleteConfirm'), '', t('common.delete'), t('common.cancel')))) return
    try {
      await deleteMemberProgress(entryId)
      toast(t('progress.deleted'), 'success')
      await load()
    } catch {
      toast(t('progress.saveError'), 'error')
    }
  }

  const formatDate = (value) => new Date(value).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div style={s.page}>
      <div style={s.top}>
        <Link to="/members" style={s.back}><ArrowLeftIcon size={17} />{t('progress.back')}</Link>
        <div style={s.memberBlock}>
          <div style={s.avatar}>{member?.name?.slice(0, 1)?.toUpperCase() || '?'}</div>
          <div>
            <h1 style={s.title}>{member?.name || t('progress.title')}</h1>
            <p style={s.subtitle}>{t('progress.subtitle')}</p>
          </div>
        </div>
      </div>

      <div style={s.summaryGrid}>
        <div style={s.summaryCard}>
          <ScaleIcon size={22} color="#00f5d4" />
          <span>{t('progress.currentWeight')}</span>
          <strong>{latest?.weight_kg ? `${latest.weight_kg} kg` : '-'}</strong>
          <small>{weightChange ? `${weightChange} kg` : t('progress.noTrend')}</small>
        </div>
        <div style={s.summaryCard}>
          <DumbbellIcon size={22} color="#ffd60a" />
          <span>{t('progress.currentMuscle')}</span>
          <strong>{latest?.muscle_size_cm ? `${latest.muscle_size_cm} cm` : '-'}</strong>
          <small>{muscleChange ? `${muscleChange} cm` : t('progress.noTrend')}</small>
        </div>
        <div style={s.summaryCard}>
          <ActivityIcon size={22} color="#00f593" />
          <span>{t('progress.totalRecords')}</span>
          <strong>{entries.length}</strong>
          <small>{latest ? formatDate(latest.recorded_at) : t('progress.noRecords')}</small>
        </div>
      </div>

      <div style={s.mainGrid}>
        <form onSubmit={handleSubmit} style={s.form}>
          <h2 style={s.panelTitle}>{t('progress.newRecord')}</h2>
          <label style={s.label}>{t('progress.weight')}</label>
          <input style={s.input} type="number" step="0.1" min="0" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
          <label style={s.label}>{t('progress.muscleSize')}</label>
          <input style={s.input} type="number" step="0.1" min="0" value={form.muscle_size_cm} onChange={(e) => setForm({ ...form, muscle_size_cm: e.target.value })} />
          <label style={s.label}>{t('progress.notes')}</label>
          <textarea style={s.textarea} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button style={s.saveBtn} disabled={saving}>{saving ? t('common.loading') : t('progress.saveRecord')}</button>
        </form>

        <div style={s.chartPanel}>
          <div style={s.chartHead}>
            <h2 style={s.panelTitle}><LineChartIcon size={19} />{t('progress.timelineTrend')}</h2>
          </div>
          <div style={s.chartCards}>
            <div style={s.chartCard}>
              <h3 style={s.chartTitle}>{t('progress.weightTrend')}</h3>
              <TrendChart entries={entries} metric="weight_kg" color="#00f5d4" locale={locale} emptyLabel={t('progress.needTwoRecords')} />
            </div>
            <div style={s.chartCard}>
              <h3 style={s.chartTitle}>{t('progress.muscleTrend')}</h3>
              <TrendChart entries={entries} metric="muscle_size_cm" color="#ffd60a" locale={locale} emptyLabel={t('progress.needTwoRecords')} />
            </div>
          </div>
        </div>
      </div>

      <section style={s.records}>
        <h2 style={s.panelTitle}><FileTextIcon size={19} />{t('progress.records')}</h2>
        {loading ? (
          <div style={s.empty}>{t('common.loading')}</div>
        ) : entries.length === 0 ? (
          <div style={s.empty}>{t('progress.empty')}</div>
        ) : (
          <div style={s.timeline}>
            {[...entries].reverse().map((entry) => (
              <div key={entry.id} style={s.timelineItem}>
                <div style={s.dot} />
                <div style={s.entryBody}>
                  <div style={s.entryTop}>
                    <strong>{formatDate(entry.recorded_at)}</strong>
                    <button style={s.deleteBtn} onClick={() => handleDelete(entry.id)}><Trash2Icon size={15} /></button>
                  </div>
                  <div style={s.entryMetrics}>
                    <span>{t('progress.weight')}: <b>{entry.weight_kg ? `${entry.weight_kg} kg` : '-'}</b></span>
                    <span>{t('progress.muscleSize')}: <b>{entry.muscle_size_cm ? `${entry.muscle_size_cm} cm` : '-'}</b></span>
                  </div>
                  {entry.notes && <p style={s.note}>{entry.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const s = {
  page: { display: 'grid', gap: 18 },
  top: { display: 'grid', gap: 16 },
  back: { width: 'fit-content', display: 'flex', alignItems: 'center', gap: 8, color: '#00f5d4', textDecoration: 'none', fontSize: 13, fontWeight: 700 },
  memberBlock: { display: 'flex', alignItems: 'center', gap: 14, padding: 20, borderRadius: 8, background: 'linear-gradient(135deg, rgba(0,245,212,0.10), rgba(255,214,10,0.055), rgba(14,14,24,0.82))', border: '1px solid rgba(255,255,255,0.06)' },
  avatar: { width: 54, height: 54, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(0,245,212,0.12)', color: '#00f5d4', fontSize: 22, fontWeight: 800, flexShrink: 0 },
  title: { margin: 0, color: '#f7f7ff', fontFamily: 'var(--font-heading)', fontSize: 30, fontWeight: 400, letterSpacing: 1 },
  subtitle: { margin: '6px 0 0', color: '#777789', fontSize: 13 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  summaryCard: { display: 'grid', gap: 8, padding: 18, borderRadius: 8, background: 'rgba(20,20,35,0.72)', border: '1px solid rgba(255,255,255,0.06)', color: '#7d7d90' },
  mainGrid: { display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 18, alignItems: 'start' },
  form: { display: 'grid', gap: 10, padding: 18, borderRadius: 8, background: 'rgba(20,20,35,0.72)', border: '1px solid rgba(255,255,255,0.06)' },
  panelTitle: { margin: 0, color: '#f2f2fb', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 },
  label: { marginTop: 6, color: '#747486', fontSize: 12, fontWeight: 700 },
  input: { height: 42, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,8,14,0.55)', color: '#fff', padding: '0 12px', outline: 0 },
  textarea: { minHeight: 112, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(8,8,14,0.55)', color: '#fff', padding: 12, outline: 0, resize: 'vertical' },
  saveBtn: { minHeight: 44, border: 0, borderRadius: 8, background: 'linear-gradient(135deg, #00f5d4, #ffd60a)', color: '#08080e', fontWeight: 800, cursor: 'pointer' },
  chartPanel: { display: 'grid', gap: 12 },
  chartHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  chartCards: { display: 'grid', gap: 12 },
  chartCard: { padding: 16, borderRadius: 8, background: 'rgba(20,20,35,0.72)', border: '1px solid rgba(255,255,255,0.06)' },
  chartTitle: { margin: '0 0 12px', color: '#dadae8', fontSize: 14 },
  chartWrap: { width: '100%', overflow: 'hidden' },
  chart: { width: '100%', minHeight: 220, display: 'block' },
  chartEmpty: { display: 'grid', placeItems: 'center', minHeight: 220, color: '#6f7082', border: '1px dashed rgba(255,255,255,0.10)', borderRadius: 8 },
  records: { display: 'grid', gap: 14, padding: 18, borderRadius: 8, background: 'rgba(20,20,35,0.72)', border: '1px solid rgba(255,255,255,0.06)' },
  timeline: { display: 'grid', gap: 12 },
  timelineItem: { display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: 12 },
  dot: { width: 10, height: 10, marginTop: 16, borderRadius: 5, background: '#00f5d4', boxShadow: '0 0 14px rgba(0,245,212,0.45)' },
  entryBody: { padding: 14, borderRadius: 8, background: 'rgba(8,8,14,0.42)', border: '1px solid rgba(255,255,255,0.055)' },
  entryTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#f1f1f8', gap: 12 },
  entryMetrics: { display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, color: '#818194', fontSize: 13 },
  note: { margin: '10px 0 0', color: '#c7c7d5', lineHeight: 1.6, fontSize: 13 },
  deleteBtn: { width: 32, height: 32, display: 'grid', placeItems: 'center', border: '1px solid rgba(255,51,85,0.18)', borderRadius: 7, background: 'rgba(255,51,85,0.08)', color: '#ff3355', cursor: 'pointer' },
  empty: { display: 'grid', placeItems: 'center', minHeight: 120, color: '#747486', border: '1px dashed rgba(255,255,255,0.10)', borderRadius: 8 },
}
