const memberStatus = {
  active: { ar: 'نشط', en: 'Active' },
  expired: { ar: 'منتهي', en: 'Expired' },
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

const trainingDays = {
  sat_mon_wed: { ar: 'سبت / اثنين / أربعاء', en: 'Sat / Mon / Wed' },
  sun_tue_thu: { ar: 'أحد / ثلاثاء / خميس', en: 'Sun / Tue / Thu' },
  all: { ar: 'كل أيام الأسبوع', en: 'All week' },
}

const labelFrom = (map, value, locale = 'ar') => {
  if (value === null || value === undefined || value === '') return '—'
  return map[value]?.[locale] || map[value]?.ar || String(value)
}

export const memberStatusLabel = (value, locale) => labelFrom(memberStatus, value, locale)
export const genderLabel = (value, locale) => labelFrom(gender, value, locale)
export const paymentStatusLabel = (value, locale) => labelFrom(paymentStatus, value, locale)
export const trainingDaysLabel = (value, locale) => labelFrom(trainingDays, value, locale)
