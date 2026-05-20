import api from './axios'

export const getSubscriptions = (params) => api.get('/subscriptions', { params })
export const getSubscription = (id) => api.get(`/subscriptions/${id}`)
export const getMemberSubscriptions = (memberId) => api.get(`/subscriptions/by-member/${memberId}`)
export const createSubscription = (data) => api.post('/subscriptions', data)
export const renewSubscription = (data) => api.post('/subscriptions/renew', data)
export const changeSubscriptionPlan = (data) => api.post('/subscriptions/change-plan', data)
export const updateSubscription = (id, data) => api.put(`/subscriptions/${id}`, data)
export const deleteSubscription = (id) => api.delete(`/subscriptions/${id}`)
export const getRevenueReport = (params) => api.get('/subscriptions/revenue-report', { params })
export const getPendingPayments = (params) => api.get('/subscriptions/pending-payments', { params })
export const collectPayment = (id, data) => api.post(`/subscriptions/${id}/collect-payment`, data)
