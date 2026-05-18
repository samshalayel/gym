import React, { useState, useEffect } from 'react'
import { getEquipment, createEquipment, updateEquipment, deleteEquipment } from '../api/equipment'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { showConfirm } from '../components/SweetAlert'

export default function EquipmentPage() {
  const [items, setItems] = useState([]); const [showForm, setShowForm] = useState(false); const [editId, setEditId] = useState(null)
  const { t } = useI18n(); const { toast } = useToast()
  const [form, setForm] = useState({ name: '', category: '', quantity: 1, condition: 'good', maintenance_status: 'ok', last_maintenance: '', next_maintenance: '', location: '', notes: '' })

  useEffect(() => { load() }, [])
  const load = async () => { const res = await getEquipment(); setItems(res.data.items) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form, quantity: parseInt(form.quantity) }
    try {
      if (editId) { await updateEquipment(editId, data); toast(t('equipment.updated'), 'success') }
      else { await createEquipment(data); toast(t('equipment.created'), 'success') }
      setShowForm(false); setEditId(null); setForm({ name: '', category: '', quantity: 1, condition: 'good', maintenance_status: 'ok', last_maintenance: '', next_maintenance: '', location: '', notes: '' }); load()
    } catch { toast('Error', 'error') }
  }

  const handleEdit = (eq) => { setForm({ name: eq.name, category: eq.category || '', quantity: eq.quantity, condition: eq.condition, maintenance_status: eq.maintenance_status, last_maintenance: eq.last_maintenance || '', next_maintenance: eq.next_maintenance || '', location: eq.location || '', notes: eq.notes || '' }); setEditId(eq.id); setShowForm(true) }
  const handleDelete = async (id) => { if (await showConfirm(t('equipment.deleteConfirm'), '', t('common.delete'), t('common.cancel'))) { try { await deleteEquipment(id); toast(t('equipment.deleted'), 'success'); load() } catch { toast('Error', 'error') } } }

  const badge = (v, good, bad, goodC, badC) => ({ background: v === good ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.15)', color: v === good ? '#2ecc71' : '#e74c3c', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 })

  return (
    <div>
      <div style={s.header}><h1 style={s.title}>{t('equipment.title')}</h1><button style={s.btnPrimary} onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', category: '', quantity: 1, condition: 'good', maintenance_status: 'ok', last_maintenance: '', next_maintenance: '', location: '', notes: '' }) }}>{showForm ? `✕ ${t('common.cancel')}` : `+ ${t('equipment.add')}`}</button></div>
      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.formGrid}>
            <input style={s.input} placeholder={`${t('equipment.name')}*`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input style={s.input} placeholder={t('equipment.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input style={s.input} placeholder={t('equipment.quantity')} type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <select style={s.input} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
              <option value="new">{t('equipment.new')}</option><option value="good">{t('equipment.good')}</option><option value="fair">{t('equipment.fair')}</option><option value="poor">{t('equipment.poor')}</option>
            </select>
            <select style={s.input} value={form.maintenance_status} onChange={(e) => setForm({ ...form, maintenance_status: e.target.value })}>
              <option value="ok">{t('equipment.ok')}</option><option value="needs_service">{t('equipment.needsService')}</option><option value="in_repair">{t('equipment.inRepair')}</option>
            </select>
            <input style={s.input} type="date" placeholder={t('equipment.lastMaint')} value={form.last_maintenance} onChange={(e) => setForm({ ...form, last_maintenance: e.target.value })} />
            <input style={s.input} type="date" placeholder={t('equipment.nextMaint')} value={form.next_maintenance} onChange={(e) => setForm({ ...form, next_maintenance: e.target.value })} />
            <input style={s.input} placeholder={t('equipment.location')} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <input style={s.input} placeholder={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" style={s.btnSuccess}>{editId ? t('common.update') : t('common.create')}</button>
        </form>
      )}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead><tr><th style={s.cell}>{t('equipment.name')}</th><th style={s.cell}>{t('equipment.category')}</th><th style={s.cell}>{t('equipment.quantity')}</th><th style={s.cell}>{t('equipment.condition')}</th><th style={s.cell}>{t('equipment.maintenance')}</th><th style={s.cell}>{t('equipment.nextMaint')}</th><th style={s.cell}>{t('equipment.location')}</th><th style={s.cell}>{t('common.actions')}</th></tr></thead>
          <tbody>{items.map(eq => (
            <tr key={eq.id}>
              <td style={s.cell}>{eq.name}</td><td style={s.cell}>{eq.category}</td><td style={s.cell}>{eq.quantity}</td>
              <td style={s.cell}><span style={badge(eq.condition, 'new', 'poor', '#2ecc71', '#e74c3c')}>{t(`equipment.${eq.condition}`)}</span></td>
              <td style={s.cell}><span style={badge(eq.maintenance_status, 'ok', 'needs_service', '#2ecc71', '#e74c3c')}>{t(`equipment.${eq.maintenance_status === 'needs_service' ? 'needsService' : eq.maintenance_status}`)}</span></td>
              <td style={s.cell}>{eq.next_maintenance || '-'}</td><td style={s.cell}>{eq.location || '-'}</td>
              <td style={s.cell}><div style={s.btnGroup}><button style={s.btnEdit} onClick={() => handleEdit(eq)}>{t('common.edit')}</button><button style={s.btnDel} onClick={() => handleDelete(eq.id)}>{t('common.delete')}</button></div></td>
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
  btnSuccess: { padding: '12px 24px', background: 'linear-gradient(135deg, #2ecc71, #27ae60)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  form: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', padding: 24, borderRadius: 16, marginBottom: 24 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 },
  input: { padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#fff', width: '100%', boxSizing: 'border-box', outline: 'none' },
  tableWrap: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#ccc' },
  btnEdit: { padding: '6px 14px', background: 'rgba(102,126,234,0.15)', color: '#667eea', border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: 4, fontSize: 12, fontWeight: 500 },
  btnDel: { padding: '6px 14px', background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  cell: { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  btnGroup: { display: 'flex', gap: '6px' },
}
