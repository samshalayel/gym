import React, { useEffect, useMemo, useState } from 'react'
import { createExpense, deleteExpense, getExpenseReport } from '../api/expenses'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { showConfirm } from '../components/SweetAlert'
import { formatCurrency } from '../utils/currency'

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const defaultCategories = ['electricity', 'rent', 'labor', 'machine_repair', 'other']
const customCategoryKey = 'gym_expense_categories'

export default function ExpensesPage() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [report, setReport] = useState({ total: 0, by_category: [], items: [] })
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(customCategoryKey) || '[]')
    } catch {
      return []
    }
  })
  const [filters, setFilters] = useState({ category: '', start_date: '', end_date: '' })
  const [form, setForm] = useState({ name: '', category: 'electricity', amount: '', paid_by: '', expense_date: today(), notes: '' })

  const categories = useMemo(() => {
    const fromReport = [
      ...(report.by_category || []).map((item) => item.category),
      ...(report.items || []).map((item) => item.category),
    ]
    return [...new Set([...defaultCategories, ...customCategories, ...fromReport].filter(Boolean))]
  }, [customCategories, report])

  const categoryLabel = (category) => defaultCategories.includes(category) ? t(`expenses.${category}`) : category

  const load = async () => {
    const res = await getExpenseReport({
      category: filters.category || undefined,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
    })
    setReport(res.data)
  }

  useEffect(() => { load() }, [filters])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createExpense({ ...form, amount: Number(form.amount), expense_date: form.expense_date || today() })
      toast(t('expenses.saved'), 'success')
      setForm({ name: '', category: 'electricity', amount: '', paid_by: '', expense_date: today(), notes: '' })
      load()
    } catch {
      toast(t('expenses.error'), 'error')
    }
  }

  const handleAddCategory = () => {
    const name = window.prompt(t('expenses.newCategoryPrompt'))
    const clean = name?.trim()
    if (!clean) return
    if (categories.some((category) => category.toLowerCase() === clean.toLowerCase())) {
      toast(t('expenses.categoryExists'), 'info')
      setForm({ ...form, category: clean })
      return
    }
    const next = [...customCategories, clean]
    setCustomCategories(next)
    localStorage.setItem(customCategoryKey, JSON.stringify(next))
    setForm({ ...form, category: clean })
    setFilters({ ...filters, category: '' })
    toast(t('expenses.categoryAdded'), 'success')
  }

  const handleDelete = async (id) => {
    if (!(await showConfirm(t('expenses.deleteConfirm'), '', t('common.delete'), t('common.cancel')))) return
    await deleteExpense(id)
    toast(t('expenses.deleted'), 'success')
    load()
  }

  return (
    <div style={s.page}>
      <section style={s.hero}>
        <div>
          <h1 style={s.title}>{t('expenses.title')}</h1>
          <p style={s.muted}>{t('expenses.subtitle')}</p>
        </div>
        <div style={s.total}>{formatCurrency(report.total)}</div>
      </section>

      <form onSubmit={handleSubmit} style={s.form}>
        <input style={s.input} placeholder={t('expenses.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <div style={s.categoryField}>
          <select style={s.input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {categories.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
          </select>
          <button type="button" style={s.plusBtn} onClick={handleAddCategory}>+</button>
        </div>
        <input style={s.input} type="number" step="0.01" placeholder={t('expenses.amount')} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <input style={s.input} placeholder={t('expenses.paidBy')} value={form.paid_by} onChange={(e) => setForm({ ...form, paid_by: e.target.value })} required />
        <input style={s.input} type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
        <input style={s.input} placeholder={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button style={s.btn}>{t('expenses.add')}</button>
      </form>

      <div style={s.filters}>
        <select style={s.input} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">{t('common.all')}</option>
          {categories.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
        </select>
        <input style={s.input} type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
        <input style={s.input} type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
      </div>

      <div style={s.summary}>
        {report.by_category?.map((item) => (
          <div key={item.category} style={s.summaryCard}>
            <span>{categoryLabel(item.category)}</span>
            <strong>{formatCurrency(item.total)}</strong>
          </div>
        ))}
      </div>

      <div style={s.list}>
        {report.items?.map((item) => (
          <div key={item.id} style={s.row}>
            <div><strong>{item.name}</strong><small>{categoryLabel(item.category)} - {item.expense_date}</small></div>
            <span>{item.paid_by}</span>
            <b>{formatCurrency(item.amount)}</b>
            <button style={s.del} onClick={() => handleDelete(item.id)}>x</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  page: { display: 'grid', gap: 16 },
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: 22, borderRadius: 8, background: '#050509', border: '1px solid rgba(255,255,255,0.08)' },
  title: { margin: 0, color: '#fff', fontSize: 30 },
  muted: { color: '#8b8b9b', margin: '8px 0 0' },
  total: { color: '#00f5d4', fontSize: 34, fontWeight: 900 },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, padding: 16, borderRadius: 8, background: '#050509', border: '1px solid rgba(255,255,255,0.08)' },
  filters: { display: 'grid', gridTemplateColumns: '220px 180px 180px', gap: 10 },
  input: { minHeight: 42, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.10)', background: '#08080e', color: '#fff', outline: 0 },
  categoryField: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 42px', gap: 8 },
  plusBtn: { minHeight: 42, border: 0, borderRadius: 8, background: '#00f593', color: '#06100b', fontSize: 22, fontWeight: 900, cursor: 'pointer' },
  btn: { border: 0, borderRadius: 8, background: '#00f5d4', color: '#08080e', fontWeight: 900, cursor: 'pointer' },
  summary: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 },
  summaryCard: { display: 'grid', gap: 8, padding: 14, borderRadius: 8, background: '#050509', border: '1px solid rgba(255,255,255,0.08)', color: '#d8d8e4' },
  list: { display: 'grid', gap: 8 },
  row: { display: 'grid', gridTemplateColumns: '1fr 180px 120px 36px', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, background: '#050509', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' },
  del: { width: 32, height: 32, border: 0, borderRadius: 6, background: 'rgba(255,51,85,0.12)', color: '#ff3355', cursor: 'pointer' },
}
