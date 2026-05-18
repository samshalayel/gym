import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMembers, createMember, updateMember, deleteMember, togglePortalAccess } from '../api/members'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { showConfirm } from '../components/SweetAlert'
import Swal from 'sweetalert2'
import { exportCSV, parseCSV } from '../utils/csv'

const PAGE_SIZE = 12

const statusMeta = {
  active: { color: '#00f593', bg: 'rgba(0,245,147,0.12)' },
  expired: { color: '#ff3355', bg: 'rgba(255,51,85,0.12)' },
  frozen: { color: '#00aaff', bg: 'rgba(0,170,255,0.12)' },
  canceled: { color: '#6b6b80', bg: 'rgba(107,107,128,0.12)' },
}

const initialForm = { name: '', phone: '', email: '', gender: '', age: '', address: '', emergency_contact: '', emergency_phone: '', status: 'active' }

export default function MembersPage() {
  const [members, setMembers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const { t } = useI18n()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)

  const totalPages = useMemo(() => Math.ceil(totalCount / PAGE_SIZE), [totalCount])

  const load = useCallback(async () => {
    setLoading(true)
    const skip = (page - 1) * PAGE_SIZE
    const res = await getMembers({ skip, limit: PAGE_SIZE, search: search || undefined })
    setMembers(res.data.items)
    setTotalCount(res.data.total_count)
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])

  const handleSearch = (val) => { setSearch(val); setPage(1) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form, age: form.age ? parseInt(form.age) : null }
    try {
      if (editId) { await updateMember(editId, data); toast(t('members.updated'), 'success') }
      else { await createMember(data); toast(t('members.created'), 'success') }
      setShowForm(false); setEditId(null); setForm(initialForm); load()
    } catch { toast('Error saving member', 'error') }
  }

  const openNew = () => { setForm(initialForm); setEditId(null); setShowForm(true) }

  const handleEdit = (m) => {
    setForm({
      name: m.name, phone: m.phone, email: m.email,
      gender: m.gender || '', age: m.age || '', address: m.address || '',
      emergency_contact: m.emergency_contact || '', emergency_phone: m.emergency_phone || '', status: m.status,
    })
    setEditId(m.id); setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (await showConfirm(t('members.deleteConfirm'), '', t('common.delete'), t('common.cancel'))) {
      try { await deleteMember(id); toast(t('members.deleted'), 'success'); load() }
      catch { toast('Error deleting member', 'error') }
    }
  }

  const handleExport = async () => {
    const res = await getMembers({ limit: 10000 })
    const all = res.data.items
    if (all.length === 0) { toast('No data to export', 'info'); return }
    exportCSV(all, 'members', [
      { label: 'ID', accessor: m => m.id },
      { label: 'Name', accessor: m => m.name },
      { label: 'Phone', accessor: m => m.phone },
      { label: 'Email', accessor: m => m.email },
      { label: 'Gender', accessor: m => m.gender },
      { label: 'Age', accessor: m => m.age },
      { label: 'Address', accessor: m => m.address },
      { label: 'Emergency Contact', accessor: m => m.emergency_contact },
      { label: 'Emergency Phone', accessor: m => m.emergency_phone },
      { label: 'Status', accessor: m => m.status },
    ])
    toast('Members exported', 'success')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.csv'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const text = await file.text(); const rows = parseCSV(text)
      if (rows.length === 0) { toast('Empty or invalid CSV', 'error'); return }
      const result = await Swal.fire({
        title: `Import ${rows.length} members?`,
        html: `<div style="font-size:13px;color:#6b6b80">First row: ${rows[0].Name || rows[0].name || '—'}</div>`,
        icon: 'question', showCancelButton: true, confirmButtonColor: '#00f5d4', cancelButtonColor: '#ff3355',
        confirmButtonText: 'Import', cancelButtonText: 'Cancel', background: '#0e0e18', color: '#e8e8f0', borderRadius: '14px',
      })
      if (!result.isConfirmed) return
      let success = 0, fail = 0
      for (const row of rows) {
        try {
          await createMember({
            name: row.Name || row.name || '', phone: row.Phone || row.phone || '',
            email: row.Email || row.email || '', gender: row.Gender || row.gender || '',
            age: row.Age || row.age ? parseInt(row.Age || row.age) : null,
            address: row.Address || row.address || '',
            emergency_contact: row['Emergency Contact'] || row.emergency_contact || '',
            emergency_phone: row['Emergency Phone'] || row.emergency_phone || '',
            status: row.Status || row.status || 'active',
          })
          success++
        } catch { fail++ }
      }
      Swal.fire({ icon: success > 0 ? 'success' : 'error', title: `${success} imported, ${fail} failed`, background: '#0e0e18', color: '#e8e8f0', borderRadius: '14px', confirmButtonColor: '#00f5d4' })
      load()
    }
    input.click()
  }

  const handlePortalToggle = async (m) => {
    try {
      const res = await togglePortalAccess(m.id)
      if (res.data.has_portal_access) {
        await Swal.fire({
          icon: 'success', title: 'Portal Access Granted',
          html: `<div style="text-align:left;font-size:14px"><p><strong>Username:</strong> ${res.data.username}</p><p><strong>Password:</strong> ${res.data.password}</p></div>`,
          confirmButtonColor: '#00f5d4', background: '#0e0e18', color: '#e8e8f0', borderRadius: '14px',
        })
      } else toast('Portal access revoked', 'info')
      load()
    } catch { toast('Error', 'error') }
  }

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div>
      <div style={s.banner}>
        <div style={s.bannerContent}>
          <h1 style={s.title}>{t('members.title')}</h1>
          <p style={s.meta}>{totalCount} total · page {page} of {Math.max(1, totalPages)}</p>
        </div>
        <div style={s.bannerActions}>
          <button style={s.btnOutline} onClick={handleImport}>📥 Import</button>
          <button style={s.btnOutline} onClick={handleExport}>📤 Export</button>
          <button style={s.btnPrimary} onClick={openNew}>+ {t('members.add')}</button>
        </div>
      </div>

      <div style={s.searchStrip}>
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>🔍</span>
          <input style={s.searchInput} placeholder={t('common.search')} value={search} onChange={(e) => handleSearch(e.target.value)} />
          {search && <button style={s.clearBtn} onClick={() => handleSearch('')}>✕</button>}
        </div>
        <div style={s.statChips}>
          <span style={s.chip}>{members.filter(m => m.status === 'active').length} active</span>
          <span style={s.chip}>{members.filter(m => m.status === 'expired').length} expired</span>
        </div>
      </div>

      <div style={s.formSlide(showForm)}>
        <form onSubmit={handleSubmit}>
          <div style={s.formHeader}>
            <h3 style={s.formTitle}>{editId ? 'Edit Member' : 'New Member'}</h3>
            <button type="button" style={s.formClose} onClick={() => setShowForm(false)}>✕</button>
          </div>
          <div style={s.formGrid}>
            <div style={s.field}>
              <label style={s.label}>Name *</label>
              <input style={s.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Phone *</label>
              <input style={s.input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Email *</label>
              <input style={s.input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Gender</label>
              <select style={s.input} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Age</label>
              <input style={s.input} type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Address</label>
              <input style={s.input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Emergency Contact</label>
              <input style={s.input} value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Emergency Phone</label>
              <input style={s.input} value={form.emergency_phone} onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Status</label>
              <select style={s.input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="frozen">Frozen</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>
          <button type="submit" style={s.btnSubmit}>
            {editId ? 'Update Member' : 'Create Member'}
          </button>
        </form>
      </div>

      {loading ? (
        <div style={s.loadingGrid}>
          {[1,2,3,4,5,6].map(i => <div key={i} style={s.skeleton} />)}
        </div>
      ) : members.length === 0 ? (
        <div style={s.empty}>
          <span style={s.emptyIcon}>🏋️</span>
          <p style={s.emptyText}>No members found</p>
        </div>
      ) : (
        <div style={s.grid}>
          {members.map((m, i) => {
            const status = statusMeta[m.status] || statusMeta.active
            return (
              <div key={m.id} style={{ ...s.card, animationDelay: `${i * 0.05}s` }}>
                <div style={{ ...s.statusLine, background: status.color, boxShadow: `0 0 8px ${status.color}60` }} />
                <div style={s.cardTop}>
                  <div style={{ ...s.avatar, background: `linear-gradient(135deg, ${status.color}30, ${status.color}10)` }}>
                    <span style={{ ...s.avatarText, color: status.color }}>{initials(m.name)}</span>
                  </div>
                  <div style={s.cardInfo}>
                    <span style={s.cardName}>{m.name}</span>
                    <span style={s.cardEmail}>{m.email}</span>
                  </div>
                  <div style={{ ...s.badge, background: status.bg, color: status.color }}>{m.status}</div>
                </div>
                <div style={s.cardBody}>
                  <div style={s.detailRow}>
                    <span style={s.detailLabel}>📞</span>
                    <span style={s.detailValue}>{m.phone}</span>
                  </div>
                  <div style={s.detailRow}>
                    <span style={s.detailLabel}>⚤</span>
                    <span style={s.detailValue}>{m.gender || '—'}</span>
                  </div>
                  <div style={s.detailRow}>
                    <span style={s.detailLabel}>🎂</span>
                    <span style={s.detailValue}>{m.age || '—'} y</span>
                  </div>
                </div>
                <div style={s.cardFooter}>
                  <button
                    style={s.portalBtn(m.has_portal_access)}
                    onClick={() => handlePortalToggle(m)}
                    title={m.has_portal_access ? 'Revoke portal access' : 'Grant portal access'}
                  >
                    {m.has_portal_access ? '🟢 Portal On' : '⚪ Portal Off'}
                  </button>
                  <div style={s.actionGroup}>
                    <button style={s.actionBtn('#ffd60a')} onClick={() => navigate(`/members/${m.id}/progress`)}>↗ {t('progress.track')}</button>
                    <button style={s.actionBtn('#00f5d4')} onClick={() => handleEdit(m)}>✎ Edit</button>
                    <button style={s.actionBtn('#ff3355')} onClick={() => handleDelete(m.id)}>✕ Del</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={s.pagination}>
          <button style={{ ...s.pageNav, opacity: page <= 1 ? 0.3 : 1 }} disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>◀ Prev</button>
          <div style={s.pageNums}>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pn
              if (totalPages <= 7) pn = i + 1
              else if (page <= 4) pn = i + 1
              else if (page >= totalPages - 3) pn = totalPages - 6 + i
              else pn = page - 3 + i
              return (
                <button key={pn} style={{ ...s.pageNum, background: page === pn ? '#00f5d4' : 'transparent', color: page === pn ? '#08080e' : '#6b6b80' }} onClick={() => setPage(pn)}>{pn}</button>
              )
            })}
          </div>
          <button style={{ ...s.pageNav, opacity: page >= totalPages ? 0.3 : 1 }} disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next ▶</button>
        </div>
      )}
    </div>
  )
}

const s = {
  banner: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    marginBottom: 20, flexWrap: 'wrap', gap: 12,
  },
  bannerContent: {},
  title: { fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 400, color: '#fff', letterSpacing: '1.5px', margin: 0, lineHeight: 1 },
  meta: { fontSize: 12, color: '#5a5a6a', marginTop: 6 },
  bannerActions: { display: 'flex', gap: 8, alignItems: 'center' },
  btnPrimary: {
    padding: '10px 24px', background: '#00f5d4', color: '#08080e',
    border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
    transition: 'all 0.2s',
  },
  btnOutline: {
    padding: '10px 20px', background: 'transparent', color: '#6b6b80',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer',
    fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
  },
  searchStrip: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20, gap: 16, flexWrap: 'wrap',
  },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 240,
    background: 'rgba(14,14,24,0.7)', border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: 12, padding: '4px 16px',
  },
  searchIcon: { fontSize: 15, color: '#5a5a6a' },
  searchInput: { flex: 1, padding: '13px 0', background: 'none', border: 'none', fontSize: 14, color: '#e8e8f0', outline: 'none' },
  clearBtn: {
    background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
    width: 24, height: 24, cursor: 'pointer', color: '#6b6b80', fontSize: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  statChips: { display: 'flex', gap: 6 },
  chip: {
    padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: 'rgba(255,255,255,0.03)', color: '#6b6b80',
  },
  formSlide: (open) => ({
    overflow: 'hidden',
    maxHeight: open ? 800 : 0,
    transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s',
    opacity: open ? 1 : 0,
    marginBottom: open ? 20 : 0,
  }),
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  formTitle: { fontFamily: 'var(--font-heading)', fontSize: 20, color: '#fff', letterSpacing: '1px', margin: 0 },
  formClose: {
    background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: 8,
    width: 32, height: 32, cursor: 'pointer', color: '#6b6b80', fontSize: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  formGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 16, marginBottom: 20,
    background: 'rgba(14,14,24,0.7)', border: '1px solid rgba(255,255,255,0.04)',
    padding: 24, borderRadius: 14,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, color: '#6b6b80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' },
  input: {
    padding: '12px 14px', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
    fontSize: 13, color: '#e8e8f0', width: '100%', boxSizing: 'border-box', outline: 'none',
  },
  btnSubmit: {
    padding: '14px 28px', background: '#00f5d4', color: '#08080e',
    border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700,
    width: '100%',
  },
  loadingGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14,
  },
  skeleton: {
    height: 220, borderRadius: 14,
    background: 'linear-gradient(90deg, rgba(14,14,24,0.7) 25%, rgba(20,20,34,0.7) 50%, rgba(14,14,24,0.7) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s ease infinite',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 80, gap: 12,
  },
  emptyIcon: { fontSize: 48, opacity: 0.3 },
  emptyText: { fontSize: 14, color: '#5a5a6a' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 },
  card: {
    position: 'relative', borderRadius: 14, overflow: 'hidden',
    background: 'rgba(14,14,24,0.7)', border: '1px solid rgba(255,255,255,0.04)',
    animation: 'fadeUp 0.4s ease both',
    transition: 'transform 0.25s, border-color 0.25s',
  },
  statusLine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
  },
  cardTop: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '20px 20px 0',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: '1px' },
  cardInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  cardName: { fontSize: 15, fontWeight: 600, color: '#e8e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardEmail: { fontSize: 12, color: '#5a5a6a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  badge: (status) => ({
    padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: status === 'active' ? 'rgba(0,245,147,0.12)' : status === 'expired' ? 'rgba(255,51,85,0.12)' : 'rgba(255,214,10,0.12)',
    color: status === 'active' ? '#00f593' : status === 'expired' ? '#ff3355' : '#ffd60a',
  }),
  cardBody: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 },
  detailRow: { display: 'flex', alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 14, width: 20, textAlign: 'center' },
  detailValue: { fontSize: 13, color: '#8a8a9a' },
  cardFooter: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.04)',
  },
  portalBtn: (on) => ({
    padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    border: 'none', cursor: 'pointer',
    background: on ? 'rgba(0,245,147,0.12)' : 'rgba(255,255,255,0.03)',
    color: on ? '#00f593' : '#6b6b80',
  }),
  actionGroup: { display: 'flex', gap: 4 },
  actionBtn: (c) => ({
    padding: '6px 12px', background: 'transparent', color: c,
    border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, cursor: 'pointer',
    fontSize: 11, fontWeight: 600,
  }),
  pagination: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24,
  },
  pageNav: {
    padding: '8px 16px', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
    color: '#8a8a9a', cursor: 'pointer', fontSize: 12, fontWeight: 500,
  },
  pageNums: { display: 'flex', gap: 2 },
  pageNum: {
    width: 34, height: 34, border: 'none', borderRadius: 8,
    cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
  },
}
