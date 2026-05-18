import React, { useState, useEffect, useMemo } from 'react'
import { getStaff, createStaff, updateStaff, deleteStaff } from '../api/staff'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { showConfirm } from '../components/SweetAlert'

const roleIcons = { trainer: '🏋️', admin: '👨‍💼', receptionist: '📞', manager: '👔' }
const roleColors = { trainer: '#667eea', admin: '#e74c3c', receptionist: '#2ecc71', manager: '#f39c12' }

export default function StaffPage() {
  const [staff, setStaff] = useState([]); const [showForm, setShowForm] = useState(false); const [editId, setEditId] = useState(null); const [search, setSearch] = useState('')
  const { t, locale } = useI18n(); const { toast } = useToast()
  const [form, setForm] = useState({ name: '', phone: '', email: '', role: 'trainer', specialization: '', is_active: 'true' })

  useEffect(() => { load() }, [])
  const load = async () => { const res = await getStaff(); setStaff(res.data.items) }

  const filtered = useMemo(() => {
    if (!search.trim()) return staff
    const q = search.toLowerCase().trim()
    return staff.filter(s => {
      const txt = [s.name, s.phone, s.email, s.role, s.specialization, s.is_active === 'true' ? 'active' : 'inactive'].filter(Boolean).join(' ').toLowerCase()
      return txt.includes(q)
    })
  }, [staff, search])

  const stats = useMemo(() => ({
    total: staff.length,
    trainers: staff.filter(s => s.role === 'trainer').length,
    active: staff.filter(s => s.is_active === 'true').length,
    inactive: staff.filter(s => s.is_active !== 'true').length,
  }), [staff])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editId) { await updateStaff(editId, form); toast(t('staff.updated'), 'success') }
      else { await createStaff(form); toast(t('staff.created'), 'success') }
      setShowForm(false); setEditId(null); setForm({ name: '', phone: '', email: '', role: 'trainer', specialization: '', is_active: 'true' }); load()
    } catch { toast('Error', 'error') }
  }

  const handleEdit = (s) => { setForm({ name: s.name, phone: s.phone || '', email: s.email || '', role: s.role, specialization: s.specialization || '', is_active: s.is_active }); setEditId(s.id); setShowForm(true) }
  const handleDelete = async (id) => { if (await showConfirm(t('staff.deleteConfirm'), '', t('common.delete'), t('common.cancel'))) { try { await deleteStaff(id); toast(t('staff.deleted'), 'success'); load() } catch { toast('Error', 'error') } } }

  return (
    <div>
      <div style={s.header}>
        <h1 style={s.title}>{t('staff.title')}</h1>
        <button style={s.btnPrimary} onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', phone: '', email: '', role: 'trainer', specialization: '', is_active: 'true' }) }}>
          {showForm ? `✕ ${t('common.cancel')}` : `+ ${t('staff.add')}`}
        </button>
      </div>

      <div style={s.statsRow}>
        {[
          { label: t('common.total'), value: stats.total, color: '#667eea' },
          { label: t('staff.trainer'), value: stats.trainers, color: '#667eea' },
          { label: t('common.active'), value: stats.active, color: '#2ecc71' },
          { label: t('common.inactive'), value: stats.inactive, color: '#e74c3c' },
        ].map(st => (
          <div key={st.label} style={{ ...s.statCard, borderLeft: `4px solid ${st.color}` }}>
            <span style={s.statNum}>{st.value}</span>
            <span style={s.statLabel}>{st.label}</span>
          </div>
        ))}
      </div>

      <div style={s.searchWrap}>
        <span style={s.searchIcon}>🔍</span>
        <input style={s.searchInput} placeholder={locale === 'ar' ? 'ابحث عن اسم، دور، تخصص...' : 'Search name, role, specialization...'} value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && <button style={s.clearBtn} onClick={() => setSearch('')}>✕</button>}
        <span style={s.searchHint}>{filtered.length} / {stats.total}</span>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.formGrid}>
            <input style={s.input} placeholder={`${t('staff.name')}*`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input style={s.input} placeholder={t('staff.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input style={s.input} placeholder={t('staff.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <select style={s.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="trainer">{t('staff.trainer')}</option><option value="admin">{t('staff.admin')}</option><option value="receptionist">{t('staff.receptionist')}</option><option value="manager">{t('staff.manager')}</option>
            </select>
            <input style={s.input} placeholder={t('staff.specialization')} value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
            <select style={s.input} value={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.value })}>
              <option value="true">{t('common.active')}</option><option value="false">{t('common.inactive')}</option>
            </select>
          </div>
          <button type="submit" style={s.btnSuccess}>{editId ? t('common.update') : t('common.create')}</button>
        </form>
      )}

      <div style={s.grid}>
        {filtered.map(person => (
          <div key={person.id} style={s.card}>
            <div style={s.cardTop}>
              <div style={s.avatarWrap}>
                <div style={{ ...s.avatar, background: roleColors[person.role] || '#667eea' }}>
                  {person.name?.charAt(0) || '?'}
                </div>
                <div style={s.statusDot(person.is_active === 'true')} />
              </div>
              <div style={s.cardInfo}>
                <div style={s.name}>{person.name}</div>
                <div style={s.roleBadge(person.role)}>
                  {roleIcons[person.role] || '👤'} {t(`staff.${person.role}`)}
                </div>
              </div>
              <div style={s.btnGroup}>
                <button style={s.btnEdit} onClick={() => handleEdit(person)}>{t('common.edit')}</button>
                <button style={s.btnDel} onClick={() => handleDelete(person.id)}>{t('common.delete')}</button>
              </div>
            </div>
            <div style={s.divider} />
            <div style={s.details}>
              <div style={s.detailItem}>
                <span style={s.detailIcon}>📞</span>
                <span>{person.phone || '-'}</span>
              </div>
              <div style={s.detailItem}>
                <span style={s.detailIcon}>✉️</span>
                <span>{person.email || '-'}</span>
              </div>
              <div style={s.detailItem}>
                <span style={s.detailIcon}>🎯</span>
                <span>{person.specialization || '-'}</span>
              </div>
            </div>
            <div style={s.divider} />
            <div style={s.cardFooter}>
              <span style={s.footerLabel}>{t('common.status')}</span>
              <span style={{
                ...s.statusBadge,
                background: person.is_active === 'true' ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.15)',
                color: person.is_active === 'true' ? '#2ecc71' : '#e74c3c',
              }}>
                {person.is_active === 'true' ? '●' : '○'} {person.is_active === 'true' ? t('common.active') : t('common.inactive')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={s.empty}>
          <span style={{ fontSize: 48 }}>{search ? '🔍' : '👨‍🏫'}</span>
          <p style={{ color: '#888', marginTop: 12, fontSize: 14 }}>{search ? 'No results' : t('staff.add')}</p>
        </div>
      )}
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 },
  btnPrimary: { padding: '12px 24px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  btnSuccess: { padding: '12px 24px', background: 'linear-gradient(135deg, #2ecc71, #27ae60)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 },
  statCard: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4 },
  statNum: { fontSize: 26, fontWeight: 800, color: '#fff' },
  statLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '4px 16px', marginBottom: 20 },
  searchIcon: { fontSize: 18, color: '#666' },
  searchInput: { flex: 1, padding: '14px 0', background: 'none', border: 'none', fontSize: 15, color: '#fff', outline: 'none' },
  clearBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#888', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  searchHint: { fontSize: 12, color: '#555', fontWeight: 500, whiteSpace: 'nowrap' },
  form: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', padding: 24, borderRadius: 16, marginBottom: 24 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 },
  input: { padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#fff', width: '100%', boxSizing: 'border-box', outline: 'none' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 },
  card: {
    background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 20, transition: 'transform 0.2s',
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: 14 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 52, height: 52, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', color: '#fff',
    fontSize: 22, fontWeight: 700,
  },
  statusDot: (active) => ({
    position: 'absolute', bottom: 0, right: 0, width: 14, height: 14,
    borderRadius: '50%', border: '2px solid #1a1a2e',
    background: active ? '#2ecc71' : '#e74c3c',
  }),
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: 700, color: '#fff' },
  roleBadge: (role) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 20,
    background: `${roleColors[role] || '#667eea'}20`,
    color: roleColors[role] || '#667eea',
    fontSize: 11, fontWeight: 600, marginTop: 4,
  }),
  btnGroup: { display: 'flex', gap: 6 },
  btnEdit: { padding: '6px 14px', background: 'rgba(102,126,234,0.15)', color: '#667eea', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  btnDel: { padding: '6px 14px', background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  divider: { height: 1, background: 'rgba(255,255,255,0.06)', margin: '14px 0' },
  details: { display: 'flex', flexDirection: 'column', gap: 10 },
  detailItem: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#bbb' },
  detailIcon: { fontSize: 14, width: 20, textAlign: 'center' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statusBadge: { padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 },
}
