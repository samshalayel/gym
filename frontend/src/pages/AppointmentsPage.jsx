import React, { useState, useEffect } from 'react'
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '../api/appointments'
import { getMembers } from '../api/members'
import { getTrainers } from '../api/staff'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { showConfirm } from '../components/SweetAlert'

export default function AppointmentsPage() {
  const [apps, setApps] = useState([]); const [members, setMembers] = useState([]); const [trainers, setTrainers] = useState([])
  const [showForm, setShowForm] = useState(false); const [editId, setEditId] = useState(null)
  const { t } = useI18n(); const { toast } = useToast()
  const [form, setForm] = useState({ member_id: '', trainer_id: '', date: '', time: '', duration: 60, type: 'personal_training', notes: '' })

  useEffect(() => { load(); loadOptions() }, [])

  const load = async () => { const res = await getAppointments(); setApps(res.data.items) }
  const loadOptions = async () => { const [m, t] = await Promise.all([getMembers(), getTrainers()]); setMembers(m.data.items); setTrainers(t.data.items) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form, member_id: parseInt(form.member_id), trainer_id: form.trainer_id ? parseInt(form.trainer_id) : null, duration: parseInt(form.duration) }
    try {
      if (editId) { await updateAppointment(editId, data); toast(t('appointments.updated'), 'success') }
      else { await createAppointment(data); toast(t('appointments.created'), 'success') }
      setShowForm(false); setEditId(null); setForm({ member_id: '', trainer_id: '', date: '', time: '', duration: 60, type: 'personal_training', notes: '' }); load()
    } catch { toast('Error', 'error') }
  }

  const handleEdit = (a) => { setForm({ member_id: a.member_id, trainer_id: a.trainer_id || '', date: a.date, time: a.time, duration: a.duration, type: a.type, notes: a.notes || '' }); setEditId(a.id); setShowForm(true) }
  const handleDelete = async (id) => { if (await showConfirm(t('appointments.deleteConfirm'), '', t('common.delete'), t('common.cancel'))) { try { await deleteAppointment(id); toast(t('appointments.deleted'), 'success'); load() } catch { toast('Error', 'error') } } }
  const handleStatus = async (id, status) => { try { await updateAppointment(id, { status }); load() } catch { toast('Error', 'error') } }

  const statusStyle = (s) => ({ background: s === 'scheduled' ? 'rgba(243,156,18,0.15)' : s === 'completed' ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.15)', color: s === 'scheduled' ? '#f39c12' : s === 'completed' ? '#2ecc71' : '#e74c3c', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 })

  return (
    <div>
      <div style={s.header}><h1 style={s.title}>{t('appointments.title')}</h1><button style={s.btnPrimary} onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ member_id: '', trainer_id: '', date: '', time: '', duration: 60, type: 'personal_training', notes: '' }) }}>{showForm ? `✕ ${t('common.cancel')}` : `+ ${t('appointments.add')}`}</button></div>
      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.formGrid}>
            <select style={s.input} value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} required><option value="">{t('appointments.selectMember')}</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            <select style={s.input} value={form.trainer_id} onChange={(e) => setForm({ ...form, trainer_id: e.target.value })}><option value="">{t('appointments.selectTrainer')}</option>{trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <input style={s.input} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            <input style={s.input} type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
            <select style={s.input} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
              <option value={30}>30 {t('appointments.min')}</option><option value={45}>45 {t('appointments.min')}</option><option value={60}>60 {t('appointments.min')}</option><option value={90}>90 {t('appointments.min')}</option>
            </select>
            <select style={s.input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="personal_training">{t('appointments.personalTraining')}</option><option value="group_class">{t('appointments.groupClass')}</option><option value="consultation">{t('appointments.consultation')}</option>
            </select>
            <input style={s.input} placeholder={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" style={s.btnSuccess}>{editId ? t('common.update') : t('common.create')}</button>
        </form>
      )}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead><tr><th style={s.cell}>{t('appointments.member')}</th><th style={s.cell}>{t('appointments.trainer')}</th><th style={s.cell}>{t('appointments.date')}</th><th style={s.cell}>{t('appointments.time')}</th><th style={s.cell}>{t('appointments.duration')}</th><th style={s.cell}>{t('appointments.type')}</th><th style={s.cell}>{t('appointments.status')}</th><th style={s.cell}>{t('common.actions')}</th></tr></thead>
          <tbody>{apps.map(a => (
            <tr key={a.id}>
              <td style={s.cell}>#{a.member_id}</td><td style={s.cell}>{a.trainer_id ? `#${a.trainer_id}` : '-'}</td><td style={s.cell}>{a.date}</td><td style={s.cell}>{a.time}</td><td style={s.cell}>{a.duration}{t('appointments.min')}</td>
              <td style={s.cell}>{t(`appointments.${a.type}`)}</td>
              <td style={s.cell}><span style={statusStyle(a.status)}>{t(`appointments.${a.status}`)}</span></td>
              <td style={s.cell}>
                <div style={s.btnGroup}>
                  <button style={s.btnEdit} onClick={() => handleEdit(a)}>{t('common.edit')}</button>
                  {a.status === 'scheduled' && <><button style={{ ...s.btnSmall, background: 'rgba(46,204,113,0.15)', color: '#2ecc71' }} onClick={() => handleStatus(a.id, 'completed')}>{t('appointments.done')}</button><button style={s.btnDel} onClick={() => handleDelete(a.id)}>{t('appointments.cancel')}</button></>}
                </div>
              </td>
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
  cell: { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  btnGroup: { display: 'flex', gap: '6px' },
  btnEdit: { padding: '6px 14px', background: 'rgba(102,126,234,0.15)', color: '#667eea', border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: 4, fontSize: 12, fontWeight: 500 },
  btnDel: { padding: '6px 14px', background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  btnSmall: { padding: '6px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: 4, fontSize: 12, fontWeight: 500 },
}
