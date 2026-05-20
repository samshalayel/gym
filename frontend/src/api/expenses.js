import api from './axios'

export const getExpenses = (params) => api.get('/expenses', { params })
export const getExpenseReport = (params) => api.get('/expenses/report', { params })
export const createExpense = (data) => api.post('/expenses', data)
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data)
export const deleteExpense = (id) => api.delete(`/expenses/${id}`)
