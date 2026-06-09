const memberStatus = {
  active: { ar: 'نشط', en: 'Active' },
  expired: { ar: 'منتهي', en: 'Expired' },
  debtor: { ar: 'مديون', en: 'Debtor' },
  frozen: { ar: 'مجمّد', en: 'Frozen' },
  canceled: { ar: 'ملغي', en: 'Canceled' },
}

const gender = {
  male: { ar: 'ذكر', en: 'Male' },
  female: { ar: 'أنثى', en: 'Female' },
}

const paymentStatus = {
  paid: { ar: 'مدفوع', en: 'Paid' },
  unpaid: { ar: 'غير مدفوع', en: 'Unpaid' },
  partial: { ar: 'مدفوع جزئياً', en: 'Partial' },
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
}

const paymentMethod = {
  cash: { ar: 'كاش', en: 'Cash' },
  bank: { ar: 'بنك', en: 'Bank' },
  bank_palestine: { ar: 'بنك فلسطين', en: 'Bank of Palestine' },
  pal_pay: { ar: 'محفظة بال باي', en: 'PalPay Wallet' },
  jawwal_pay: { ar: 'محفظة جوال', en: 'Jawwal Pay' },
  mal_chat: { ar: 'محفظة مال شات', en: 'Mal Chat' },
  other_banks: { ar: 'بنوك أخرى', en: 'Other Banks' },
  unknown: { ar: 'غير محدد', en: 'Unknown' },
}

const trainingDays = {
  sat_mon_wed: { ar: 'سبت / اثنين / أربعاء', en: 'Sat / Mon / Wed' },
  sun_tue_thu: { ar: 'أحد / ثلاثاء / خميس', en: 'Sun / Tue / Thu' },
  all: { ar: 'كل أيام الأسبوع', en: 'All week' },
}

const dayCodeLabel = {
  sat: { ar: 'سبت', en: 'Sat' },
  sun: { ar: 'أحد', en: 'Sun' },
  mon: { ar: 'اثنين', en: 'Mon' },
  tue: { ar: 'ثلاثاء', en: 'Tue' },
  wed: { ar: 'أربعاء', en: 'Wed' },
  thu: { ar: 'خميس', en: 'Thu' },
  fri: { ar: 'جمعة', en: 'Fri' },
}

const labelFrom = (map, value, locale = 'ar') => {
  if (value === null || value === undefined || value === '') return '—'
  return map[value]?.[locale] || map[value]?.ar || String(value)
}

export const memberStatusLabel = (value, locale) => labelFrom(memberStatus, value, locale)
export const genderLabel = (value, locale) => labelFrom(gender, value, locale)
export const paymentStatusLabel = (value, locale) => labelFrom(paymentStatus, value, locale)
export const paymentMethodLabel = (value, locale) => labelFrom(paymentMethod, value || 'unknown', locale)
export const trainingDaysLabel = (value, locale = 'ar') => {
  if (!value) return '—'
  if (trainingDays[value]) return trainingDays[value][locale] || trainingDays[value].ar
  // comma-separated custom days e.g. "sat,mon,wed"
  const parts = value.split(',').map(d => d.trim()).filter(Boolean)
  const labels = parts.map(d => dayCodeLabel[d]?.[locale] || dayCodeLabel[d]?.ar || d)
  return labels.join(' / ')
}
