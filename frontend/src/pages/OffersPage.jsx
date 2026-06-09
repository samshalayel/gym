import React, { useState, useEffect } from 'react'
import { getOffers, createOffer, updateOffer, deleteOffer } from '../api/offers'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { showConfirm } from '../components/SweetAlert'
import { formatCurrency } from '../utils/currency'
import { exportToExcel } from '../utils/exportExcel'

export default function OffersPage() {
  const [offers, setOffers] = useState([]); const [showForm, setShowForm] = useState(false); const [editId, setEditId] = useState(null)
  const { t, locale } = useI18n(); const { toast } = useToast()
  const [form, setForm] = useState({ name: '', description: '', discount_percent: 0, discount_fixed: 0, start_date: '', end_date: '', is_active: 'true' })

  const handleExport = () => {
    if (!offers.length) return
    exportToExcel({
      data: offers.map((o) => ({ name: o.name, discount_percent: o.discount_percent || 0, discount_fixed: o.discount_fixed || 0, start_date: o.start_date || '', end_date: o.end_date || '', is_active: o.is_active === 'true' ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'متوقف' : 'Inactive'), description: o.description || '' })),
      headers: ['name', 'discount_percent', 'discount_fixed', 'start_date', 'end_date', 'is_active', 'description'],
      labels: locale === 'ar' ? ['الاسم', 'خصم %', 'خصم ثابت', 'البداية', 'النهاية', 'الحالة', 'الوصف'] : ['Name', 'Disc %', 'Disc Fixed', 'Start', 'End', 'Status', 'Description'],
      filename: locale === 'ar' ? 'العروض' : 'offers',
      sheet: locale === 'ar' ? 'العروض' : 'Offers',
    })
  }

  useEffect(() => { load() }, [])

  const load = async () => { const res = await getOffers(); setOffers(res.data.items) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form, discount_percent: parseFloat(form.discount_percent), discount_fixed: parseFloat(form.discount_fixed) }
    try {
      if (editId) { await updateOffer(editId, data); toast(t('offers.updated'), 'success') }
      else { await createOffer(data); toast(t('offers.created'), 'success') }
      setShowForm(false); setEditId(null); setForm({ name: '', description: '', discount_percent: 0, discount_fixed: 0, start_date: '', end_date: '', is_active: 'true' }); load()
    } catch { toast('Error', 'error') }
  }

  const handleEdit = (o) => { setForm({ name: o.name, description: o.description || '', discount_percent: o.discount_percent, discount_fixed: o.discount_fixed, start_date: o.start_date, end_date: o.end_date, is_active: o.is_active }); setEditId(o.id); setShowForm(true) }
  const handleDelete = async (id) => { if (await showConfirm(t('offers.deleteConfirm'), '', t('common.delete'), t('common.cancel'))) { try { await deleteOffer(id); toast(t('offers.deleted'), 'success'); load() } catch { toast('Error', 'error') } } }

  return (
    <div>
      <div style={s.header}><h1 style={s.title}>{t('offers.title')}</h1><div style={{ display: 'flex', gap: 8 }}><button style={s.btnExport} onClick={handleExport}>⬇ {locale === 'ar' ? 'تصدير Excel' : 'Export'}</button><button style={s.btnPrimary} onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', description: '', discount_percent: 0, discount_fixed: 0, start_date: '', end_date: '', is_active: 'true' }) }}>{showForm ? `✕ ${t('common.cancel')}` : `+ ${t('offers.add')}`}</button></div></div>
      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.formGrid}>
            <input style={s.input} placeholder={`${t('offers.name')}*`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input style={s.input} placeholder={t('plans.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input style={s.input} placeholder={t('offers.discountPercent')} type="number" step="0.01" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
            <input style={s.input} placeholder={t('offers.discountFixed')} type="number" step="0.01" value={form.discount_fixed} onChange={(e) => setForm({ ...form, discount_fixed: e.target.value })} />
            <input style={s.input} type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            <input style={s.input} type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            <select style={s.input} value={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.value })}>
              <option value="true">{t('common.active')}</option><option value="false">{t('common.inactive')}</option>
            </select>
          </div>
          <button type="submit" style={s.btnSuccess}>{editId ? t('common.update') : t('common.create')}</button>
        </form>
      )}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead><tr><th style={s.cell}>{t('offers.name')}</th><th style={s.cell}>{t('offers.discountPercent')}</th><th style={s.cell}>{t('offers.discountFixed')}</th><th style={s.cell}>{t('offers.startDate')}</th><th style={s.cell}>{t('offers.endDate')}</th><th style={s.cell}>{t('common.status')}</th><th style={s.cell}>{t('common.actions')}</th></tr></thead>
          <tbody>{offers.map(o => (
            <tr key={o.id}>
              <td style={s.cell}>{o.name}</td><td style={{...s.cell, color: '#f39c12'}}>{o.discount_percent}%</td><td style={s.cell}>{o.discount_fixed ? formatCurrency(o.discount_fixed) : '-'}</td>
              <td style={s.cell}>{o.start_date}</td><td style={s.cell}>{o.end_date}</td>
              <td style={s.cell}><span style={{ ...s.badge, background: o.is_active === 'true' ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.15)', color: o.is_active === 'true' ? '#2ecc71' : '#e74c3c' }}>{o.is_active === 'true' ? t('common.active') : t('common.inactive')}</span></td>
              <td style={s.cell}><div style={s.btnGroup}><button style={s.btnEdit} onClick={() => handleEdit(o)}>{t('common.edit')}</button><button style={s.btnDel} onClick={() => handleDelete(o.id)}>{t('common.delete')}</button></div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 },
  btnPrimary: { padding: '12px 24px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  btnExport: { padding: '12px 18px', background: 'rgba(29,111,66,0.9)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' },
  btnSuccess: { padding: '12px 24px', background: 'linear-gradient(135deg, #2ecc71, #27ae60)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  form: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', padding: 24, borderRadius: 16, marginBottom: 24 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 },
  input: { padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#fff', width: '100%', boxSizing: 'border-box', outline: 'none' },
  tableWrap: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#ccc' },
  badge: { padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  btnEdit: { padding: '6px 14px', background: 'rgba(102,126,234,0.15)', color: '#667eea', border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: 4, fontSize: 12, fontWeight: 500 },
  btnDel: { padding: '6px 14px', background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  cell: { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  btnGroup: { display: 'flex', gap: '6px' },
}
