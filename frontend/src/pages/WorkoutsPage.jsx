import React, { useState, useEffect, useMemo } from 'react'
import {
  getWorkoutTypes, createWorkoutType, updateWorkoutType, deleteWorkoutType,
  getExercises, createExercise, updateExercise, deleteExercise,
  getWorkoutPlans, createWorkoutPlan, deleteWorkoutPlan
} from '../api/workouts'
import { getMembers } from '../api/members'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { showConfirm } from '../components/SweetAlert'

export default function WorkoutsPage() {
  const [tab, setTab] = useState('types')
  const [types, setTypes] = useState([])
  const [exercises, setExercises] = useState([])
  const [plans, setPlans] = useState([])
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState({ types: '', exercises: '', plans: '' })
  const { t } = useI18n()
  const { toast } = useToast()

  const memberMap = useMemo(() => {
    const map = {}
    members.forEach(m => { map[m.id] = m.name })
    return map
  }, [members])

  useEffect(() => { loadAll(); getMembers().then(r => setMembers(r.data.items)) }, [])

  const loadAll = async () => {
    const [t, e, p] = await Promise.all([getWorkoutTypes(), getExercises(), getWorkoutPlans()])
    setTypes(t.data.items)
    setExercises(e.data.items)
    setPlans(p.data.items)
  }

  const [form, setForm] = useState({ name: '', category: '', description: '' })
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)

  const handleSubmitType = async (e) => {
    e.preventDefault()
    try {
      if (editId) { await updateWorkoutType(editId, form) } else { await createWorkoutType(form) }
      setShowForm(false); setEditId(null); setForm({ name: '', category: '', description: '' }); loadAll()
    } catch { toast('Error', 'error') }
  }

  const [exForm, setExForm] = useState({ name: '', description: '', target_muscles: '', difficulty: 'beginner', category: '' })
  const [showExForm, setShowExForm] = useState(false)
  const [editExId, setEditExId] = useState(null)

  const handleSubmitEx = async (e) => {
    e.preventDefault()
    try {
      if (editExId) { await updateExercise(editExId, exForm) } else { await createExercise(exForm) }
      setShowExForm(false); setEditExId(null); setExForm({ name: '', description: '', target_muscles: '', difficulty: 'beginner', category: '' }); loadAll()
    } catch { toast('Error', 'error') }
  }

  const [planForm, setPlanForm] = useState({ member_id: '', name: '', exercises: '', days_per_week: 3, notes: '' })
  const [showPlanForm, setShowPlanForm] = useState(false)

  const handleSubmitPlan = async (e) => {
    e.preventDefault()
    try {
      await createWorkoutPlan({ ...planForm, member_id: parseInt(planForm.member_id), days_per_week: parseInt(planForm.days_per_week) })
      setShowPlanForm(false); setPlanForm({ member_id: '', name: '', exercises: '', days_per_week: 3, notes: '' }); loadAll()
      toast('Plan created', 'success')
    } catch { toast('Error', 'error') }
  }

  const arabicSearchMap = {
    مبتدئ: 'beginner', متوسط: 'intermediate', متقدم: 'advanced',
    بداية: 'beginner', وسط: 'intermediate', متقد: 'advanced',
  }

  const normalize = (v) => (v || '').toLowerCase().trim()
  const kw = (tabKey) => {
    const q = normalize(search[tabKey])
    if (!q) return ''
    for (const [ar, en] of Object.entries(arabicSearchMap)) {
      if (q.includes(ar)) return en
    }
    return q
  }

  const filteredTypes = useMemo(() => {
    const q = kw('types')
    if (!q) return types
    return types.filter(t =>
      normalize(t.name).includes(q) ||
      normalize(t.category).includes(q) ||
      normalize(t.description).includes(q)
    )
  }, [types, search.types])

  const filteredExercises = useMemo(() => {
    const q = kw('exercises')
    if (!q) return exercises
    return exercises.filter(e =>
      normalize(e.name).includes(q) ||
      normalize(e.target_muscles).includes(q) ||
      normalize(e.category).includes(q) ||
      normalize(e.difficulty).includes(q)
    )
  }, [exercises, search.exercises])

  const filteredPlans = useMemo(() => {
    const q = kw('plans')
    if (!q) return plans
    return plans.filter(p =>
      normalize(p.name).includes(q) ||
      normalize(p.exercises).includes(q) ||
      normalize(memberMap[p.member_id] || '').includes(q)
    )
  }, [plans, search.plans, memberMap])

  const typeStats = [
    { label: t('common.total'), value: types.length, color: '#667eea' },
    { label: 'Categories', value: new Set(types.map(t => t.category).filter(Boolean)).size, color: '#2ecc71' },
  ]

  const exStats = [
    { label: t('common.total'), value: exercises.length, color: '#667eea' },
    { label: t('workouts.beginner'), value: exercises.filter(e => e.difficulty === 'beginner').length, color: '#2ecc71' },
    { label: t('workouts.intermediate'), value: exercises.filter(e => e.difficulty === 'intermediate').length, color: '#f39c12' },
    { label: t('workouts.advanced'), value: exercises.filter(e => e.difficulty === 'advanced').length, color: '#e74c3c' },
  ]

  const planStats = [
    { label: t('common.total'), value: plans.length, color: '#667eea' },
  ]

  const diffBadge = (d) => ({
    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'inline-block',
    background: d === 'beginner' ? 'rgba(46,204,113,0.15)' : d === 'intermediate' ? 'rgba(243,156,18,0.15)' : 'rgba(231,76,60,0.15)',
    color: d === 'beginner' ? '#2ecc71' : d === 'intermediate' ? '#f39c12' : '#e74c3c',
  })

  const catBadge = (cat) => ({
    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'inline-block',
    background: 'rgba(102,126,234,0.15)', color: '#667eea',
  })

  const dayBadge = (d) => ({
    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'inline-block',
    background: 'rgba(52,152,219,0.15)', color: '#3498db',
  })

  const initials = (name) => (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const tabs = [
    { key: 'types', label: t('workouts.types') },
    { key: 'exercises', label: t('workouts.exercises') },
    { key: 'plans', label: t('workouts.plans') },
  ]

  const renderStats = (stats) => (
    <div style={s.statsRow}>
      {stats.map((st, i) => (
        <div key={i} style={s.statCard}>
          <div style={{ ...s.statValue, color: st.color }}>{st.value}</div>
          <div style={s.statLabel}>{st.label}</div>
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <h1 style={s.title}>{t('workouts.title')}</h1>
      <div style={s.tabs}>
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
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'types' && (
        <div>
          {renderStats(typeStats)}
          <div style={s.header}>
            <div style={s.searchWrap}>
              <span style={s.searchIcon}>🔍</span>
              <input style={s.searchInput} placeholder={`${t('common.search')} ${t('workouts.types')}...`} value={search.types} onChange={(e) => setSearch({ ...search, types: e.target.value })} />
            </div>
            <button style={s.btnPrimary} onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', category: '', description: '' }) }}>
              {showForm ? `✕ ${t('common.cancel')}` : `+ ${t('workouts.addType')}`}
            </button>
          </div>
          {showForm && (
            <form onSubmit={handleSubmitType} style={s.form}>
              <div style={s.formGrid}>
                <input style={s.input} placeholder={t('workouts.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input style={s.input} placeholder={t('workouts.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <input style={s.input} placeholder={t('workouts.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <button type="submit" style={s.btnSuccess}>{editId ? t('common.update') : t('common.create')}</button>
            </form>
          )}
          <div style={s.grid}>
            {filteredTypes.map(item => (
              <div key={item.id} style={s.card}>
                <div style={s.cardTop}>
                  <div style={s.avatar}>{initials(item.name)}</div>
                  <div style={s.cardTitleWrap}>
                    <div style={s.cardTitle}>{item.name}</div>
                    {item.category && <span style={catBadge(item.category)}>{item.category}</span>}
                  </div>
                </div>
                {item.description && <div style={s.cardDesc}>{item.description}</div>}
                <div style={s.divider} />
                <div style={s.cardActions}>
                  <button style={s.btnDel} onClick={async () => { if (await showConfirm('Delete this type?', '', t('common.delete'), t('common.cancel'))) { await deleteWorkoutType(item.id); loadAll() } }}>{t('common.delete')}</button>
                </div>
              </div>
            ))}
            {filteredTypes.length === 0 && <div style={s.empty}>{t('common.loading')}</div>}
          </div>
        </div>
      )}

      {tab === 'exercises' && (
        <div>
          {renderStats(exStats)}
          <div style={s.header}>
            <div style={s.searchWrap}>
              <span style={s.searchIcon}>🔍</span>
              <input style={s.searchInput} placeholder={`${t('common.search')} ${t('workouts.exercises')}...`} value={search.exercises} onChange={(e) => setSearch({ ...search, exercises: e.target.value })} />
            </div>
            <button style={s.btnPrimary} onClick={() => { setShowExForm(!showExForm); setEditExId(null); setExForm({ name: '', description: '', target_muscles: '', difficulty: 'beginner', category: '' }) }}>
              {showExForm ? `✕ ${t('common.cancel')}` : `+ ${t('workouts.addExercise')}`}
            </button>
          </div>
          {showExForm && (
            <form onSubmit={handleSubmitEx} style={s.form}>
              <div style={s.formGrid}>
                <input style={s.input} placeholder={t('workouts.name')} value={exForm.name} onChange={(e) => setExForm({ ...exForm, name: e.target.value })} required />
                <input style={s.input} placeholder={t('workouts.targetMuscles')} value={exForm.target_muscles} onChange={(e) => setExForm({ ...exForm, target_muscles: e.target.value })} />
                <select style={s.input} value={exForm.difficulty} onChange={(e) => setExForm({ ...exForm, difficulty: e.target.value })}>
                  <option value="beginner">{t('workouts.beginner')}</option>
                  <option value="intermediate">{t('workouts.intermediate')}</option>
                  <option value="advanced">{t('workouts.advanced')}</option>
                </select>
                <input style={s.input} placeholder={t('workouts.category')} value={exForm.category} onChange={(e) => setExForm({ ...exForm, category: e.target.value })} />
                <input style={s.input} placeholder={t('workouts.description')} value={exForm.description} onChange={(e) => setExForm({ ...exForm, description: e.target.value })} />
              </div>
              <button type="submit" style={s.btnSuccess}>{editExId ? t('common.update') : t('common.create')}</button>
            </form>
          )}
          <div style={s.grid}>
            {filteredExercises.map(item => (
              <div key={item.id} style={s.card}>
                <div style={s.cardTop}>
                  <div style={{ ...s.avatar, background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}>💪</div>
                  <div style={s.cardTitleWrap}>
                    <div style={s.cardTitle}>{item.name}</div>
                    {item.category && <span style={catBadge(item.category)}>{item.category}</span>}
                  </div>
                </div>
                <div style={s.detailGrid}>
                  <div style={s.detailItem}>
                    <span style={s.detailLabel}>{t('workouts.targetMuscles')}</span>
                    <span style={s.detailValue}>{item.target_muscles}</span>
                  </div>
                  <div style={s.detailItem}>
                    <span style={s.detailLabel}>{t('workouts.difficulty')}</span>
                    <span style={diffBadge(item.difficulty)}>{t(`workouts.${item.difficulty}`)}</span>
                  </div>
                </div>
                {item.description && <div style={s.cardDesc}>{item.description}</div>}
                <div style={s.divider} />
                <div style={s.cardActions}>
                  <button style={s.btnEdit} onClick={() => {
                    setExForm({ name: item.name, description: item.description || '', target_muscles: item.target_muscles || '', difficulty: item.difficulty, category: item.category || '' })
                    setEditExId(item.id)
                    setShowExForm(true)
                  }}>{t('common.edit')}</button>
                  <button style={s.btnDel} onClick={async () => { if (await showConfirm('Delete this exercise?', '', t('common.delete'), t('common.cancel'))) { await deleteExercise(item.id); loadAll() } }}>{t('common.delete')}</button>
                </div>
              </div>
            ))}
            {filteredExercises.length === 0 && <div style={s.empty}>{t('common.loading')}</div>}
          </div>
        </div>
      )}

      {tab === 'plans' && (
        <div>
          {renderStats(planStats)}
          <div style={s.header}>
            <div style={s.searchWrap}>
              <span style={s.searchIcon}>🔍</span>
              <input style={s.searchInput} placeholder={`${t('common.search')} ${t('workouts.plans')}...`} value={search.plans} onChange={(e) => setSearch({ ...search, plans: e.target.value })} />
            </div>
            <button style={s.btnPrimary} onClick={() => setShowPlanForm(!showPlanForm)}>
              {showPlanForm ? `✕ ${t('common.cancel')}` : `+ ${t('workouts.addPlan')}`}
            </button>
          </div>
          {showPlanForm && (
            <form onSubmit={handleSubmitPlan} style={s.form}>
              <div style={s.formGrid}>
                <select style={s.input} value={planForm.member_id} onChange={(e) => setPlanForm({ ...planForm, member_id: e.target.value })} required>
                  <option value="">{t('workouts.member')}</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input style={s.input} placeholder={t('workouts.planName')} value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required />
                <input style={s.input} placeholder={t('workouts.exercisesList')} value={planForm.exercises} onChange={(e) => setPlanForm({ ...planForm, exercises: e.target.value })} />
                <input style={s.input} placeholder={t('workouts.daysPerWeek')} type="number" value={planForm.days_per_week} onChange={(e) => setPlanForm({ ...planForm, days_per_week: e.target.value })} />
                <input style={s.input} placeholder={t('common.notes')} value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} />
              </div>
              <button type="submit" style={s.btnSuccess}>{t('common.create')}</button>
            </form>
          )}
          <div style={s.grid}>
            {filteredPlans.map(item => (
              <div key={item.id} style={s.card}>
                <div style={s.cardTop}>
                  <div style={{ ...s.avatar, background: 'linear-gradient(135deg, #3498db, #2980b9)' }}>📋</div>
                  <div style={s.cardTitleWrap}>
                    <div style={s.cardTitle}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{memberMap[item.member_id] || `#${item.member_id}`}</div>
                  </div>
                </div>
                <div style={s.detailGrid}>
                  <div style={s.detailItem}>
                    <span style={s.detailLabel}>{t('workouts.daysPerWeek')}</span>
                    <span style={dayBadge(item.days_per_week)}>{item.days_per_week} {t('workouts.daysPerWeek')}</span>
                  </div>
                </div>
                {item.exercises && <div style={s.cardDesc}>🏋️ {item.exercises}</div>}
                {item.notes && <div style={{ ...s.cardDesc, color: '#888', fontSize: 12 }}>📝 {item.notes}</div>}
                <div style={s.divider} />
                <div style={s.cardActions}>
                  <button style={s.btnDel} onClick={async () => { if (await showConfirm('Delete this plan?', '', t('common.delete'), t('common.cancel'))) { await deleteWorkoutPlan(item.id); loadAll() } }}>{t('common.delete')}</button>
                </div>
              </div>
            ))}
            {filteredPlans.length === 0 && <div style={s.empty}>{t('common.loading')}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  title: { fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 20 },
  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: { padding: '10px 24px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 },
  searchWrap: { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0 12px', flex: 1, maxWidth: 360 },
  searchIcon: { fontSize: 14, marginRight: 8, opacity: 0.5 },
  searchInput: { padding: '10px 0', background: 'transparent', border: 'none', fontSize: 13, color: '#fff', outline: 'none', width: '100%' },
  btnPrimary: { padding: '10px 20px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' },
  btnSuccess: { padding: '10px 20px', background: 'linear-gradient(135deg, #2ecc71, #27ae60)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnEdit: { padding: '6px 14px', background: 'rgba(102,126,234,0.15)', color: '#667eea', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  btnDel: { padding: '6px 14px', background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  form: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', padding: 20, borderRadius: 16, marginBottom: 20 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 },
  input: { padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#fff', width: '100%', boxSizing: 'border-box', outline: 'none' },
  statsRow: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  statCard: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 24px', textAlign: 'center', flex: '1 1 100px', minWidth: 80 },
  statValue: { fontSize: 28, fontWeight: 700 },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  card: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 },
  cardTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#aaa', marginBottom: 8, lineHeight: 1.5 },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 },
  detailItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  detailLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' },
  detailValue: { fontSize: 13, color: '#ccc' },
  divider: { height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' },
  cardActions: { display: 'flex', gap: 8 },
  empty: { textAlign: 'center', padding: 40, color: '#666', fontSize: 14, gridColumn: '1 / -1' },
}
