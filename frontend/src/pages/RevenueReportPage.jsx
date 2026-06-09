import React, { useState, useEffect, useCallback } from 'react'
import { getRevenueReport, getPendingPayments, getOverpayments, collectPayment, getExportDetails } from '../api/subscriptions'
import { useI18n } from '../context/I18nContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency } from '../utils/currency'
import { exportToExcel } from '../utils/exportExcel'
import { DownloadIcon } from 'lucide-react'

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const firstOfMonth = () => today().slice(0, 8) + '01'

const methodLabel = (m, locale) => {
  const ar = { cash: 'كاش', bank_palestine: 'بنك فلسطين', pal_pay: 'محفظة بال باي', jawwal_pay: 'محفظة جوال', mal_chat: 'محفظة مال شات', other_banks: 'بنوك أخرى', unknown: 'غير محدد' }
  const en = { cash: 'Cash', bank_palestine: 'Bank of Palestine', pal_pay: 'PalPay', jawwal_pay: 'Jawwal', mal_chat: 'Mal Chat', other_banks: 'Other Banks', unknown: 'Unknown' }
  return (locale === 'ar' ? ar : en)[m] || m
}
const statusColor = { paid: '#00f593', partial: '#ffd60a', unpaid: '#ff3355' }
const statusBg    = { paid: 'rgba(0,245,147,0.10)', partial: 'rgba(255,214,10,0.10)', unpaid: 'rgba(255,51,85,0.10)' }

export default function RevenueReportPage() {
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const [tab, setTab] = useState('report')

  // ── Report state ──────────────────────────────────────────
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [startDate, setStartDate] = useState(firstOfMonth())
  const [endDate, setEndDate]     = useState(today())

  // ── Pending state ─────────────────────────────────────────
  const [pending, setPending]         = useState([])
  const [overpayments, setOverpayments] = useState([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [search, setSearch]           = useState('')

  // ── Collect modal state ───────────────────────────────────
  const [collectItem, setCollectItem] = useState(null)
  const [collectForm, setCollectForm] = useState({ payment_date: today(), amount: '', payment_method: 'cash', payment_account: '', notes: '' })
  const [collectLoading, setCollectLoading] = useState(false)

  // ── Loaders ───────────────────────────────────────────────
  const loadReport = useCallback(async () => {
    setReportLoading(true)
    try {
      const res = await getRevenueReport({ start_date: startDate || undefined, end_date: endDate || undefined })
      setReport(res.data)
    } finally {
      setReportLoading(false)
    }
  }, [startDate, endDate])

  const loadPending = useCallback(async () => {
    setPendingLoading(true)
    try {
      const res = await getPendingPayments({ search: search || undefined })
      setPending(res.data.items || [])
    } finally {
      setPendingLoading(false)
    }
  }, [search])

  useEffect(() => { loadReport() }, [loadReport])
  useEffect(() => { loadPending() }, [loadPending])
  useEffect(() => {
    getOverpayments().then((res) => setOverpayments(res.data.items || [])).catch(() => setOverpayments([]))
  }, [])

  // ── Collect payment ───────────────────────────────────────
  const openCollect = (item) => {
    if (item.remaining_amount <= 0) return
    setCollectItem(item)
    setCollectForm({ payment_date: today(), amount: item.remaining_amount.toFixed(2), payment_method: item.payment_method || 'cash', payment_account: '', notes: '' })
  }

  const submitCollect = async (e) => {
    e.preventDefault()
    if (!collectItem) return
    setCollectLoading(true)
    try {
      await collectPayment(collectItem.id, {
        amount: parseFloat(collectForm.amount),
        payment_date: collectForm.payment_date,
        payment_method: collectForm.payment_method,
        payment_account: collectForm.payment_account || null,
        notes: collectForm.notes || null,
      })
      toast(t('revenue.collectSuccess'), 'success')
      setCollectItem(null)
      loadPending()
      loadReport()
    } catch {
      toast(t('revenue.collectError'), 'error')
    } finally {
      setCollectLoading(false)
    }
  }

  // ── Excel export ─────────────────────────────────────────
  const [exporting, setExporting] = useState(false)
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await getExportDetails({ start_date: startDate || undefined, end_date: endDate || undefined })
      const isAr = locale === 'ar'
      const methodMap = { cash: 'كاش', bank_palestine: 'بنك فلسطين', pal_pay: 'بال باي', jawwal_pay: 'جوال', mal_chat: 'مال شات', other_banks: 'بنوك أخرى' }
      const statusMap = { paid: 'مدفوع', partial: 'جزئي', unpaid: 'غير مدفوع' }
      const data = res.data.items.map(r => ({
        ...r,
        payment_method: methodMap[r.payment_method] || r.payment_method,
        payment_status: statusMap[r.payment_status] || r.payment_status,
      }))
      exportToExcel({
        data,
        headers: ['payment_date','member_name','member_phone','plan_name','start_date','end_date','amount_paid','discount','expected','remaining','payment_status','payment_method','renewal_status','notes'],
        labels:  isAr
          ? ['تاريخ الدفع','اسم العضو','الهاتف','الباقة','تاريخ البداية','تاريخ النهاية','المدفوع','الخصم','المطلوب','المتبقي','حالة الدفع','طريقة الدفع','حالة التجديد','ملاحظات']
          : ['Payment date','Member','Phone','Plan','Start','End','Paid','Discount','Expected','Remaining','Status','Method','Renewal','Notes'],
        filename: `revenue-${startDate || 'all'}-${endDate || 'all'}`,
        sheet: isAr ? 'الإيرادات' : 'Revenue',
      })
      toast(isAr ? 'تم التصدير بنجاح' : 'Exported successfully', 'success')
    } catch {
      toast(locale === 'ar' ? 'تعذر التصدير' : 'Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  const maxRevenue = report?.by_month?.length
    ? Math.max(...report.by_month.map(m => m.revenue), 1)
    : 1

  return (
    <div style={s.page}>

      {/* ── Tabs ── */}
      <div style={s.tabs}>
        {['report', 'pending'].map((tabKey) => (
          <button key={tabKey} style={{ ...s.tab, ...(tab === tabKey ? s.tabActive : {}) }}
            onClick={() => setTab(tabKey)}>
            {tabKey === 'report' ? t('revenue.reportTab') : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {t('revenue.pendingTab')}
                {pending.length > 0 && <span style={s.badge}>{pending.length}</span>}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════ REPORT TAB ═══════════════════════════ */}
      {tab === 'report' && (
        <>
          {/* Date filter + Export */}
          <div style={s.filterRow}>
            <span style={s.filterLabel}>{t('revenue.filterDates')}</span>
            <input style={s.dateInput} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span style={{ color: '#5a5a6a' }}>—</span>
            <input style={s.dateInput} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            <button style={s.exportBtn} onClick={handleExport} disabled={exporting}>
              <DownloadIcon size={15} />
              {exporting ? '...' : (locale === 'ar' ? 'تصدير Excel' : 'Export Excel')}
            </button>
          </div>

          {reportLoading ? <div style={s.loading}><div style={s.spinner} /></div> : report && (
            <>
              {overpayments.length > 0 && (
                <section style={s.warningBox}>
                  <div style={s.warningHead}>
                    <strong>{locale === 'ar' ? 'دفعات زائدة تحتاج مراجعة' : 'Overpayments need review'}</strong>
                    <span>{overpayments.length}</span>
                  </div>
                  <div style={s.warningList}>
                    {overpayments.slice(0, 4).map((item) => (
                      <div key={item.id} style={s.warningRow}>
                        <span>{item.member_name} - {item.plan_name}</span>
                        <b>{formatCurrency(item.overpaid_amount)}</b>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Stat cards */}
              <div style={s.statsGrid}>
                {[
                  { label: t('revenue.totalRevenue'),   value: formatCurrency(report.total_revenue),   accent: '#00f5d4', icon: '💰' },
                  { label: t('revenue.totalExpected'),  value: formatCurrency(report.total_expected),  accent: '#a277ff', icon: '📋' },
                  { label: t('revenue.totalRemaining'), value: formatCurrency(report.total_remaining), accent: '#ff3355', icon: '⏳' },
                  { label: t('revenue.paidCount'),      value: report.paid_count,                      accent: '#00f593', icon: '✅' },
                  { label: t('revenue.partialCount'),   value: report.partial_count,                   accent: '#ffd60a', icon: '◑' },
                  { label: t('revenue.unpaidCount'),    value: report.unpaid_count,                    accent: '#ff3355', icon: '❌' },
                ].map((card) => (
                  <div key={card.label} style={s.statCard}>
                    <div style={s.statTop}>
                      <span style={s.statIcon}>{card.icon}</span>
                      <span style={{ ...s.statLabel, color: '#6b6b80' }}>{card.label}</span>
                    </div>
                    <div style={{ ...s.statValue, color: card.accent }}>{card.value}</div>
                    <div style={{ ...s.statBar, background: card.accent }} />
                  </div>
                ))}
              </div>

              <div style={s.breakdowns}>
                {/* By Month */}
                <div style={s.section}>
                  <h3 style={s.sectionTitle}>{t('revenue.byMonth')}</h3>
                  {report.by_month.length === 0
                    ? <p style={s.empty}>—</p>
                    : report.by_month.map((row) => (
                      <div key={row.month} style={s.barRow}>
                        <span style={s.barLabel}>{row.month}</span>
                        <div style={s.barTrack}>
                          <div style={{ ...s.barFill, width: `${(row.revenue / maxRevenue) * 100}%`, background: '#00f5d4' }} />
                        </div>
                        <span style={s.barValue}>{formatCurrency(row.revenue)}</span>
                        <span style={s.barCount}>{row.count}</span>
                      </div>
                    ))
                  }
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* By Plan */}
                  <div style={s.section}>
                    <h3 style={s.sectionTitle}>{t('revenue.byPlan')}</h3>
                    {report.by_plan.length === 0
                      ? <p style={s.empty}>—</p>
                      : report.by_plan.map((row) => (
                        <div key={row.plan} style={s.tableRow}>
                          <span style={s.tableCell}>{row.plan}</span>
                          <span style={{ ...s.tableCell, color: '#00f5d4', fontWeight: 700 }}>{formatCurrency(row.revenue)}</span>
                          <span style={{ ...s.tableCell, color: '#5a5a6a' }}>{row.count}</span>
                        </div>
                      ))
                    }
                  </div>

                  {/* By Method */}
                  <div style={s.section}>
                    <h3 style={s.sectionTitle}>{t('revenue.byMethod')}</h3>
                    {report.by_method.length === 0
                      ? <p style={s.empty}>—</p>
                      : report.by_method.map((row) => (
                        <div key={row.method} style={s.tableRow}>
                          <span style={s.tableCell}>{methodLabel(row.method, locale)}</span>
                          <span style={{ ...s.tableCell, color: '#a277ff', fontWeight: 700 }}>{formatCurrency(row.revenue)}</span>
                          <span style={{ ...s.tableCell, color: '#5a5a6a' }}>{row.count}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ════════════════════════════════ PENDING TAB ══════════════════════════ */}
      {tab === 'pending' && (
        <>
          {/* Search */}
          <div style={s.searchWrap}>
            <span style={{ color: '#5a5a6a' }}>🔍</span>
            <input style={s.searchInput} placeholder={t('revenue.search')} value={search}
              onChange={e => setSearch(e.target.value)} />
            {search && <button style={s.clearBtn} onClick={() => setSearch('')}>✕</button>}
          </div>

          {pendingLoading
            ? <div style={s.loading}><div style={s.spinner} /></div>
            : pending.length === 0
              ? <div style={s.emptyBlock}><span style={{ fontSize: 40 }}>🎉</span><p>{t('revenue.noPending')}</p></div>
              : (
                <div style={s.pendingGrid}>
                  {pending.map((item) => (
                    <div key={item.id} style={s.pendingCard}>
                      {/* Card header */}
                      <div style={s.pendingHead}>
                        <div style={s.memberAvatar}>{item.member_name?.charAt(0) || '?'}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={s.memberName}>{item.member_name}</div>
                          <div style={s.memberPhone}>{item.member_phone}</div>
                        </div>
                        <span style={{ ...s.statusChip, background: statusBg[item.payment_status], color: statusColor[item.payment_status] }}>
                          {item.payment_status === 'partial' ? t('subscriptions.partial') : t('subscriptions.unpaid')}
                        </span>
                      </div>

                      {/* Plan & dates */}
                      <div style={s.pendingMeta}>
                        <span style={s.metaItem}>📦 {item.plan_name}</span>
                        <span style={s.metaItem}>📅 {item.start_date} → {item.end_date}</span>
                      </div>

                      {/* Amounts */}
                      <div style={s.amountsRow}>
                        <div style={s.amountBox}>
                          <span style={s.amountLabel}>{t('revenue.expected')}</span>
                          <span style={{ ...s.amountValue, color: '#a277ff' }}>{formatCurrency(item.expected_amount)}</span>
                        </div>
                        <div style={s.amountBox}>
                          <span style={s.amountLabel}>{t('revenue.paid')}</span>
                          <span style={{ ...s.amountValue, color: '#00f593' }}>{formatCurrency(item.amount_paid)}</span>
                        </div>
                        <div style={s.amountBox}>
                          <span style={s.amountLabel}>{t('revenue.remaining')}</span>
                          <span style={{ ...s.amountValue, color: '#ff3355' }}>{formatCurrency(item.remaining_amount)}</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {item.expected_amount > 0 && (
                        <div style={s.progressTrack}>
                          <div style={{ ...s.progressFill, width: `${Math.min((item.amount_paid / item.expected_amount) * 100, 100)}%` }} />
                        </div>
                      )}

                      <button style={s.collectBtn} onClick={() => openCollect(item)}>
                        💳 {t('revenue.collectBtn')}
                      </button>
                    </div>
                  ))}
                </div>
              )
          }
        </>
      )}

      {/* ════════════════════════════════ COLLECT MODAL ════════════════════════ */}
      {collectItem && (
        <div style={s.overlay} onClick={() => setCollectItem(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <h3 style={s.modalTitle}>{t('revenue.collectTitle')}</h3>
              <button style={s.closeBtn} onClick={() => setCollectItem(null)}>✕</button>
            </div>

            {/* Summary */}
            <div style={s.modalSummary}>
              <div style={s.summaryRow}>
                <span style={s.summaryLabel}>{t('revenue.member')}</span>
                <span style={s.summaryValue}>{collectItem.member_name} — {collectItem.member_phone}</span>
              </div>
              <div style={s.summaryRow}>
                <span style={s.summaryLabel}>{t('revenue.plan')}</span>
                <span style={s.summaryValue}>{collectItem.plan_name}</span>
              </div>
              <div style={s.summaryRow}>
                <span style={s.summaryLabel}>{t('revenue.expected')}</span>
                <span style={{ ...s.summaryValue, color: '#a277ff' }}>{formatCurrency(collectItem.expected_amount)}</span>
              </div>
              <div style={s.summaryRow}>
                <span style={s.summaryLabel}>{t('revenue.paid')}</span>
                <span style={{ ...s.summaryValue, color: '#00f593' }}>{formatCurrency(collectItem.amount_paid)}</span>
              </div>
              <div style={{ ...s.summaryRow, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 4 }}>
                <span style={s.summaryLabel}>{t('revenue.remaining')}</span>
                <span style={{ ...s.summaryValue, color: '#ff3355', fontSize: 20, fontWeight: 800 }}>{formatCurrency(collectItem.remaining_amount)}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={submitCollect} style={s.modalForm}>
              <div style={s.formGrid}>
                <div style={s.field}>
                  <label style={s.fieldLabel}>{t('subscriptions.paymentDate')}</label>
                  <input style={s.input} type="date" value={collectForm.payment_date}
                    onChange={e => setCollectForm({ ...collectForm, payment_date: e.target.value })}
                    required />
                </div>

                <div style={s.field}>
                  <label style={s.fieldLabel}>{t('revenue.payNow')} *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...s.input, flex: 1 }} type="number" step="0.01" min="0.01"
                      max={collectItem.remaining_amount > 0 ? collectItem.remaining_amount : undefined}
                      value={collectForm.amount}
                      onChange={e => setCollectForm({ ...collectForm, amount: e.target.value })}
                      required />
                    <button type="button" style={s.fullPayBtn}
                      onClick={() => setCollectForm({ ...collectForm, amount: collectItem.remaining_amount.toFixed(2) })}>
                      {t('revenue.fullPay')}
                    </button>
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.fieldLabel}>{t('revenue.payMethod')} *</label>
                  <select style={s.input} value={collectForm.payment_method}
                    onChange={e => setCollectForm({ ...collectForm, payment_method: e.target.value })} required>
                    <option value="cash">{t('subscriptions.cash')}</option>
                    <option value="bank_palestine">{t('subscriptions.bankPalestine')}</option>
                    <option value="pal_pay">{t('subscriptions.palPay')}</option>
                    <option value="jawwal_pay">{t('subscriptions.jawwalPay')}</option>
                    <option value="mal_chat">{t('subscriptions.malChat')}</option>
                    <option value="other_banks">{t('subscriptions.otherBanks')}</option>
                  </select>
                </div>

                <div style={s.field}>
                  <label style={s.fieldLabel}>{t('revenue.payAccount')}</label>
                  <input style={s.input} value={collectForm.payment_account}
                    onChange={e => setCollectForm({ ...collectForm, payment_account: e.target.value })}
                    placeholder="—" />
                </div>

                <div style={s.field}>
                  <label style={s.fieldLabel}>{t('common.notes')}</label>
                  <input style={s.input} value={collectForm.notes}
                    onChange={e => setCollectForm({ ...collectForm, notes: e.target.value })}
                    placeholder="—" />
                </div>
              </div>

              <div style={s.modalActions}>
                <button type="button" style={s.cancelBtn} onClick={() => setCollectItem(null)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" style={s.submitBtn} disabled={collectLoading}>
                  {collectLoading ? '...' : `💳 ${t('common.save')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = {
  page: { display: 'grid', gap: 20 },

  // Tabs
  tabs: { display: 'flex', gap: 6 },
  tab: {
    padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b6b80',
    transition: 'all 0.2s',
  },
  tabActive: { background: '#00f5d4', color: '#08080e', border: '1px solid #00f5d4' },
  badge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 20, height: 20, borderRadius: 10, padding: '0 6px',
    background: '#ff3355', color: '#fff', fontSize: 11, fontWeight: 800,
  },

  // Filter
  filterRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  filterLabel: { fontSize: 12, color: '#6b6b80', fontWeight: 600 },
  dateInput: {
    padding: '9px 12px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
    fontSize: 13, color: '#e8e8f0', outline: 'none',
  },

  // Loading
  loading: { display: 'flex', justifyContent: 'center', padding: 60 },
  spinner: {
    width: 28, height: 28, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.04)', borderTopColor: '#00f5d4',
    animation: 'spin 0.8s linear infinite',
  },

  // Stat cards
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 },
  statCard: {
    position: 'relative', padding: '20px 20px 16px', borderRadius: 14, overflow: 'hidden',
    background: 'rgba(14,14,24,0.8)', border: '1px solid rgba(255,255,255,0.06)',
    animation: 'fadeUp 0.4s ease both',
  },
  statTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  statIcon: { fontSize: 20 },
  statLabel: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px' },
  statValue: { fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '1px', lineHeight: 1 },
  statBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, opacity: 0.5 },

  // Breakdowns
  breakdowns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  section: {
    padding: 20, borderRadius: 14, background: 'rgba(14,14,24,0.8)',
    border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 12,
  },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#e8e8f0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.8px' },
  empty: { color: '#5a5a6a', fontSize: 13 },
  warningBox: { display: 'grid', gap: 10, padding: 14, borderRadius: 12, background: 'rgba(255,214,10,0.10)', border: '1px solid rgba(255,214,10,0.22)' },
  warningHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ffd60a', fontSize: 13 },
  warningList: { display: 'grid', gap: 6 },
  warningRow: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', color: '#e8e8f0', fontSize: 12 },

  barRow: { display: 'grid', gridTemplateColumns: '80px 1fr 90px 36px', alignItems: 'center', gap: 10 },
  barLabel: { fontSize: 12, color: '#8a8a9a', fontWeight: 600 },
  barTrack: { height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.6s ease' },
  barValue: { fontSize: 13, color: '#e8e8f0', fontWeight: 700, textAlign: 'end' },
  barCount: { fontSize: 11, color: '#5a5a6a', textAlign: 'center' },

  tableRow: { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  tableCell: { fontSize: 13, color: '#d0d0df' },

  // Search
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(14,14,24,0.7)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, padding: '4px 16px',
  },
  searchInput: { flex: 1, padding: '13px 0', background: 'none', border: 'none', fontSize: 14, color: '#e8e8f0', outline: 'none' },
  clearBtn: {
    background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
    width: 24, height: 24, cursor: 'pointer', color: '#6b6b80', fontSize: 11,
  },

  emptyBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 60, color: '#6b6b80', fontSize: 15 },

  // Pending cards
  pendingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 },
  pendingCard: {
    padding: 20, borderRadius: 16, background: '#050509',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', flexDirection: 'column', gap: 14,
    animation: 'fadeUp 0.35s ease both',
  },
  pendingHead: { display: 'flex', alignItems: 'center', gap: 12 },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    background: 'linear-gradient(135deg, rgba(162,119,255,0.3), rgba(0,245,212,0.15))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, fontWeight: 800, color: '#a277ff',
  },
  memberName: { fontSize: 15, fontWeight: 700, color: '#e8e8f0' },
  memberPhone: { fontSize: 12, color: '#5a5a6a', marginTop: 2 },
  statusChip: { padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 },

  pendingMeta: { display: 'flex', flexDirection: 'column', gap: 4 },
  metaItem: { fontSize: 12, color: '#8a8a9a' },

  amountsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  amountBox: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', padding: '10px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' },
  amountLabel: { fontSize: 10, color: '#6b6b80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' },
  amountValue: { fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-heading)' },

  progressTrack: { height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #00f593, #00f5d4)', borderRadius: 2, transition: 'width 0.5s ease' },

  collectBtn: {
    padding: '11px 0', borderRadius: 10, border: '1px solid rgba(0,245,212,0.25)',
    background: 'rgba(0,245,212,0.08)', color: '#00f5d4',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%',
    transition: 'all 0.2s',
  },

  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: 24 },
  modal: {
    width: 'min(560px, 94vw)', maxHeight: '90vh', overflow: 'auto',
    background: '#08080e', border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 16, padding: 24,
  },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '1px' },
  closeBtn: { width: 32, height: 32, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, background: 'transparent', color: '#6b6b80', cursor: 'pointer', fontSize: 13 },

  modalSummary: { background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6b6b80', fontWeight: 600 },
  summaryValue: { fontSize: 14, fontWeight: 700, color: '#e8e8f0' },

  modalForm: { display: 'flex', flexDirection: 'column', gap: 16 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontSize: 11, color: '#6b6b80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px' },
  input: {
    padding: '11px 13px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
    fontSize: 13, color: '#e8e8f0', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  fullPayBtn: {
    padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(0,245,212,0.25)',
    background: 'rgba(0,245,212,0.08)', color: '#00f5d4',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
  },

  modalActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  cancelBtn: { padding: '11px 22px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b6b80', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  submitBtn: { padding: '11px 28px', borderRadius: 10, border: 'none', background: '#00f5d4', color: '#08080e', cursor: 'pointer', fontSize: 13, fontWeight: 800 },
}
