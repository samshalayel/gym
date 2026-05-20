import React, { useState, useEffect } from 'react'
import { getPlans, createPlan, updatePlan, deletePlan } from '../api/plans'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { showConfirm } from '../components/SweetAlert'
import { formatCurrency } from '../utils/currency'

export default function PlansPage() {
  const [plans, setPlans] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const { t } = useI18n()
  const { toast } = useToast()
  const [form, setForm] = useState({ name: '', duration_months: 1, price: '', session_count: '', description: '' })

  useEffect(() => { load() }, [])

  const load = async () => { const res = await getPlans(); setPlans(res.data.items) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form, duration_months: parseInt(form.duration_months), price: parseFloat(form.price), session_count: form.session_count ? parseInt(form.session_count) : null }
    try {
      if (editId) { await updatePlan(editId, data); toast(t('plans.updated'), 'success') }
      else { await createPlan(data); toast(t('plans.created'), 'success') }
      setShowForm(false); setEditId(null); setForm({ name: '', duration_months: 1, price: '', session_count: '', description: '' }); load()
    } catch { toast('Error saving plan', 'error') }
  }

  const handleEdit = (p) => { setForm({ name: p.name, duration_months: p.duration_months, price: p.price, session_count: p.session_count || '', description: p.description || '' }); setEditId(p.id); setShowForm(true) }
  const handleDelete = async (id) => { if (await showConfirm(t('plans.deleteConfirm'), '', t('common.delete'), t('common.cancel'))) { try { await deletePlan(id); toast(t('plans.deleted'), 'success'); load() } catch { toast('Error deleting plan', 'error') } } }

  return (
    <div>
      <div style={s.header}><h1 style={s.title}>{t('plans.title')}</h1><button style={s.btnPrimary} onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', duration_months: 1, price: '', session_count: '', description: '' }) }}>{showForm ? `✕ ${t('common.cancel')}` : `+ ${t('plans.add')}`}</button></div>
      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.formGrid}>
            <input style={s.input} placeholder={`${t('plans.name')}*`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <select style={s.input} value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: e.target.value })}>
              <option value={1}>{t('plans.monthly')}</option><option value={3}>{t('plans.quarterly')}</option><option value={12}>{t('plans.yearly')}</option>
            </select>
            <input style={s.input} placeholder={`${t('plans.price')}*`} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" step="0.01" required />
            <input style={s.input} placeholder={t('plans.sessionCount')} value={form.session_count} onChange={(e) => setForm({ ...form, session_count: e.target.value })} type="number" min="1" />
            <input style={s.input} placeholder={t('plans.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button type="submit" style={s.btnSuccess}>{editId ? t('common.update') : t('common.create')}</button>
        </form>
      )}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead><tr><th style={s.cell}>{t('plans.name')}</th><th style={s.cell}>{t('plans.duration')}</th><th style={s.cell}>{t('plans.price')}</th><th style={s.cell}>{t('plans.sessionCount')}</th><th style={s.cell}>{t('plans.description')}</th><th style={s.cell}>{t('common.actions')}</th></tr></thead>
          <tbody>{plans.map(p => (
            <tr key={p.id}>
              <td style={s.cell}>{p.name}</td><td style={s.cell}>{p.duration_months} {p.duration_months > 1 ? t('plans.months') : t('plans.month')}</td><td style={{ ...s.cell, color: '#2ecc71', fontWeight: 600 }}>{formatCurrency(p.price)}</td><td style={s.cell}>{p.session_count || t('plans.unlimited')}</td><td style={{ ...s.cell, color: '#888' }}>{p.description}</td>
              <td style={s.cell}><div style={s.btnGroup}><button style={s.btnEdit} onClick={() => handleEdit(p)}>{t('common.edit')}</button><button style={s.btnDel} onClick={() => handleDelete(p.id)}>{t('common.delete')}</button></div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 400, color: '#fff', letterSpacing: '1px', margin: 0 },
  btnPrimary: { padding: '10px 22px', background: '#00f5d4', color: '#08080e', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  btnSuccess: { padding: '12px 24px', background: '#00f593', color: '#08080e', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  form: { background: 'rgba(14,14,24,0.7)', border: '1px solid rgba(255,255,255,0.04)', padding: 24, borderRadius: 14, marginBottom: 24 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 },
  input: { padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 13, color: '#e8e8f0', width: '100%', boxSizing: 'border-box', outline: 'none' },
  tableWrap: { background: 'rgba(14,14,24,0.7)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 14, overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#b0b0c0' },
  cell: { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  btnEdit: { padding: '6px 14px', background: 'rgba(0,245,212,0.1)', color: '#00f5d4', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnDel: { padding: '6px 14px', background: 'rgba(255,51,85,0.1)', color: '#ff3355', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  btnGroup: { display: 'flex', gap: 6 },
}
