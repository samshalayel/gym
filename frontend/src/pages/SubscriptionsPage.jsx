import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSubscriptions, createSubscription, deleteSubscription } from '../api/subscriptions'
import { getMembers } from '../api/members'
import { getPlans } from '../api/plans'
import { getActiveOffers } from '../api/offers'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { showConfirm } from '../components/SweetAlert'
import Swal from 'sweetalert2'
import { exportCSV, parseCSV } from '../utils/csv'
import { formatCurrency } from '../utils/currency'
import { paymentStatusLabel } from '../utils/displayLabels'

const PAGE_SIZE = 6
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const addMonths = (dateValue, months) => {
  const d = new Date(dateValue)
  d.setMonth(d.getMonth() + Number(months || 1))
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const arEnMap = {
  'منتهي': 'expired', 'منتهية': 'expired', 'منته': 'expired',
  'نشط': 'active', 'نشطة': 'active',
  'مجم': 'frozen', 'مجمدة': 'frozen',
  'ملغي': 'canceled', 'ملغية': 'canceled',
  'مدفوع': 'paid', 'مدفوعة': 'paid',
  'غير مدفوع': 'unpaid', 'غير مدفوعة': 'unpaid',
  'جزئي': 'partial', 'جزئية': 'partial',
  'شهري': 'monthly', 'ربع سنوي': 'quarterly', 'سنوي': 'yearly',
  'ساري': 'active', 'منتهي الصلاحية': 'expired',
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState([]); const [members, setMembers] = useState([])
  const [plans, setPlans] = useState([]); const [offers, setOffers] = useState([])
  const [showForm, setShowForm] = useState(false); const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { t, locale } = useI18n(); const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const [memberQuery, setMemberQuery] = useState('')
  const [form, setForm] = useState({ member_id: '', plan_id: '', offer_id: '', start_date: today(), end_date: '', amount_paid: 0, payment_status: 'unpaid', session_count: '', payment_method: 'cash', payment_account: '', training_days: 'all', notes: '' })

  useEffect(() => { load(); loadOptions() }, [])

  useEffect(() => {
    if (searchParams.get('action') === 'new') setShowForm(true)
  }, [])

  const load = async () => { const res = await getSubscriptions(); setSubs(res.data.items) }
  const loadOptions = async () => {
    const [m, p, o] = await Promise.all([getMembers(), getPlans(), getActiveOffers()])
    setMembers(m.data.items); setPlans(p.data.items); setOffers(o.data.items)
  }

  const memberMap = useMemo(() => { const m = {}; members.forEach(x => { m[x.id] = x }); return m }, [members])
  const planMap = useMemo(() => { const p = {}; plans.forEach(x => { p[x.id] = x }); return p }, [plans])
  const offerMap = useMemo(() => { const o = {}; offers.forEach(x => { o[x.id] = x }); return o }, [offers])

  const filtered = useMemo(() => {
    if (!search.trim()) return subs
    const q = search.toLowerCase().trim()
    const enQ = arEnMap[q] || q
    return subs.filter(sub => {
      const m = memberMap[sub.member_id]
      const p = planMap[sub.plan_id]
      const o = sub.offer_id ? offerMap[sub.offer_id] : null
      const days = Math.ceil((new Date(sub.end_date) - new Date()) / (1000 * 60 * 60 * 24))
      const isActive = days > 0
      const searchable = [
        m?.name, m?.phone, m?.email,
        p?.name, o?.name,
        sub.payment_status, sub.renewal_status, sub.notes,
        sub.start_date, sub.end_date, formatCurrency(sub.amount_paid),
        isActive ? 'active' : 'expired',
        days > 30 ? 'active' : days > 0 ? 'ending' : 'expired',
        p?.duration_months === 1 ? 'monthly' : p?.duration_months === 3 ? 'quarterly' : p?.duration_months === 12 ? 'yearly' : '',
      ].filter(Boolean).map(s => s.toLowerCase())
      return searchable.some(s => s.includes(q) || s.includes(enQ))
    })
  }, [subs, search, memberMap, planMap, offerMap])

  const totalPages = useMemo(() => Math.ceil(filtered.length / PAGE_SIZE), [filtered])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const stats = useMemo(() => {
    const now = new Date()
    const active = subs.filter(s => new Date(s.end_date) >= now).length
    const expired = subs.filter(s => new Date(s.end_date) < now).length
    const revenue = subs.reduce((sum, s) => sum + (s.amount_paid || 0), 0)
    return { active, expired, revenue, total: subs.length }
  }, [subs])

  const handleSearch = (val) => {
    setSearch(val)
    setPage(1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createSubscription({
        ...form, member_id: parseInt(form.member_id), plan_id: parseInt(form.plan_id),
        offer_id: form.offer_id ? parseInt(form.offer_id) : null,
        amount_paid: parseFloat(form.amount_paid),
        session_count: form.session_count ? parseInt(form.session_count) : null,
      })
      toast(t('subscriptions.created'), 'success')
      setShowForm(false); setForm({ member_id: '', plan_id: '', offer_id: '', start_date: today(), end_date: '', amount_paid: 0, payment_status: 'unpaid', session_count: '', payment_method: 'cash', payment_account: '', training_days: 'all', notes: '' }); setMemberQuery(''); load()
    } catch (error) {
      toast(error.response?.status === 409 ? t('subscriptions.duplicateActive') : t('subscriptions.error'), 'error')
    }
  }

  const handlePlanChange = (planId) => {
    const plan = plans.find((p) => String(p.id) === String(planId))
    setForm({
      ...form,
      plan_id: planId,
      end_date: plan ? addMonths(form.start_date || today(), plan.duration_months) : form.end_date,
      amount_paid: plan?.price ?? form.amount_paid,
      session_count: plan?.session_count ?? '',
    })
  }

  const handleStartChange = (value) => {
    const plan = plans.find((p) => String(p.id) === String(form.plan_id))
    setForm({ ...form, start_date: value, end_date: plan ? addMonths(value, plan.duration_months) : form.end_date })
  }

  const memberOptions = useMemo(() => members.filter((m) => `${m.name} ${m.phone}`.toLowerCase().includes(memberQuery.toLowerCase())).slice(0, 8), [members, memberQuery])

  const handleDelete = async (id) => {
    if (await showConfirm(t('subscriptions.deleteConfirm'), '', t('common.delete'), t('common.cancel'))) {
      try { await deleteSubscription(id); toast(t('subscriptions.deleted'), 'success'); load() } catch { toast('Error', 'error') }
    }
  }

  const handleExport = async () => {
    const res = await getSubscriptions({ limit: 10000 })
    const all = res.data.items
    if (all.length === 0) { toast(t('common.noData'), 'info'); return }
    exportCSV(all, 'subscriptions', [
      { label: 'ID', accessor: s => s.id },
      { label: 'Member ID', accessor: s => s.member_id },
      { label: 'Plan ID', accessor: s => s.plan_id },
      { label: 'Offer ID', accessor: s => s.offer_id || '' },
      { label: 'Start Date', accessor: s => s.start_date },
      { label: 'End Date', accessor: s => s.end_date },
      { label: 'Amount Paid', accessor: s => s.amount_paid },
      { label: 'Payment Status', accessor: s => s.payment_status },
      { label: 'Renewal Status', accessor: s => s.renewal_status },
      { label: 'Notes', accessor: s => s.notes || '' },
    ])
    toast(t('subscriptions.exported'), 'success')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const text = await file.text()
      const rows = parseCSV(text)
      if (rows.length === 0) { toast(t('common.invalidCsv'), 'error'); return }
      const result = await Swal.fire({
        title: locale === 'ar' ? `استيراد ${rows.length} اشتراك؟` : `Import ${rows.length} subscriptions?`,
        html: `<div style="font-size:13px;color:#aaa">${locale === 'ar' ? 'يتطلب رقم عضو ورقم باقة صحيحين' : 'Requires valid member_id and plan_id'}</div>`,
        icon: 'question', showCancelButton: true, confirmButtonColor: '#2ecc71', cancelButtonColor: '#e74c3c',
        confirmButtonText: t('common.import'), cancelButtonText: t('common.cancel'), background: '#1a1a2e', color: '#e0e0e0', borderRadius: '16px',
      })
      if (!result.isConfirmed) return
      let success = 0, fail = 0
      for (const row of rows) {
        try {
          await createSubscription({
            member_id: parseInt(row['Member ID'] || row.member_id),
            plan_id: parseInt(row['Plan ID'] || row.plan_id),
            offer_id: row['Offer ID'] || row.offer_id ? parseInt(row['Offer ID'] || row.offer_id) : null,
            start_date: row['Start Date'] || row.start_date || '',
            end_date: row['End Date'] || row.end_date || '',
            amount_paid: parseFloat(row['Amount Paid'] || row.amount_paid || 0),
            payment_status: row['Payment Status'] || row.payment_status || 'unpaid',
            notes: row.Notes || row.notes || '',
          })
          success++
        } catch { fail++ }
      }
      Swal.fire({ icon: success > 0 ? 'success' : 'error', title: locale === 'ar' ? `تم استيراد ${success}، فشل ${fail}` : `${success} imported, ${fail} failed`, background: '#1a1a2e', color: '#e0e0e0', borderRadius: '16px', confirmButtonColor: '#667eea' })
      load()
    }
    input.click()
  }

  const daysRemaining = (end) => Math.ceil((new Date(end) - new Date()) / (1000 * 60 * 60 * 24))
  const progressPct = (start, end) => {
    const total = new Date(end) - new Date(start)
    const elapsed = new Date() - new Date(start)
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }

  return (
    <div>
      <div style={s.header}>
        <h1 style={s.title}>{t('subscriptions.title')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.btnImport} onClick={handleImport}>📥 {t('common.import')}</button>
          <button style={s.btnExport} onClick={handleExport}>📤 {t('common.export')}</button>
          <button style={s.btnPrimary} onClick={() => setShowForm(!showForm)}>
            {showForm ? `✕ ${t('common.cancel')}` : `+ ${t('subscriptions.add')}`}
          </button>
        </div>
      </div>

      <div style={s.statsRow}>
        {[
          { label: t('dashboard.activeSubs'), value: stats.active, color: '#2ecc71' },
          { label: t('dashboard.expiredSubs'), value: stats.expired, color: '#e74c3c' },
          { label: t('dashboard.totalRevenue'), value: formatCurrency(stats.revenue), color: '#9b59b6' },
          { label: t('common.total'), value: stats.total, color: '#667eea' },
        ].map(st => (
          <div key={st.label} style={{ ...s.statCard, borderLeft: `4px solid ${st.color}` }}>
            <span style={s.statNum}>{st.value}</span>
            <span style={s.statLabel}>{st.label}</span>
          </div>
        ))}
      </div>

      <div style={s.searchWrap}>
        <span style={s.searchIcon}>🔍</span>
        <input
          style={s.searchInput}
          placeholder={locale === 'ar' ? 'ابحث عن عضو، باقة، منتهي، نشط، مدفوع...' : 'Search member, plan, expired, active, paid...'}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
        />
        {search && <button style={s.clearBtn} onClick={() => handleSearch('')}>✕</button>}
        <div style={s.searchHint}>
          {filtered.length} / {subs.length}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.formGrid}>
            <div style={s.searchSelect}>
              <input style={s.input} value={memberQuery} onChange={(e) => { setMemberQuery(e.target.value); setForm({ ...form, member_id: '' }) }} placeholder={t('subscriptions.searchMember')} required={!form.member_id} />
              {memberQuery && !form.member_id && <div style={s.memberMenu}>{memberOptions.map((m) => <button type="button" key={m.id} onClick={() => { setForm({ ...form, member_id: m.id }); setMemberQuery(`${m.name} - ${m.phone}`) }}>{m.name} - {m.phone}</button>)}</div>}
            </div>
            <select style={s.input} value={form.plan_id} onChange={(e) => handlePlanChange(e.target.value)} required>
              <option value="">{t('subscriptions.selectPlan')}</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>)}
            </select>
            <select style={s.input} value={form.offer_id} onChange={(e) => setForm({ ...form, offer_id: e.target.value })}>
              <option value="">{t('subscriptions.noOffer')}</option>
              {offers.map(o => <option key={o.id} value={o.id}>{o.name}{o.discount_percent > 0 ? ` (-${o.discount_percent}%)` : ''}</option>)}
            </select>
            <input style={s.input} type="date" value={form.start_date} onChange={(e) => handleStartChange(e.target.value)} required />
            <input style={s.input} type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            <div style={s.fieldWrap}>
              <label style={s.fieldLabel}>{t('subscriptions.sessionCount')}</label>
              <input style={s.input} type="number" min="0" value={form.session_count} onChange={(e) => setForm({ ...form, session_count: e.target.value })} placeholder="—" />
            </div>
            <div style={s.fieldWrap}>
              <label style={s.fieldLabel}>{t('subscriptions.amount')}</label>
              <input style={s.input} type="number" step="0.01" min="0" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} placeholder="0" />
            </div>
            <select style={s.input} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              <option value="cash">{t('subscriptions.cash')}</option>
              <option value="bank_palestine">{t('subscriptions.bankPalestine')}</option>
              <option value="pal_pay">{t('subscriptions.palPay')}</option>
              <option value="jawwal_pay">{t('subscriptions.jawwalPay')}</option>
              <option value="mal_chat">{t('subscriptions.malChat')}</option>
              <option value="other_banks">{t('subscriptions.otherBanks')}</option>
            </select>
            <input style={s.input} placeholder={t('subscriptions.paymentAccount')} value={form.payment_account} onChange={(e) => setForm({ ...form, payment_account: e.target.value })} />
            <select style={s.input} value={form.training_days} onChange={(e) => setForm({ ...form, training_days: e.target.value })}>
              <option value="sat_mon_wed">{t('subscriptions.satMonWed')}</option>
              <option value="sun_tue_thu">{t('subscriptions.sunTueThu')}</option>
              <option value="all">{t('subscriptions.allWeek')}</option>
            </select>
            <select style={s.input} value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}>
              <option value="unpaid">{t('subscriptions.unpaid')}</option>
              <option value="paid">{t('subscriptions.paid')}</option>
              <option value="partial">{t('subscriptions.partial')}</option>
            </select>
            <input style={s.input} placeholder={t('common.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" style={s.btnSuccess}>{t('common.create')}</button>
        </form>
      )}

      {paginated.length === 0 ? (
        <div style={s.empty}>
          <span style={{ fontSize: 48 }}>{search ? '🔍' : '🔖'}</span>
          <p style={{ color: '#888', marginTop: 12, fontSize: 14 }}>
            {search ? (locale === 'ar' ? 'لا توجد نتائج لبحثك' : 'No results found') : t('subscriptions.add')}
          </p>
        </div>
      ) : (
        <>
          <div style={s.grid}>
            {paginated.map(sub => {
              const member = memberMap[sub.member_id]
              const plan = planMap[sub.plan_id]
              const offer = sub.offer_id ? offerMap[sub.offer_id] : null
              const remaining = daysRemaining(sub.end_date)
              const isActive = remaining > 0
              const pct = progressPct(sub.start_date, sub.end_date)
              const q = search.toLowerCase().trim()
              const highlight = (text) => {
                if (!text || !q) return text
                const idx = text.toLowerCase().indexOf(q)
                if (idx === -1) return text
                return <>{text.slice(0, idx)}<span style={s.hl}>{text.slice(idx, idx + q.length)}</span>{text.slice(idx + q.length)}</>
              }

              return (
                <div key={sub.id} style={s.card}>
                  <div style={s.cardTop}>
                    <div style={s.memberInfo}>
                      <div style={s.memberAvatar}>{member?.name?.charAt(0) || '?'}</div>
                      <div>
                        <div style={s.memberName}>{highlight(member?.name) || `#${sub.member_id}`}</div>
                        <div style={s.memberPhone}>{member?.phone || ''}</div>
                      </div>
                    </div>
                    <button style={s.btnDel} onClick={() => handleDelete(sub.id)}>✕</button>
                  </div>

                  <div style={s.planBadge}>
                    <span>{highlight(plan?.name) || `Plan #${sub.plan_id}`}</span>
                    <span style={s.planPrice}>{formatCurrency(plan?.price)}</span>
                  </div>

                  {offer && (
                    <div style={s.offerBadge}>
                      🏷️ {highlight(offer.name)}
                      {offer.discount_percent > 0 && <span style={s.offerDisc}> -{offer.discount_percent}%</span>}
                    </div>
                  )}

                  <div style={s.progressWrap}>
                    <div style={s.progressBar}>
                      <div style={{ ...s.progressFill, width: `${Math.min(pct, 100)}%`, background: isActive ? 'linear-gradient(90deg, #667eea, #764ba2)' : '#e74c3c' }} />
                    </div>
                    <div style={s.progressLabels}>
                      <span style={{ color: '#666', fontSize: 11 }}>{sub.start_date}</span>
                      <span style={{ color: isActive ? '#2ecc71' : '#e74c3c', fontSize: 12, fontWeight: 600 }}>
                        {isActive ? `${remaining} ${locale === 'ar' ? 'يوم' : 'd'}` : '✕'}
                      </span>
                      <span style={{ color: '#666', fontSize: 11 }}>{sub.end_date}</span>
                    </div>
                  </div>

                  <div style={s.cardFooter}>
                    <div style={s.footerItem}>
                      <span style={s.footerLabel}>{t('subscriptions.amount')}</span>
                      <span style={{ ...s.footerValue, color: '#2ecc71' }}>{formatCurrency(sub.amount_paid)}</span>
                    </div>
                    <div style={s.footerItem}>
                      <span style={s.footerLabel}>{t('subscriptions.payment')}</span>
                      <span style={{
                        ...s.payBadge,
                        background: sub.payment_status === 'paid' ? 'rgba(46,204,113,0.2)' : sub.payment_status === 'partial' ? 'rgba(243,156,18,0.2)' : 'rgba(231,76,60,0.2)',
                        color: sub.payment_status === 'paid' ? '#2ecc71' : sub.payment_status === 'partial' ? '#f39c12' : '#e74c3c',
                      }}>
                        {sub.payment_status === 'paid' ? '✅' : sub.payment_status === 'partial' ? '⏳' : '❌'} {paymentStatusLabel(sub.payment_status, locale)}
                      </span>
                    </div>
                    <div style={s.footerItem}>
                      <span style={s.footerLabel}>{t('common.status')}</span>
                      <span style={{ ...s.payBadge, background: isActive ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)', color: isActive ? '#2ecc71' : '#e74c3c' }}>
                        {isActive ? '●' : '○'} {isActive ? t('common.active') : t('common.inactive')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div style={s.pagination}>
              <button style={{ ...s.pageBtn, opacity: page <= 1 ? 0.4 : 1 }} disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>◀ {t('common.prev')}</button>
              <span style={s.pageInfo}>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      style={{ ...s.pageNum, background: page === pageNum ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(255,255,255,0.05)', color: page === pageNum ? '#fff' : '#aaa' }}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </span>
              <button style={{ ...s.pageBtn, opacity: page >= totalPages ? 0.4 : 1 }} disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>{t('common.next')} ▶</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 },
  btnPrimary: { padding: '12px 24px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  btnImport: { padding: '12px 20px', background: 'rgba(46,204,113,0.15)', color: '#2ecc71', border: '1px solid rgba(46,204,113,0.3)', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnExport: { padding: '12px 20px', background: 'rgba(52,152,219,0.15)', color: '#3498db', border: '1px solid rgba(52,152,219,0.3)', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnSuccess: { padding: '12px 24px', background: 'linear-gradient(135deg, #2ecc71, #27ae60)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 },
  statCard: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 },
  statNum: { fontSize: 28, fontWeight: 800, color: '#fff' },
  statLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '4px 16px',
    marginBottom: 20,
  },
  searchIcon: { fontSize: 18, color: '#666' },
  searchInput: {
    flex: 1, padding: '14px 0', background: 'none', border: 'none',
    fontSize: 15, color: '#fff', outline: 'none',
  },
  clearBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
    width: 28, height: 28, cursor: 'pointer', color: '#888', fontSize: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  searchHint: { fontSize: 12, color: '#555', fontWeight: 500, whiteSpace: 'nowrap' },
  hl: { background: 'rgba(102,126,234,0.3)', color: '#fff', borderRadius: 3, padding: '0 2px' },
  form: { background: 'rgba(20,20,35,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', padding: 24, borderRadius: 16, marginBottom: 24 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 },
  input: { padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13, color: '#fff', width: '100%', boxSizing: 'border-box', outline: 'none' },
  searchSelect: { position: 'relative' },
  memberMenu: { position: 'absolute', zIndex: 20, top: 46, left: 0, right: 0, display: 'grid', gap: 4, padding: 6, borderRadius: 8, background: '#050509', border: '1px solid rgba(255,255,255,0.12)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 },
  card: { background: '#050509', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  memberInfo: { display: 'flex', alignItems: 'center', gap: 12 },
  memberAvatar: { width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 },
  memberName: { fontSize: 16, fontWeight: 600, color: '#fff' },
  memberPhone: { fontSize: 12, color: '#888', marginTop: 2 },
  planBadge: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(102,126,234,0.1)', borderRadius: 10, padding: '10px 14px' },
  planPrice: { fontSize: 18, fontWeight: 700, color: '#2ecc71' },
  offerBadge: { background: 'rgba(243,156,18,0.1)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#f39c12', display: 'flex', alignItems: 'center', gap: 6 },
  offerDisc: { fontWeight: 700, color: '#e74c3c' },
  progressWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  progressBar: { height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, transition: 'width 0.5s ease' },
  progressLabels: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardFooter: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 },
  footerItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  footerLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' },
  footerValue: { fontSize: 15, fontWeight: 700 },
  payBadge: { padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 },
  btnDel: { width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 },
  pageBtn: { padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#ccc', cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  pageInfo: { display: 'flex', gap: 4 },
  pageNum: { width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: 4 },
  fieldLabel: { fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', paddingInlineStart: 2 },
}
