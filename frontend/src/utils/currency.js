export const formatCurrency = (value) => {
  const amount = Number(value || 0)
  return `₪${amount.toFixed(2)}`
}
