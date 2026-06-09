import React, { useState, useEffect } from 'react'
import { getEquipment, createEquipment, updateEquipment, deleteEquipment, getEquipmentMaintenanceLogs, createEquipmentMaintenanceLog, updateEquipmentMaintenanceLog } from '../api/equipment'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { showConfirm } from '../components/SweetAlert'
import { exportToExcel } from '../utils/exportExcel'

export default function EquipmentPage() {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [logItem, setLogItem] = useState(null)
  const [logs, setLogs] = useState([])
  const [addFaultItem, setAddFaultItem] = useState(null)
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const ar = locale === 'ar'

  const emptyForm = { equipment_code: '', name: '', category: '', quantity: 1, condition: 'good', maintenance_status: 'ok', last_maintenance: '', next_maintenance: '', location: '', notes: '' }
  const [form, setForm] = useState(emptyForm)
  const [faultForm, setFaultForm] = useState({ issue_date: new Date().toISOString().slice(0, 10), issue_description: '', repair_date: '', repair_description: '', cost: 0, handled_by: '', status: 'open' })

  useEffect(() => { load() }, [])
  const load = async () => { const res = await getEquipment(); setItems(res.data.items) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form, quantity: parseInt(form.quantity) }
    try {
      if (editId) { await updateEquipment(editId, data); toast(t('equipment.updated'), 'success') }
      else { await createEquipment(data); toast(t('equipment.created'), 'success') }
      setShowForm(false); setEditId(null); setForm(emptyForm); load()
    } catch { toast('Error', 'error') }
  }

  const handleEdit = (eq) => {
    setForm({ equipment_code: eq.equipment_code || '', name: eq.name, category: eq.category || '', quantity: eq.quantity, condition: eq.condition, maintenance_status: eq.maintenance_status, last_maintenance: eq.last_maintenance || '', next_maintenance: eq.next_maintenance || '', location: eq.location || '', notes: eq.notes || '' })
    setEditId(eq.id); setShowForm(true); setAddFaultItem(null); setLogItem(null)
  }

  const handleDelete = async (id) => {
    if (await showConfirm(t('equipment.deleteConfirm'), '', t('common.delete'), t('common.cancel'))) {
      try { await deleteEquipment(id); toast(t('equipment.deleted'), 'success'); load() }
      catch { toast('Error', 'error') }
    }
  }

  const openLogs = async (eq) => {
    setLogItem(eq); setAddFaultItem(null); setShowForm(false)
    const res = await getEquipmentMaintenanceLogs(eq.id); setLogs(res.data.items || [])
  }

  const openAddFault = (eq) => {
    setAddFaultItem(eq); setLogItem(null); setShowForm(false)
    setFaultForm({ issue_date: new Date().toISOString().slice(0, 10), issue_description: '', repair_date: '', repair_description: '', cost: 0, handled_by: '', status: 'open' })
  }

  const submitFault = async (e) => {
    e.preventDefault()
    await createEquipmentMaintenanceLog(addFaultItem.id, { ...faultForm, cost: Number(faultForm.cost || 0), repair_date: faultForm.repair_date || null })
    toast(t('equipment.updated'), 'success')
    setAddFaultItem(null); load()
  }

  const markRepaired = async (eq) => {
    // Find open log for this equipment and mark repaired, or create a repair log
    const res = await getEquipmentMaintenanceLogs(eq.id)
    const openLog = (res.data.items || []).find(l => l.status === 'open')
    if (openLog) {
      await updateEquipmentMaintenanceLog(openLog.id, {
        status: 'repaired',
        repair_date: new Date().toISOString().slice(0, 10),
        repair_description: openLog.repair_description || (ar ? 'تم الإصلاح' : 'Repaired'),
      })
    } else {
      await createEquipmentMaintenanceLog(eq.id, {
        issue_date: new Date().toISOString().slice(0, 10),
        issue_description: ar ? 'تم الإصلاح' : 'Repaired',
        repair_date: new Date().toISOString().slice(0, 10),
        repair_description: ar ? 'تم الإصلاح' : 'Repaired',
        cost: 0, handled_by: '', status: 'repaired',
      })
    }
    await updateEquipment(eq.id, { ...eq, maintenance_status: 'ok' })
    toast(ar ? 'تم تسجيل الإصلاح' : 'Repair recorded', 'success')
    load()
  }

  const markRepairInLog = async (log) => {
    await updateEquipmentMaintenanceLog(log.id, {
      status: 'repaired',
      repair_date: new Date().toISOString().slice(0, 10),
      repair_description: log.repair_description || (t('equipment.repaired') || 'Repaired'),
    })
    toast(t('equipment.updated'), 'success')
    const refreshed = await getEquipment(); setItems(refreshed.data.items || [])
    openLogs(logItem)
  }

  const handleExport = () => {
    if (!items.length) { toast(ar ? 'لا توجد بيانات للتصدير' : 'No data to export', 'info'); return }
    const rows = items.map((eq) => ({
      equipment_code: eq.equipment_code || `#${eq.id}`,
      name: eq.name,
      category: eq.category || '',
      quantity: eq.quantity,
      condition: t(`equipment.${eq.condition}`),
      maintenance_status: t(`equipment.${eq.maintenance_status === 'needs_service' ? 'needsService' : eq.maintenance_status === 'in_repair' ? 'inRepair' : eq.maintenance_status}`),
      next_maintenance: eq.next_maintenance || '',
      location: eq.location || '',
      notes: eq.notes || '',
    }))
    exportToExcel({
      data: rows,
      headers: ['equipment_code', 'name', 'category', 'quantity', 'condition', 'maintenance_status', 'next_maintenance', 'location', 'notes'],
      labels: ar
        ? ['رقم المعدة', 'الاسم', 'التصنيف', 'الكمية', 'الحالة', 'الصيانة', 'الصيانة القادمة', 'الموقع', 'ملاحظات']
        : ['Code', 'Name', 'Category', 'Qty', 'Condition', 'Maintenance', 'Next Maint.', 'Location', 'Notes'],
      filename: ar ? 'المعدات' : 'equipment',
      sheet: ar ? 'المعدات' : 'Equipment',
    })
  }

  const conditionColor = (v) => ({ new: '#2ecc71', good: '#2ecc71', fair: '#f39c12', poor: '#e74c3c' }[v] || '#aaa')
  const maintColor = (v) => v === 'ok' ? '#2ecc71' : v === 'in_repair' ? '#3498db' : '#e74c3c'
  const badge = (color, text) => (
    <span style={{ background: `${color}22`, color, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{text}</span>
  )

  return (
    <div>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>{t('equipment.title')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.btnExport} onClick={handleExport}>⬇ {ar ? 'تصدير Excel' : 'Export Excel'}</button>
          <button style={s.btnPrimary} onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); setLogItem(null); setAddFaultItem(null) }}>
            {showForm && !editId ? `✕ ${t('common.cancel')}` : `+ ${t('equipment.add')}`}
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <h3 style={{ color: '#e8e8f0', margin: '0 0 12px', fontSize: 15 }}>{editId ? t('common.edit') : t('equipment.add')}</h3>
          <div style={s.formGrid}>
            <input style={s.input} placeholder={t('equipment.code')} value={form.equipment_code} onChange={(e) => setForm({ ...form, equipment_code: e.target.value })} />
            <input style={s.input} placeholder={`${t('equipment.name')}*`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input style={s.input} placeholder={t('equipment.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input style={s.input} type="number" min="1" placeholder={t('equipment.quantity') || 'Qty'} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <select style={s.input} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
              <option value="new">{t('equipment.new')}</option>
              <option value="good">{t('equipment.good')}</option>
              <option value="fair">{t('equipment.fair')}</option>
              <option value="poor">{t('equipment.poor')}</option>
            </select>
            <select style={s.input} value={form.maintenance_status} onChange={(e) => setForm({ ...form, maintenance_status: e.target.value })}>
              <option value="ok">{t('equipment.ok')}</option>
              <option value="needs_service">{t('equipment.needsService')}</option>
              <option value="in_repair">{t('equipment.inRepair')}</option>
            </select>
            <input style={s.input} type="date" placeholder={t('equipment.lastMaint')} value={form.last_maintenance} onChange={(e) => setForm({ ...form, last_maintenance: e.target.value })} />
            <input style={s.input} type="date" placeholder={t('equipment.nextMaint')} value={form.next_maintenance} onChange={(e) => setForm({ ...form, next_maintenance: e.target.value })} />
            <input style={s.input} placeholder={t('equipment.location')} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <input style={s.input} placeholder={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={s.btnSuccess}>{editId ? t('common.update') : t('common.create')}</button>
            <button type="button" style={s.btnGhost} onClick={() => { setShowForm(false); setEditId(null) }}>{t('common.cancel')}</button>
          </div>
        </form>
      )}

      {/* Add Fault Form */}
      {addFaultItem && (
        <div style={s.panel}>
          <div style={s.panelHead}>
            <h3 style={{ color: '#e74c3c', margin: 0, fontSize: 14 }}>⚠ {ar ? 'إضافة عطل' : 'Report Fault'} — {addFaultItem.name}</h3>
            <button style={s.btnGhost} onClick={() => setAddFaultItem(null)}>✕</button>
          </div>
          <form onSubmit={submitFault}>
            <div style={s.formGrid}>
              <input style={s.input} type="date" value={faultForm.issue_date} onChange={(e) => setFaultForm({ ...faultForm, issue_date: e.target.value })} />
              <input style={s.input} placeholder={ar ? 'وصف العطل*' : 'Fault description*'} value={faultForm.issue_description} onChange={(e) => setFaultForm({ ...faultForm, issue_description: e.target.value })} required />
              <input style={s.input} placeholder={ar ? 'تكلفة الإصلاح' : 'Repair cost'} type="number" value={faultForm.cost} onChange={(e) => setFaultForm({ ...faultForm, cost: e.target.value })} />
              <input style={s.input} placeholder={ar ? 'المسؤول' : 'Handled by'} value={faultForm.handled_by} onChange={(e) => setFaultForm({ ...faultForm, handled_by: e.target.value })} />
              <select style={s.input} value={faultForm.status} onChange={(e) => setFaultForm({ ...faultForm, status: e.target.value })}>
                <option value="open">{ar ? 'مفتوح' : 'Open'}</option>
                <option value="repaired">{ar ? 'تم الإصلاح' : 'Repaired'}</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={s.btnDanger}>{ar ? 'تسجيل العطل' : 'Submit Fault'}</button>
              <button type="button" style={s.btnGhost} onClick={() => setAddFaultItem(null)}>{t('common.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Equipment Table */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>{t('equipment.code')}</th>
              <th style={s.th}>{t('equipment.name')}</th>
              <th style={s.th}>{t('equipment.category')}</th>
              <th style={s.th}>{t('equipment.condition')}</th>
              <th style={s.th}>{t('equipment.maintenance')}</th>
              <th style={s.th}>{t('equipment.nextMaint')}</th>
              <th style={s.th}>{t('equipment.location')}</th>
              <th style={s.th}>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((eq) => (
              <tr key={eq.id} style={{ background: eq.maintenance_status === 'needs_service' ? 'rgba(231,76,60,0.04)' : 'transparent' }}>
                <td style={s.td}>{eq.equipment_code || `#${eq.id}`}</td>
                <td style={s.td}><strong style={{ color: '#e8e8f0' }}>{eq.name}</strong></td>
                <td style={s.td}>{eq.category || '-'}</td>
                <td style={s.td}>{badge(conditionColor(eq.condition), t(`equipment.${eq.condition}`))}</td>
                <td style={s.td}>{badge(maintColor(eq.maintenance_status), t(`equipment.${eq.maintenance_status === 'needs_service' ? 'needsService' : eq.maintenance_status === 'in_repair' ? 'inRepair' : eq.maintenance_status}`))}</td>
                <td style={s.td}>{eq.next_maintenance || '-'}</td>
                <td style={s.td}>{eq.location || '-'}</td>
                <td style={s.td}>
                  <div style={s.btnGroup}>
                    <button style={s.btnLog} onClick={() => openLogs(eq)} title={ar ? 'السجل' : 'History'}>📋</button>
                    <button style={s.btnEdit} onClick={() => handleEdit(eq)} title={ar ? 'تعديل' : 'Edit'}>✎</button>
                    <button style={s.btnFault} onClick={() => openAddFault(eq)} title={ar ? 'إضافة عطل' : 'Report fault'}>⚠</button>
                    {eq.maintenance_status === 'needs_service' && (
                      <button style={s.btnRepair} onClick={() => markRepaired(eq)} title={ar ? 'تم الإصلاح' : 'Mark repaired'}>🔧 {ar ? 'تم' : 'Fixed'}</button>
                    )}
                    <button style={s.btnDel} onClick={() => handleDelete(eq.id)} title={ar ? 'حذف' : 'Delete'}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Maintenance Log Modal */}
      {logItem && (
        <div style={s.overlay} onClick={() => setLogItem(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHead}>
              <h2 style={{ color: '#e8e8f0', margin: 0, fontSize: 16 }}>📋 {logItem.name} — {ar ? 'سجل الصيانة' : 'Maintenance Log'}</h2>
              <button style={s.btnGhost} onClick={() => setLogItem(null)}>✕</button>
            </div>
            <div style={s.list}>
              {logs.length === 0 ? (
                <p style={{ color: '#6f7082', textAlign: 'center' }}>{ar ? 'لا يوجد سجلات' : 'No records'}</p>
              ) : logs.map((log) => (
                <div key={log.id} style={{ ...s.logRow, borderColor: log.status === 'open' ? 'rgba(231,76,60,0.3)' : 'rgba(46,204,113,0.15)' }}>
                  <div>
                    <b style={{ color: '#e8e8f0', fontSize: 13 }}>{log.issue_date}</b>
                    <p style={{ color: '#ccc', margin: '4px 0 0', fontSize: 12 }}>{log.issue_description}</p>
                    {log.repair_date && <small style={{ color: '#2ecc71' }}>✅ {log.repair_date} — {log.repair_description}</small>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {badge(log.status === 'open' ? '#e74c3c' : '#2ecc71', log.status === 'open' ? (ar ? 'مفتوح' : 'Open') : (ar ? 'تم الإصلاح' : 'Repaired'))}
                    {log.status === 'open' && (
                      <button style={s.btnRepairSm} onClick={() => markRepairInLog(log)}>🔧 {ar ? 'تم الإصلاح' : 'Mark repaired'}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 },
  btnPrimary: { padding: '10px 22px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnExport: { padding: '10px 18px', background: 'rgba(29,111,66,0.9)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' },
  btnSuccess: { padding: '10px 22px', background: 'linear-gradient(135deg, #2ecc71, #27ae60)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnGhost: { padding: '8px 16px', background: 'transparent', color: '#8a8a9a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  btnDanger: { padding: '10px 22px', background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  form: { background: 'rgba(20,20,35,0.6)', border: '1px solid rgba(255,255,255,0.06)', padding: 20, borderRadius: 12, marginBottom: 20 },
  panel: { background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.2)', padding: 16, borderRadius: 10, marginBottom: 16 },
  panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 14 },
  input: { padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13, color: '#fff', width: '100%', boxSizing: 'border-box', outline: 'none' },
  tableWrap: { background: 'rgba(20,20,35,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#ccc' },
  th: { padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#6f7082', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'start' },
  td: { padding: '11px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  btnGroup: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  btnLog: { padding: '5px 10px', background: 'rgba(52,152,219,0.12)', color: '#3498db', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13 },
  btnEdit: { padding: '5px 10px', background: 'rgba(102,126,234,0.12)', color: '#667eea', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13 },
  btnFault: { padding: '5px 10px', background: 'rgba(243,156,18,0.12)', color: '#f39c12', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13 },
  btnRepair: { padding: '5px 10px', background: 'rgba(46,204,113,0.15)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.25)', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700 },
  btnDel: { padding: '5px 10px', background: 'rgba(231,76,60,0.12)', color: '#e74c3c', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 },
  overlay: { position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(0,0,0,0.72)' },
  modal: { width: 'min(700px, 94vw)', maxHeight: '85vh', overflow: 'auto', padding: 20, borderRadius: 12, background: '#08080e', border: '1px solid rgba(255,255,255,0.1)' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  list: { display: 'grid', gap: 10 },
  logRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' },
  btnRepairSm: { padding: '5px 10px', background: 'rgba(46,204,113,0.14)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.25)', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' },
}
