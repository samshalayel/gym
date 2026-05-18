import React, { useState, useEffect } from 'react'
import { getNutritionPlans, createNutritionPlan, deleteNutritionPlan } from '../api/nutrition'
import { getMembers } from '../api/members'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { showConfirm } from '../components/SweetAlert'

export default function NutritionPage() {
  const [plans, setPlans] = useState([]); const [members, setMembers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const { t } = useI18n(); const { toast } = useToast()
  const [form, setForm] = useState({ member_id: '', goal: 'weight_loss', meals_per_day: 3, calories: '', protein_g: '', carbs_g: '', fats_g: '', meal_plan: '', notes: '' })

  useEffect(() => { load(); getMembers().then(r => setMembers(r.data.items)) }, [])

  const load = async () => { const res = await getNutritionPlans(); setPlans(res.data.items) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createNutritionPlan({
        ...form, member_id: parseInt(form.member_id), meals_per_day: parseInt(form.meals_per_day),
        calories: form.calories ? parseFloat(form.calories) : null,
        protein_g: form.protein_g ? parseFloat(form.protein_g) : null,
        carbs_g: form.carbs_g ? parseFloat(form.carbs_g) : null,
        fats_g: form.fats_g ? parseFloat(form.fats_g) : null,
      })
      toast(t('nutrition.created'), 'success')
      setShowForm(false); setForm({ member_id: '', goal: 'weight_loss', meals_per_day: 3, calories: '', protein_g: '', carbs_g: '', fats_g: '', meal_plan: '', notes: '' }); load()
    } catch { toast('Error', 'error') }
  }

  const handleDelete = async (id) => { if (await showConfirm(t('nutrition.deleteConfirm'), '', t('common.delete'), t('common.cancel'))) { try { await deleteNutritionPlan(id); toast(t('nutrition.deleted'), 'success'); load() } catch { toast('Error', 'error') } } }

  return (
    <div>
      <div style={s.header}><h1 style={s.title}>{t('nutrition.title')}</h1><button style={s.btnPrimary} onClick={() => setShowForm(!showForm)}>{showForm ? `✕ ${t('common.cancel')}` : `+ ${t('nutrition.add')}`}</button></div>
      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.formGrid}>
            <select style={s.input} value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} required><option value="">{t('nutrition.selectMember')}</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            <select style={s.input} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
              <option value="weight_loss">{t('nutrition.weightLoss')}</option><option value="muscle_gain">{t('nutrition.muscleGain')}</option><option value="maintenance">{t('nutrition.maintenance')}</option>
            </select>
            <input style={s.input} placeholder={t('nutrition.mealsPerDay')} type="number" value={form.meals_per_day} onChange={(e) => setForm({ ...form, meals_per_day: e.target.value })} />
            <input style={s.input} placeholder={t('nutrition.calories')} type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
            <input style={s.input} placeholder={t('nutrition.protein')} type="number" value={form.protein_g} onChange={(e) => setForm({ ...form, protein_g: e.target.value })} />
            <input style={s.input} placeholder={t('nutrition.carbs')} type="number" value={form.carbs_g} onChange={(e) => setForm({ ...form, carbs_g: e.target.value })} />
            <input style={s.input} placeholder={t('nutrition.fats')} type="number" value={form.fats_g} onChange={(e) => setForm({ ...form, fats_g: e.target.value })} />
            <input style={s.input} placeholder={t('nutrition.mealPlan')} value={form.meal_plan} onChange={(e) => setForm({ ...form, meal_plan: e.target.value })} />
            <input style={s.input} placeholder={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" style={s.btnSuccess}>{t('common.create')}</button>
        </form>
      )}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead><tr><th style={s.cell}>{t('nutrition.member')}</th><th style={s.cell}>{t('nutrition.goal')}</th><th style={s.cell}>{t('nutrition.mealsPerDay')}</th><th style={s.cell}>{t('nutrition.calories')}</th><th style={s.cell}>{t('nutrition.protein')}</th><th style={s.cell}>{t('nutrition.carbs')}</th><th style={s.cell}>{t('nutrition.fats')}</th><th style={s.cell}>{t('common.actions')}</th></tr></thead>
          <tbody>{plans.map(p => (
            <tr key={p.id}>
              <td style={s.cell}>#{p.member_id}</td><td style={s.cell}>{t(`nutrition.${p.goal}`)}</td><td style={s.cell}>{p.meals_per_day}</td><td style={s.cell}>{p.calories || '-'}</td><td style={s.cell}>{p.protein_g ? `${p.protein_g}g` : '-'}</td><td style={s.cell}>{p.carbs_g ? `${p.carbs_g}g` : '-'}</td><td style={s.cell}>{p.fats_g ? `${p.fats_g}g` : '-'}</td>
              <td style={s.cell}><div style={s.btnGroup}><button style={s.btnDel} onClick={() => handleDelete(p.id)}>{t('common.delete')}</button></div></td>
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
  btnDel: { padding: '6px 14px', background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
}
