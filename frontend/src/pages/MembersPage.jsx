import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getMembers, createMember, updateMember, deleteMember } from '../api/members'
import { getMemberSubscriptions, renewSubscription, changeSubscriptionPlan } from '../api/subscriptions'
import { getPlans } from '../api/plans'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { showConfirm } from '../components/SweetAlert'
import Swal from 'sweetalert2'
import { exportCSV, parseCSV } from '../utils/csv'
import { formatCurrency } from '../utils/currency'
import { genderLabel, memberStatusLabel, paymentStatusLabel } from '../utils/displayLabels'

const PAGE_SIZE = 12
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const addMonths = (dateValue, months) => {
  const d = new Date(dateValue)
  d.setMonth(d.getMonth() + Number(months || 1))
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const statusMeta = {
  active: { color: '#00f593', bg: 'rgba(0,245,147,0.12)' },
  expired: { color: '#ff3355', bg: 'rgba(255,51,85,0.12)' },
  frozen: { color: '#00aaff', bg: 'rgba(0,170,255,0.12)' },
  canceled: { color: '#6b6b80', bg: 'rgba(107,107,128,0.12)' },
}

const initialForm = { name: '', phone: '', email: '', gender: '', birth_date: '', address: '', emergency_contact: '', emergency_phone: '', status: 'active', notes: '' }
const initialSubAction = { type: 'renew', plan_id: '', amount_paid: 0, payment_status: 'paid', payment_method: 'cash', payment_account: '', session_count: '', training_days: 'all', notes: '' }

export default function MembersPage() {
  const [members, setMembers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [detailMember, setDetailMember] = useState(null)
  const [memberSubs, setMemberSubs] = useState([])
  const [plans, setPlans] = useState([])
  const [subAction, setSubAction] = useState(null)
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setForm(initialForm); setEditId(null); setShowForm(true)
    }
  }, [])

  const visibleMembers = members
  const totalPages = useMemo(() => Math.ceil(totalCount / PAGE_SIZE), [totalCount])

  const load = useCallback(async () => {
    setLoading(true)
    const skip = (page - 1) * PAGE_SIZE
    const res = await getMembers({
      skip,
      limit: PAGE_SIZE,
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    })
    setMembers(res.data.items)
    setTotalCount(res.data.total_count)
    setLoading(false)
  }, [page, search, statusFilter])

  useEffect(() => { load() }, [load])

  const handleSearch = (val) => { setSearch(val); setPage(1) }
  const handleStatusFilter = (val) => { setStatusFilter(val); setPage(1) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form, birth_date: form.birth_date || null }
    try {
      if (editId) { await updateMember(editId, data); toast(t('members.updated'), 'success') }
      else { await createMember(data); toast(t('members.created'), 'success') }
      setShowForm(false); setEditId(null); setForm(initialForm); load()
    } catch { toast(t('members.saveError'), 'error') }
  }

  const openNew = () => { setForm(initialForm); setEditId(null); setShowForm(true) }

  const handleEdit = (m) => {
    setForm({
      name: m.name, phone: m.phone, email: m.email,
      gender: m.gender || '', birth_date: m.birth_date || '', address: m.address || '',
      emergency_contact: m.emergency_contact || '', emergency_phone: m.emergency_phone || '', status: m.status,
      notes: m.notes || '',
    })
    setEditId(m.id); setShowForm(true)
  }

  const openDetails = async (m) => {
    setDetailMember(m)
    const [res, planRes] = await Promise.all([getMemberSubscriptions(m.id), getPlans()])
    setMemberSubs(res.data.items || [])
    setPlans(planRes.data.items || [])
    setSubAction(null)
  }

  const latestEndDate = useMemo(() => {
    if (!memberSubs.length) return null
    return memberSubs.reduce((latest, sub) => !latest || sub.end_date > latest ? sub.end_date : latest, null)
  }, [memberSubs])

  const actionStartDate = useMemo(() => {
    if (!subAction) return null
    if (subAction.type === 'change') return today()
    if (!latestEndDate || latestEndDate < today()) return today()
    const d = new Date(latestEndDate)
    d.setDate(d.getDate() + 1)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }, [subAction, latestEndDate])

  const selectedActionPlan = useMemo(() => plans.find((plan) => String(plan.id) === String(subAction?.plan_id)), [plans, subAction])
  const actionEndDate = useMemo(() => actionStartDate && selectedActionPlan ? addMonths(actionStartDate, selectedActionPlan.duration_months) : null, [actionStartDate, selectedActionPlan])

  const openSubscriptionAction = (type) => {
    const last = memberSubs[0]
    const defaultPlan = last?.plan_id || plans[0]?.id || ''
    const plan = plans.find((item) => String(item.id) === String(defaultPlan))
    setSubAction({
      ...initialSubAction,
      type,
      plan_id: defaultPlan,
      amount_paid: plan?.price || 0,
      session_count: plan?.session_count || '',
      training_days: last?.training_days || 'all',
    })
  }

  const handleActionPlanChange = (planId) => {
    const plan = plans.find((item) => String(item.id) === String(planId))
    setSubAction({
      ...subAction,
      plan_id: planId,
      amount_paid: plan?.price || 0,
      session_count: plan?.session_count || '',
    })
  }

  const submitSubscriptionAction = async (e) => {
    e.preventDefault()
    if (!detailMember || !subAction) return
    const payload = {
      member_id: detailMember.id,
      plan_id: Number(subAction.plan_id),
      amount_paid: Number(subAction.amount_paid || 0),
      session_count: subAction.session_count ? Number(subAction.session_count) : null,
      payment_status: subAction.payment_status,
      payment_method: subAction.payment_method,
      payment_account: subAction.payment_account,
      training_days: subAction.training_days,
      notes: subAction.notes,
    }
    try {
      if (subAction.type === 'change') await changeSubscriptionPlan(payload)
      else await renewSubscription(payload)
      toast(t('subscriptions.actionSaved'), 'success')
      const res = await getMemberSubscriptions(detailMember.id)
      setMemberSubs(res.data.items || [])
      setSubAction(null)
      load()
    } catch {
      toast(t('subscriptions.actionError'), 'error')
    }
  }

  const handleDelete = async (id) => {
    if (await showConfirm(t('members.deleteConfirm'), '', t('common.delete'), t('common.cancel'))) {
      try { await deleteMember(id); toast(t('members.deleted'), 'success'); load() }
      catch { toast(t('members.deleteError'), 'error') }
    }
  }

  const handleExport = async () => {
    const res = await getMembers({ limit: 10000 })
    const all = res.data.items
    if (all.length === 0) { toast(t('common.noData'), 'info'); return }
    exportCSV(all, 'members', [
      { label: 'ID', accessor: m => m.id },
      { label: 'Name', accessor: m => m.name },
      { label: 'Phone', accessor: m => m.phone },
      { label: 'Email', accessor: m => m.email },
      { label: 'Gender', accessor: m => genderLabel(m.gender, 'en') },
      { label: 'Birth Date', accessor: m => m.birth_date || '' },
      { label: 'Address', accessor: m => m.address },
      { label: 'Emergency Contact', accessor: m => m.emergency_contact },
      { label: 'Emergency Phone', accessor: m => m.emergency_phone },
      { label: 'Status', accessor: m => memberStatusLabel(m.status, 'en') },
    ])
    toast(t('members.exported'), 'success')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.csv'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const text = await file.text(); const rows = parseCSV(text)
      if (rows.length === 0) { toast(t('common.invalidCsv'), 'error'); return }
      const result = await Swal.fire({
        title: locale === 'ar' ? `استيراد ${rows.length} عضو؟` : `Import ${rows.length} members?`,
        html: `<div style="font-size:13px;color:#6b6b80">${locale === 'ar' ? 'أول صف' : 'First row'}: ${rows[0].Name || rows[0].name || '—'}</div>`,
        icon: 'question', showCancelButton: true, confirmButtonColor: '#00f5d4', cancelButtonColor: '#ff3355',
        confirmButtonText: t('common.import'), cancelButtonText: t('common.cancel'), background: '#0e0e18', color: '#e8e8f0', borderRadius: '14px',
      })
      if (!result.isConfirmed) return
      let success = 0, fail = 0
      for (const row of rows) {
        try {
          await createMember({
            name: row.Name || row.name || '', phone: row.Phone || row.phone || '',
            email: row.Email || row.email || '', gender: row.Gender || row.gender || '',
            birth_date: row['Birth Date'] || row.birth_date || null,
            address: row.Address || row.address || '',
            emergency_contact: row['Emergency Contact'] || row.emergency_contact || '',
            emergency_phone: row['Emergency Phone'] || row.emergency_phone || '',
            notes: row.Notes || row.notes || '',
            status: row.Status || row.status || 'active',
          })
          success++
        } catch { fail++ }
      }
      Swal.fire({ icon: success > 0 ? 'success' : 'error', title: locale === 'ar' ? `تم استيراد ${success}، فشل ${fail}` : `${success} imported, ${fail} failed`, background: '#0e0e18', color: '#e8e8f0', borderRadius: '14px', confirmButtonColor: '#00f5d4' })
      load()
    }
    input.click()
  }

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div>
      <div style={s.banner}>
        <div style={s.bannerContent}>
          <h1 style={s.title}>{t('members.title')}</h1>
        </div>
        <div style={s.bannerActions}>
          <button style={s.btnOutline} onClick={handleImport}>📥 {t('common.import')}</button>
          <button style={s.btnOutline} onClick={handleExport}>📤 {t('common.export')}</button>
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
          {['all', 'active', 'expired', 'frozen', 'canceled'].map((status) => (
            <button key={status} style={{ ...s.chip, ...(statusFilter === status ? s.chipActive : {}) }} onClick={() => handleStatusFilter(status)}>
              {status === 'all' ? t('common.all') : t(`members.status${status.charAt(0).toUpperCase()}${status.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      <div style={s.formSlide(showForm)}>
        <form onSubmit={handleSubmit}>
          <div style={s.formHeader}>
            <h3 style={s.formTitle}>{editId ? t('members.edit') : t('members.add')}</h3>
            <button type="button" style={s.formClose} onClick={() => setShowForm(false)}>✕</button>
          </div>
          <div style={s.formGrid}>
            <div style={s.field}>
              <label style={s.label}>{t('members.name')} *</label>
              <input style={s.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required lang="ar" dir="rtl" />
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('members.phone')} *</label>
              <input style={s.input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('members.email')}</label>
              <input style={s.input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('members.gender')}</label>
              <select style={s.input} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">{t('common.select')}</option>
                <option value="male">{t('members.male')}</option>
                <option value="female">{t('members.female')}</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('members.birthDate')}</label>
              <input style={s.input} type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('members.address')}</label>
              <input style={s.input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('members.emergencyContact')}</label>
              <input style={s.input} value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('members.emergencyPhone')}</label>
              <input style={s.input} value={form.emergency_phone} onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('common.status')}</label>
              <select style={s.input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">{t('members.statusActive')}</option>
                <option value="expired">{t('members.statusExpired')}</option>
                <option value="frozen">{t('members.statusFrozen')}</option>
                <option value="canceled">{t('members.statusCanceled')}</option>
              </select>
            </div>
            <div style={s.fieldWide}>
              <label style={s.label}>{t('common.notes')}</label>
              <textarea style={s.textarea} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <button type="submit" style={s.btnSubmit}>
            {editId ? t('common.update') : t('common.create')}
          </button>
        </form>
      </div>

      {loading ? (
        <div style={s.loadingGrid}>
          {[1,2,3,4,5,6].map(i => <div key={i} style={s.skeleton} />)}
        </div>
      ) : visibleMembers.length === 0 ? (
        <div style={s.empty}>
          <span style={s.emptyIcon}>🏋️</span>
          <p style={s.emptyText}>{t('members.empty')}</p>
        </div>
      ) : (
        <div style={s.grid}>
          {visibleMembers.map((m, i) => {
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
                  <div style={{ ...s.badge, background: status.bg, color: status.color }}>{memberStatusLabel(m.status, locale)}</div>
                </div>
                <div style={s.cardBody}>
                  <div style={s.detailRow}>
                    <span style={s.detailLabel}>📞</span>
                    <span style={s.detailValue}>{m.phone}</span>
                  </div>
                  <div style={s.detailRow}>
                    <span style={s.detailLabel}>⚤</span>
                    <span style={s.detailValue}>{genderLabel(m.gender, locale)}</span>
                  </div>
                  <div style={s.detailRow}>
                    <span style={s.detailLabel}>🎂</span>
                    <span style={s.detailValue}>{m.birth_date || '—'}</span>
                  </div>
                </div>
                <div style={s.cardFooter}>
                  <button style={s.portalBtn(true)} onClick={() => openDetails(m)}>{t('members.viewDetails')}</button>
                  <div style={s.actionGroup}>
                    <button style={s.actionBtn('#ffd60a')} onClick={() => navigate(`/members/${m.id}/progress`)}>↗ {t('progress.track')}</button>
                    <button style={s.actionBtn('#00f5d4')} onClick={() => handleEdit(m)}>✎ {t('common.edit')}</button>
                    <button style={s.actionBtn('#ff3355')} onClick={() => handleDelete(m.id)}>✕ {t('common.delete')}</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {detailMember && (
        <div style={s.modalOverlay} onClick={() => setDetailMember(null)}>
          <div style={s.detailModal} onClick={(e) => e.stopPropagation()}>
            <div style={s.formHeader}>
              <h3 style={s.formTitle}>{detailMember.name}</h3>
              <button type="button" style={s.formClose} onClick={() => setDetailMember(null)}>x</button>
            </div>
            <div style={s.detailsGrid}>
              <span>{t('common.phone')}: <b>{detailMember.phone}</b></span>
              <span>{t('common.email')}: <b>{detailMember.email}</b></span>
              <span>{t('members.birthDate')}: <b>{detailMember.birth_date || '-'}</b></span>
              <span>{t('common.status')}: <b>{memberStatusLabel(detailMember.status, locale)}</b></span>
              <span>{t('common.notes')}: <b>{detailMember.notes || '-'}</b></span>
            </div>
            <h4 style={s.subTitle}>{t('subscriptions.title')}</h4>
            <div style={s.subActions}>
              <button style={s.renewBtn} onClick={() => openSubscriptionAction('renew')}>{t('subscriptions.renew')}</button>
              <button style={s.changeBtn} onClick={() => openSubscriptionAction('change')}>{t('subscriptions.changePlan')}</button>
            </div>
            {subAction && (
              <form style={s.actionPanel} onSubmit={submitSubscriptionAction}>
                <div style={s.actionTitle}>{subAction.type === 'change' ? t('subscriptions.changePlan') : t('subscriptions.renew')}</div>
                <p style={s.actionHint}>{subAction.type === 'change' ? t('subscriptions.changeHint') : t('subscriptions.renewHint')}</p>
                <div style={s.actionGrid}>
                  <select style={s.input} value={subAction.plan_id} onChange={(e) => handleActionPlanChange(e.target.value)} required>
                    <option value="">{t('subscriptions.selectPlan')}</option>
                    {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} - {formatCurrency(plan.price)}</option>)}
                  </select>
                  <input style={s.input} type="number" step="0.01" value={subAction.amount_paid} onChange={(e) => setSubAction({ ...subAction, amount_paid: e.target.value })} placeholder={t('subscriptions.amount')} />
                  <input style={s.input} type="number" value={subAction.session_count} onChange={(e) => setSubAction({ ...subAction, session_count: e.target.value })} placeholder={t('subscriptions.sessionCount')} />
                  <select style={s.input} value={subAction.payment_status} onChange={(e) => setSubAction({ ...subAction, payment_status: e.target.value })}>
                    <option value="paid">{t('subscriptions.paid')}</option>
                    <option value="partial">{t('subscriptions.partial')}</option>
                    <option value="unpaid">{t('subscriptions.unpaid')}</option>
                  </select>
                  <select style={s.input} value={subAction.payment_method} onChange={(e) => setSubAction({ ...subAction, payment_method: e.target.value })}>
                    <option value="cash">{t('subscriptions.cash')}</option>
                    <option value="bank_palestine">{t('subscriptions.bankPalestine')}</option>
                    <option value="pal_pay">{t('subscriptions.palPay')}</option>
                    <option value="jawwal_pay">{t('subscriptions.jawwalPay')}</option>
                    <option value="mal_chat">{t('subscriptions.malChat')}</option>
                    <option value="other_banks">{t('subscriptions.otherBanks')}</option>
                  </select>
                  <input style={s.input} value={subAction.payment_account} onChange={(e) => setSubAction({ ...subAction, payment_account: e.target.value })} placeholder={t('subscriptions.paymentAccount')} />
                  <select style={s.input} value={subAction.training_days} onChange={(e) => setSubAction({ ...subAction, training_days: e.target.value })}>
                    <option value="sat_mon_wed">{t('subscriptions.satMonWed')}</option>
                    <option value="sun_tue_thu">{t('subscriptions.sunTueThu')}</option>
                    <option value="all">{t('subscriptions.allWeek')}</option>
                  </select>
                  <input style={s.input} value={subAction.notes} onChange={(e) => setSubAction({ ...subAction, notes: e.target.value })} placeholder={t('common.notes')} />
                </div>
                {actionStartDate && actionEndDate && (
                  <div style={s.previewDates}>
                    <span>{t('common.startDate')}: <b>{actionStartDate}</b></span>
                    <span>{t('common.endDate')}: <b>{actionEndDate}</b></span>
                  </div>
                )}
                <div style={s.actionButtons}>
                  <button type="button" style={s.btnOutline} onClick={() => setSubAction(null)}>{t('common.cancel')}</button>
                  <button type="submit" style={s.btnPrimary}>{t('common.save')}</button>
                </div>
              </form>
            )}
            <div style={s.tableMini}>
              {memberSubs.length === 0 ? <span style={s.emptyText}>-</span> : memberSubs.map((sub) => (
                <div key={sub.id} style={s.subRow}>
                  <span>{sub.start_date} - {sub.end_date}</span>
                  <span>{paymentStatusLabel(sub.payment_status, locale)}</span>
                  <b>{formatCurrency(sub.amount_paid)}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div style={s.pagination}>
          <button style={{ ...s.pageNav, opacity: page <= 1 ? 0.3 : 1 }} disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>◀ {t('common.prev')}</button>
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
          <button style={{ ...s.pageNav, opacity: page >= totalPages ? 0.3 : 1 }} disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>{t('common.next')} ▶</button>
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
    background: '#050509', color: '#d0d0df', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
  },
  chipActive: { background: '#00f5d4', color: '#08080e' },
  formSlide: (open) => ({
    overflow: 'hidden',
    position: open ? 'fixed' : 'static',
    inset: open ? 0 : 'auto',
    zIndex: open ? 1000 : 'auto',
    display: open ? 'grid' : 'block',
    placeItems: open ? 'center' : 'initial',
    background: open ? 'rgba(0,0,0,0.72)' : 'transparent',
    padding: open ? 24 : 0,
    boxSizing: 'border-box',
    maxHeight: open ? '100vh' : 0,
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
    background: '#050509', border: '1px solid rgba(255,255,255,0.08)',
    padding: 24, borderRadius: 14,
    maxWidth: 980,
    maxHeight: '76vh',
    overflow: 'auto',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 11, color: '#6b6b80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' },
  input: {
    padding: '12px 14px', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
    fontSize: 13, color: '#e8e8f0', width: '100%', boxSizing: 'border-box', outline: 'none',
  },
  fieldWide: { display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' },
  textarea: { padding: '12px 14px', minHeight: 88, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 13, color: '#e8e8f0', width: '100%', boxSizing: 'border-box', outline: 'none', resize: 'vertical' },
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
    background: '#050509', border: '1px solid rgba(255,255,255,0.08)',
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
  modalOverlay: { position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(0,0,0,0.72)' },
  detailModal: { width: 'min(780px, 94vw)', maxHeight: '88vh', overflow: 'auto', padding: 22, borderRadius: 10, background: '#050509', border: '1px solid rgba(255,255,255,0.10)' },
  detailsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, color: '#d8d8e4', marginBottom: 18 },
  subTitle: { color: '#fff', margin: '10px 0' },
  subActions: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  renewBtn: { padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(0,245,147,0.25)', background: 'rgba(0,245,147,0.12)', color: '#00f593', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  changeBtn: { padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(0,170,255,0.25)', background: 'rgba(0,170,255,0.12)', color: '#00aaff', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  actionPanel: { marginBottom: 14, padding: 14, borderRadius: 10, background: '#071426', border: '1px solid rgba(255,255,255,0.10)' },
  actionTitle: { color: '#fff', fontSize: 15, fontWeight: 800, marginBottom: 4 },
  actionHint: { color: '#8a8a9a', fontSize: 12, margin: '0 0 12px' },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 },
  previewDates: { display: 'flex', gap: 14, flexWrap: 'wrap', padding: '10px 0', color: '#d8d8e4', fontSize: 12 },
  actionButtons: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 },
  tableMini: { display: 'grid', gap: 8 },
  subRow: { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: '#d8d8e4' },
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
