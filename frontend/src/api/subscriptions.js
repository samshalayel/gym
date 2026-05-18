import api from './axios'

export const getSubscriptions = (params) => api.get('/subscriptions', { params })
export const getSubscription = (id) => api.get(`/subscriptions/${id}`)
export const getMemberSubscriptions = (memberId) => api.get(`/subscriptions/by-member/${memberId}`)
export const createSubscription = (data) => api.post('/subscriptions', data)
export const updateSubscription = (id, data) => api.put(`/subscriptions/${id}`, data)
export const deleteSubscription = (id) => api.delete(`/subscriptions/${id}`)
